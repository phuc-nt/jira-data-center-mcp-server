import { z } from 'zod';

/**
 * Jira Data Center Configuration Schema
 * PAT-only authentication with enterprise network support
 */

// Proxy configuration for corporate networks
export const ProxyConfigSchema = z.object({
  host: z.string().min(1, 'Proxy host is required'),
  port: z.number().min(1).max(65535, 'Valid port range is 1-65535'),
  protocol: z.enum(['http', 'https']).default('http'),
  auth: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
});

// Main Data Center configuration
export const JiraDataCenterConfigSchema = z.object({
  baseUrl: z
    .string()
    .url('Base URL must be a valid URL')
    .refine(
      url => url.startsWith('http://') || url.startsWith('https://'),
      'Base URL must include protocol (http:// or https://)'
    ),
  personalAccessToken: z
    .string()
    .min(1, 'Personal Access Token is required')
    .refine(
      token => token.length >= 20,
      'PAT token appears to be invalid (too short)'
    ),
  contextPath: z
    .string()
    .regex(/^\/[a-zA-Z0-9\-_]*$/, 'Context path must start with / and contain only alphanumeric characters, hyphens, and underscores')
    .optional(),
  apiVersion: z.enum(['latest', '2']).default('latest'),
  timeout: z.number().min(1000).max(300000).default(30000), // 1s to 5min
  maxRetries: z.number().min(0).max(10).default(3),
  validateSsl: z.boolean().default(true),
  proxy: ProxyConfigSchema.optional(),
});

export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;
export type JiraDataCenterConfig = z.infer<typeof JiraDataCenterConfigSchema>;

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration Manager for Jira Data Center
 * Handles validation, normalization, and connectivity testing
 */
export class ConfigManager {
  /**
   * Validate configuration object
   */
  validateConfig(config: unknown): ValidationResult {
    const result = JiraDataCenterConfigSchema.safeParse(config);
    
    if (result.success) {
      const warnings = this.generateWarnings(result.data);
      return {
        valid: true,
        errors: [],
        warnings,
      };
    }

    return {
      valid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
      warnings: [],
    };
  }

  /**
   * Normalize base URL (remove trailing slashes, ensure protocol)
   */
  normalizeBaseUrl(url: string): string {
    let normalized = url.trim();
    
    // Add https:// if no protocol specified
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    return normalized;
  }

  /**
   * Detect context path from base URL
   */
  detectContextPath(baseUrl: string): string | undefined {
    try {
      const url = new URL(baseUrl);
      const pathname = url.pathname;
      
      if (pathname && pathname !== '/') {
        return pathname;
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Test connectivity to Jira Data Center instance
   */
  async testConnectivity(config: JiraDataCenterConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const normalizedUrl = this.normalizeBaseUrl(config.baseUrl);
      const contextPath = config.contextPath || this.detectContextPath(normalizedUrl);
      const testUrl = `${normalizedUrl}${contextPath || ''}/rest/api/${config.apiVersion}/myself`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const requestInit: RequestInit = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.personalAccessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'mcp-jira-dc-server/1.0.0-DC',
        },
        signal: controller.signal,
      };

      // Add proxy configuration if specified
      if (config.proxy) {
        // Note: In a real implementation, you might need to use a library like 'https-proxy-agent'
        warnings.push('Proxy configuration detected but not implemented in this test');
      }

      const response = await fetch(testUrl, requestInit);
      clearTimeout(timeoutId);

      if (response.ok) {
        const userInfo = await response.json() as { displayName?: string; accountId?: string };
        warnings.push(`Successfully connected as: ${userInfo.displayName || userInfo.accountId || 'Unknown user'}`);
      } else if (response.status === 401) {
        errors.push('Authentication failed: Invalid Personal Access Token');
      } else if (response.status === 403) {
        errors.push('Authentication succeeded but access denied: Check user permissions');
      } else if (response.status === 404) {
        errors.push('API endpoint not found: Check base URL and context path');
      } else {
        errors.push(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errors.push(`Connection timeout after ${config.timeout}ms`);
        } else if (error.message.includes('ENOTFOUND')) {
          errors.push('DNS resolution failed: Check base URL');
        } else if (error.message.includes('ECONNREFUSED')) {
          errors.push('Connection refused: Check if Jira Data Center is running');
        } else if (error.message.includes('certificate')) {
          errors.push('SSL certificate error: Check validateSsl setting');
        } else {
          errors.push(`Connection error: ${error.message}`);
        }
      } else {
        errors.push('Unknown connection error occurred');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate configuration warnings
   */
  private generateWarnings(config: JiraDataCenterConfig): string[] {
    const warnings: string[] = [];

    // Check for insecure HTTP
    if (config.baseUrl.startsWith('http://')) {
      warnings.push('Using HTTP instead of HTTPS - consider security implications');
    }

    // Check timeout values
    if (config.timeout < 5000) {
      warnings.push('Timeout is very low - may cause failures on slow networks');
    }

    // Check SSL validation
    if (!config.validateSsl) {
      warnings.push('SSL validation disabled - not recommended for production');
    }

    // Check API version
    if (config.apiVersion === 'latest') {
      warnings.push('Using "latest" API version - consider pinning to specific version for stability');
    }

    return warnings;
  }

  /**
   * Create configuration from environment variables
   */
  static fromEnvironment(): JiraDataCenterConfig {
    const config = {
      baseUrl: process.env.JIRA_DC_BASE_URL || '',
      personalAccessToken: process.env.JIRA_DC_PAT || '',
      contextPath: process.env.JIRA_DC_CONTEXT_PATH,
      apiVersion: (process.env.JIRA_DC_API_VERSION as 'latest' | '2') || 'latest',
      timeout: process.env.JIRA_DC_TIMEOUT ? parseInt(process.env.JIRA_DC_TIMEOUT, 10) : 30000,
      maxRetries: process.env.JIRA_DC_MAX_RETRIES ? parseInt(process.env.JIRA_DC_MAX_RETRIES, 10) : 3,
      validateSsl: process.env.JIRA_DC_VALIDATE_SSL !== 'false',
    };

    const result = JiraDataCenterConfigSchema.safeParse(config);
    
    if (!result.success) {
      const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Invalid environment configuration:\n${errors.join('\n')}`);
    }

    return result.data;
  }
}