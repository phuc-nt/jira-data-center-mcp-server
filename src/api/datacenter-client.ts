/**
 * Unified Data Center API Client
 * Integrates all DC adaptations: endpoint mapping, version negotiation, content conversion, and user resolution
 */

import type { JiraDataCenterConfig } from '../config/datacenter-config.js';
import type { PATAuthenticator } from '../auth/pat-authenticator.js';
import type { User, UserSearchOptions, UserResolutionResult } from './user-resolver.js';
import type { ADFDocument, ConversionResult, FormatDetectionResult } from './content-converter.js';
import type { APIVersion, VersionDetectionResult } from './version-manager.js';

import { APIVersionManager } from './version-manager.js';
import { ContentFormatConverter } from './content-converter.js';
import { UserResolver } from './user-resolver.js';
import { APIErrorHandler, ErrorHandlerConfig } from './error-handler.js';
import { logger } from '../utils/logger.js';

/**
 * API request options
 */
export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  pathParams?: Record<string, string>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  convertContent?: boolean; // Auto-convert ADF to Wiki Markup
  resolveUsers?: boolean;   // Auto-resolve user identifiers
}

/**
 * API response with metadata
 */
export interface APIResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  endpoint: string;
  mappingUsed: boolean;
  conversionApplied?: boolean;
  userResolutionApplied?: boolean;
  warnings: string[];
  responseTime: number;
}

/**
 * Issue creation/update data
 */
export interface IssueData {
  fields: Record<string, unknown>;
  update?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

/**
 * Comment data
 */
export interface CommentData {
  body: string | ADFDocument;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: Record<string, unknown>;
}

/**
 * Search parameters
 */
export interface SearchParams {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  validateQuery?: boolean;
}

/**
 * Unified Data Center API Client
 * Provides high-level API methods with automatic DC adaptations
 */
export class DataCenterAPIClient {
  private readonly logger = logger.child('DCAPIClient');
  private readonly versionManager: APIVersionManager;
  private readonly contentConverter: ContentFormatConverter;
  private readonly userResolver: UserResolver;
  private readonly errorHandler: APIErrorHandler;

  constructor(
    private config: JiraDataCenterConfig,
    private authenticator: PATAuthenticator,
    errorHandlerConfig?: Partial<ErrorHandlerConfig>
  ) {
    this.versionManager = new APIVersionManager(config, authenticator);
    this.contentConverter = new ContentFormatConverter();
    this.userResolver = new UserResolver(config, authenticator);
    this.errorHandler = new APIErrorHandler(
      APIErrorHandler.createDefaultConfig({
        timeout: config.timeout,
        ...errorHandlerConfig
      })
    );

    this.logger.info('DataCenterAPIClient initialized', {
      baseUrl: config.baseUrl,
      apiVersion: config.apiVersion,
      errorHandlingEnabled: true
    });
  }

  /**
   * Initialize client - detect API version and capabilities
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing DC API Client');
    
    try {
      const versionDetection = await this.versionManager.detectSupportedVersion();
      this.logger.info('API version detected', {
        version: versionDetection.detectedVersion,
        confidence: versionDetection.confidence
      });
    } catch (error) {
      this.logger.warn('Version detection failed, using configured version', {
        configuredVersion: this.config.apiVersion,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Make API request with automatic DC adaptations
   */
  async request<T = unknown>(
    dcEndpoint: string,
    options: APIRequestOptions = {}
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const opts = {
      method: 'GET' as const,
      timeout: this.config.timeout,
      retries: 0,
      convertContent: true,
      resolveUsers: false,
      ...options
    };

    this.logger.debug('Making DC API request', {
      dcEndpoint,
      method: opts.method,
      hasBody: !!opts.body
    });

    // Validate DC endpoint format
    this.validateDCEndpoint(dcEndpoint);

    const warnings: string[] = [];
    
    // Prepare request body with content conversion
    let processedBody = opts.body;
    let conversionApplied = false;

    if (opts.body && opts.convertContent) {
      const conversionResult = await this.processRequestBody(opts.body);
      if (conversionResult.applied) {
        processedBody = conversionResult.body;
        conversionApplied = true;
        warnings.push(...conversionResult.warnings);
      }
    }

    // Apply user resolution if requested
    let userResolutionApplied = false;
    if (opts.resolveUsers && processedBody) {
      const userResult = await this.processUserReferences(processedBody);
      if (userResult.applied) {
        processedBody = userResult.body;
        userResolutionApplied = true;
        warnings.push(...userResult.warnings);
      }
    }

    // Execute request with error handling and retry logic
    const requestId = this.generateRequestId();
    const response = await this.errorHandler.executeWithRetry(
      () => this.executeRequest<T>(
        dcEndpoint,
        {
          ...opts,
          body: processedBody,
          queryParams: opts.queryParams || {}
        }
      ),
      dcEndpoint,
      requestId
    );

    const responseTime = Date.now() - startTime;

    // Process response data
    const processedResponse = await this.processResponse(response, opts);

    return {
      data: processedResponse.data as T,
      status: response.status,
      headers: this.extractHeaders(response),
      endpoint: dcEndpoint,
      mappingUsed: false,
      conversionApplied,
      userResolutionApplied,
      warnings,
      responseTime
    };
  }

