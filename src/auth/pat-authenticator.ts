import type { JiraDataCenterConfig } from '../config/datacenter-config.js';

/**
 * Authentication result from PAT validation
 */
export interface AuthResult {
  success: boolean;
  user?: {
    accountId: string;
    username: string;
    displayName: string;
    emailAddress?: string;
    active: boolean;
  };
  error?: string;
  statusCode?: number;
}

/**
 * Authentication headers for API requests
 */
export interface AuthHeaders {
  'Authorization': string;
  'Content-Type': string;
  'Accept': string;
  'User-Agent': string;
  'X-Atlassian-Token': string;
}

/**
 * PAT Authentication error types
 */
export enum AuthErrorType {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SERVER_ERROR = 'SERVER_ERROR',
  INVALID_FORMAT = 'INVALID_FORMAT',
}

/**
 * Authentication error with detailed information
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Personal Access Token Authenticator for Jira Data Center
 * Handles token validation, secure storage, and authentication headers
 */
export class PATAuthenticator {
  private config: JiraDataCenterConfig;
  private cachedAuthResult?: AuthResult;
  private cacheExpiry?: number;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: JiraDataCenterConfig) {
    this.config = config;
    this.validateTokenFormat(config.personalAccessToken);
  }

  /**
   * Validate PAT token format (basic checks)
   */
  private validateTokenFormat(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new AuthError(AuthErrorType.INVALID_FORMAT, 'PAT token must be a non-empty string');
    }

    if (token.length < 20) {
      throw new AuthError(
        AuthErrorType.INVALID_FORMAT,
        'PAT token appears to be too short (expected 20+ characters)'
      );
    }

    // Basic format check for Jira Data Center PATs
    if (token.includes(' ') || token.includes('\n') || token.includes('\t')) {
      throw new AuthError(
        AuthErrorType.INVALID_FORMAT,
        'PAT token contains invalid characters (spaces, newlines, or tabs)'
      );
    }
  }

  /**
   * Generate authentication headers for API requests
   */
  getAuthHeaders(): AuthHeaders {
    return {
      'Authorization': `Bearer ${this.config.personalAccessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'mcp-jira-dc-server/1.0.0-DC',
      'X-Atlassian-Token': 'no-check',
    };
  }

  /**
   * Validate PAT token with Jira Data Center instance
   */
  async validateToken(): Promise<AuthResult> {
    // Check cache first
    if (this.cachedAuthResult && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedAuthResult;
    }

    try {
      const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
      const contextPath = this.config.contextPath || '';
      const apiUrl = `${baseUrl}${contextPath}/rest/api/${this.config.apiVersion}/myself`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.personalAccessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'mcp-jira-dc-server/1.0.0-DC',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json() as {
          accountId?: string;
          name?: string;
          displayName?: string;
          emailAddress?: string;
          active?: boolean;
        };

        const authResult: AuthResult = {
          success: true,
          user: {
            accountId: userData.accountId || userData.name || 'unknown',
            username: userData.name || userData.accountId || 'unknown',
            displayName: userData.displayName || 'Unknown User',
            ...(userData.emailAddress && { emailAddress: userData.emailAddress }),
            active: userData.active ?? true,
          },
        };

        // Cache successful result
        this.cachedAuthResult = authResult;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;

        return authResult;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        return this.handleAuthError(response.status, errorText);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AuthError(
            AuthErrorType.NETWORK_ERROR,
            `Authentication timeout after ${this.config.timeout}ms`,
            undefined,
            error
          );
        }

        // Network-related errors
        if (error.message.includes('ENOTFOUND')) {
          throw new AuthError(
            AuthErrorType.NETWORK_ERROR,
            'DNS resolution failed: Check base URL',
            undefined,
            error
          );
        }

        if (error.message.includes('ECONNREFUSED')) {
          throw new AuthError(
            AuthErrorType.NETWORK_ERROR,
            'Connection refused: Check if Jira Data Center is running and accessible',
            undefined,
            error
          );
        }

        if (error.message.includes('certificate')) {
          throw new AuthError(
            AuthErrorType.NETWORK_ERROR,
            'SSL certificate error: Check certificate validity or disable SSL validation',
            undefined,
            error
          );
        }

        throw new AuthError(
          AuthErrorType.NETWORK_ERROR,
          `Network error: ${error.message}`,
          undefined,
          error
        );
      }

      throw new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Unknown authentication error occurred',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Handle authentication errors with appropriate error types
   */
  private handleAuthError(statusCode: number, responseText: string): AuthResult {
    let message: string;

    switch (statusCode) {
      case 401:
        message = 'Invalid Personal Access Token - check token validity and permissions';
        break;
      case 403:
        message = 'Access denied - PAT token may lack required permissions';
        break;
      case 404:
        message = 'API endpoint not found - check base URL, context path, and API version';
        break;
      case 429:
        message = 'Rate limit exceeded - too many authentication requests';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        message = `Jira Data Center server error (${statusCode}) - try again later`;
        break;
      default:
        message = `HTTP ${statusCode}: ${responseText || 'Unknown server error'}`;
    }

    return {
      success: false,
      error: message,
      statusCode,
    };
  }

  /**
   * Clear cached authentication result (force re-validation)
   */
  clearCache(): void {
    delete this.cachedAuthResult;
    delete this.cacheExpiry;
  }

  /**
   * Check if current authentication is cached and valid
   */
  isCacheValid(): boolean {
    return !!(
      this.cachedAuthResult &&
      this.cachedAuthResult.success &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    );
  }

  /**
   * Get cached user information if available
   */
  getCachedUser(): AuthResult['user'] | undefined {
    if (this.isCacheValid() && this.cachedAuthResult?.success) {
      return this.cachedAuthResult.user;
    }
    return undefined;
  }

  /**
   * Secure token handling - never log or expose the actual token
   */
  getTokenMask(): string {
    const token = this.config.personalAccessToken;
    if (token.length <= 8) {
      return '***';
    }
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    return `${start}...${end}`;
  }

  /**
   * Update configuration (clears cache to force re-validation)
   */
  updateConfig(newConfig: JiraDataCenterConfig): void {
    this.config = newConfig;
    this.validateTokenFormat(newConfig.personalAccessToken);
    this.clearCache();
  }
}