  /**
   * Validate that endpoint follows DC API format
   */
  private validateDCEndpoint(endpoint: string): void {
    const validPrefixes = [
      '/rest/api/2/',
      '/rest/api/latest/',
      '/rest/agile/1.0/'
    ];
    
    if (!validPrefixes.some(prefix => endpoint.startsWith(prefix))) {
      throw new Error(
        `Invalid DC API endpoint: ${endpoint}. ` +
        `Expected format: ${validPrefixes.join(', ')}`
      );
    }
  }

  /**
   * Execute HTTP request to DC instance
   */
  private async executeRequest<T = any>(
    endpoint: string,
    options: APIRequestOptions
  ): Promise<Response> {
    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const contextPath = this.config.contextPath || '';
    
    // Build URL with query parameters
    let url = `${baseUrl}${contextPath}${endpoint}`;
    if (options.queryParams) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.queryParams)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    // Prepare headers
    const authHeaders = this.authenticator.getAuthHeaders();
    const headers: Record<string, string> = {
      'Authorization': authHeaders['Authorization'],
      'Accept': authHeaders['Accept'],
      'User-Agent': authHeaders['User-Agent'],
      ...options.headers
    };

    // Add Content-Type for requests with body
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Prepare request body
    const body = options.body ? JSON.stringify(options.body) : undefined;

    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DC API request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Process request body for content conversion and user resolution
   */
  private async processRequestBody(body: unknown): Promise<{
    body: unknown;
    applied: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let processedBody = body;
    let applied = false;

    if (typeof body === 'object' && body !== null) {
      processedBody = await this.convertContentInObject(body as Record<string, unknown>);
      applied = processedBody !== body;
      if (applied) {
        warnings.push('Content converted from ADF to Wiki Markup');
      }
    }

    return { body: processedBody, applied, warnings };
  }

  /**
   * Recursively convert ADF content in object to Wiki Markup
   */
  private async convertContentInObject(obj: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = { ...obj };

    for (const [key, value] of Object.entries(result)) {
      if (key === 'body' && this.isADFContent(value)) {
        // Convert ADF to Wiki Markup
        const conversionResult = this.contentConverter.adfToWikiMarkup(value as ADFDocument);
        result[key] = conversionResult.content;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = await this.convertContentInObject(value as Record<string, unknown>);
      }
    }

    return result;
  }

  /**
   * Check if value is ADF content
   */
  private isADFContent(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      (value as { type: string }).type === 'doc'
    );
  }

  /**
   * Process user references in request body
   */
  private async processUserReferences(body: unknown): Promise<{
    body: unknown;
    applied: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    // For now, return as-is. Could be extended to auto-resolve user identifiers
    return { body, applied: false, warnings };
  }

  /**
   * Process API response
   */
  private async processResponse<T>(response: Response, _options: APIRequestOptions): Promise<{ data: T }> {
    let data: T;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json() as T;
    } else {
      data = (await response.text()) as T;
    }

    return { data };
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  // ========== HIGH-LEVEL API METHODS ==========

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<APIResponse<User>> {
    return this.request<User>('/rest/api/2/myself');
  }

  /**
   * Search for issues using JQL
   */
  async searchIssues(params: SearchParams): Promise<APIResponse<{
    issues: unknown[];
    total: number;
    startAt: number;
    maxResults: number;
  }>> {
    return this.request('/rest/api/2/search', {
      method: 'POST',
      body: params
    });
  }

  /**
   * Get issue by key
   */
  async getIssue(
    issueKey: string,
    fields?: string[],
    expand?: string[]
  ): Promise<APIResponse<unknown>> {
    const queryParams: Record<string, unknown> = {};
    if (fields) queryParams.fields = fields.join(',');
    if (expand) queryParams.expand = expand.join(',');

    return this.request(`/rest/api/2/issue/${issueKey}`, {
      queryParams
    });
  }

  /**
   * Create new issue
   */
  async createIssue(issueData: IssueData): Promise<APIResponse<{ key: string; id: string }>> {
    return this.request('/rest/api/2/issue', {
      method: 'POST',
      body: issueData,
      convertContent: true,
      resolveUsers: true
    });
  }

  /**
   * Update issue
   */
  async updateIssue(issueKey: string, issueData: IssueData): Promise<APIResponse<void>> {
    return this.request(`/rest/api/2/issue/${issueKey}`, {
      method: 'PUT',
      body: issueData,
      convertContent: true,
      resolveUsers: true
    });
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey: string, comment: CommentData): Promise<APIResponse<unknown>> {
    return this.request(`/rest/api/2/issue/${issueKey}/comment`, {
      method: 'POST',
      body: comment,
      convertContent: true
    });
  }

  /**
   * Assign issue to user
   */
  async assignIssue(issueKey: string, userIdentifier: string): Promise<APIResponse<void>> {
    // Resolve user first
    const userResult = await this.userResolver.resolveUser(userIdentifier);
    if (!userResult.success || !userResult.user) {
      throw new Error(`Failed to resolve user: ${userIdentifier}`);
    }

    const assignableId = this.userResolver.getAssignableIdentifier(userResult.user);

    return this.request(`/rest/api/2/issue/${issueKey}/assignee`, {
      method: 'PUT',
      body: { accountId: assignableId }
    });
  }

  /**
   * Get issue transitions
   */
  async getIssueTransitions(issueKey: string): Promise<APIResponse<{ transitions: unknown[] }>> {
    return this.request(`/rest/api/2/issue/${issueKey}/transitions`);
  }

  /**
   * Execute issue transition
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    fields?: Record<string, unknown>,
    comment?: string
  ): Promise<APIResponse<void>> {
    const body: Record<string, unknown> = {
      transition: { id: transitionId }
    };

    if (fields) {
      body.fields = fields;
    }

    if (comment) {
      body.update = {
        comment: [{ add: { body: comment } }]
      };
    }

    return this.request(`/rest/api/2/issue/${issueKey}/transitions`, {
      method: 'POST',
      body,
      convertContent: true
    });
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<APIResponse<unknown[]>> {
    return this.request('/rest/api/2/project');
  }

  /**
   * Get project by key
   */
  async getProject(projectKey: string): Promise<APIResponse<unknown>> {
    return this.request(`/rest/api/2/project/${projectKey}`);
  }

  /**
   * Resolve user by any identifier
   */
  async resolveUser(identifier: string, options?: UserSearchOptions): Promise<UserResolutionResult> {
    return this.userResolver.resolveUser(identifier, options);
  }

  /**
   * Detect content format
   */
  detectContentFormat(content: string): FormatDetectionResult {
    return this.contentConverter.detectContentFormat(content);
  }

  /**
   * Convert ADF to Wiki Markup
   */
  convertContent(adf: ADFDocument): ConversionResult {
    return this.contentConverter.adfToWikiMarkup(adf);
  }

  /**
   * Get API version information
   */
  async getVersionInfo(): Promise<{
    current: APIVersion;
    detection: VersionDetectionResult | null;
    capabilities: unknown;
  }> {
    const current = this.versionManager.getCurrentVersion();
    const capabilities = this.versionManager.getVersionCapabilities(current);
    
    let detection: VersionDetectionResult | null = null;
    try {
      detection = await this.versionManager.detectSupportedVersion();
    } catch {
      // Version detection failed, use current
    }

    return { current, detection, capabilities };
  }

  /**
   * Validate endpoint support
   */
  validateEndpoint(dcEndpoint: string): { supported: boolean; reason?: string } {
    try {
      this.validateDCEndpoint(dcEndpoint);
      return { supported: true };
    } catch (error) {
      return { 
        supported: false, 
        reason: error instanceof Error ? error.message : 'Invalid endpoint format'
      };
    }
  }

  /**
   * Get client statistics
   */
  getClientStats(): {
    version: APIVersion;
    userCacheStats: unknown;
    supportedEndpoints: string[];
  } {
    const supportedEndpoints = [
      '/rest/api/2/', '/rest/api/latest/', '/rest/agile/1.0/'
    ];
    
    return {
      version: this.versionManager.getCurrentVersion(),
      userCacheStats: this.userResolver.getCacheStats(),
      supportedEndpoints
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.userResolver.clearCache();
    this.versionManager.clearCache();
    this.errorHandler.resetMetrics();
    this.logger.info('All caches cleared');
  }

  /**
   * Get error handling metrics
   */
  getErrorMetrics() {
    return this.errorHandler.getMetrics();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.errorHandler.getCircuitBreakerStatus();
  }

  /**
   * Reset circuit breaker (for manual intervention)
   */
  resetCircuitBreaker(): void {
    this.errorHandler.resetCircuitBreaker();
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}