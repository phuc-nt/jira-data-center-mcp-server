import type { AuthError } from '../auth/pat-authenticator.js';

/**
 * Data Center specific error types
 */
export enum DCErrorType {
  // Authentication errors
  PAT_INVALID = 'PAT_INVALID',
  PAT_EXPIRED = 'PAT_EXPIRED',
  PAT_INSUFFICIENT_PERMISSIONS = 'PAT_INSUFFICIENT_PERMISSIONS',
  
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  SSL_CERTIFICATE_ERROR = 'SSL_CERTIFICATE_ERROR',
  
  // DC server errors
  DC_UNAVAILABLE = 'DC_UNAVAILABLE',
  DC_MAINTENANCE = 'DC_MAINTENANCE',
  DC_OVERLOADED = 'DC_OVERLOADED',
  
  // API errors
  API_ENDPOINT_NOT_FOUND = 'API_ENDPOINT_NOT_FOUND',
  API_VERSION_UNSUPPORTED = 'API_VERSION_UNSUPPORTED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  OPERATION_NOT_PERMITTED = 'OPERATION_NOT_PERMITTED',
  
  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  INVALID_BASE_URL = 'INVALID_BASE_URL',
  INVALID_CONTEXT_PATH = 'INVALID_CONTEXT_PATH',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * User-friendly error response
 */
export interface UserFriendlyError {
  type: DCErrorType;
  message: string;
  suggestions: string[];
  isRetryable: boolean;
  retryDelay?: number;
  helpUrl?: string;
}

/**
 * DC API error response structure
 */
export interface DCApiError {
  statusCode: number;
  statusText: string;
  body?: {
    errorMessages?: string[];
    errors?: Record<string, string>;
    message?: string;
  };
  url?: string;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  shouldRetry: boolean;
  delay: number;
  maxAttempts: number;
}

/**
 * Request context for error handling
 */
export interface RequestContext {
  method: string;
  url: string;
  headers?: Record<string, string>;
  timestamp: Date;
  attemptNumber: number;
}

/**
 * Data Center Error Handler
 * Maps DC-specific errors to user-friendly messages with suggested solutions
 */
export class DCErrorHandler {
  private static readonly HELP_BASE_URL = 'https://docs.atlassian.com/software/jira/docs/api';
  
  /**
   * Map authentication errors to user-friendly format
   */
  static mapAuthError(authError: AuthError): UserFriendlyError {
    switch (authError.type) {
      case 'INVALID_TOKEN':
        return {
          type: DCErrorType.PAT_INVALID,
          message: 'Personal Access Token is invalid or has been revoked',
          suggestions: [
            'Check if the PAT token is correct and not expired',
            'Generate a new PAT token in Jira Data Center user settings',
            'Ensure the token has required permissions (Browse Projects, etc.)',
            'Verify the token is for the correct Jira Data Center instance',
          ],
          isRetryable: false,
          helpUrl: `${this.HELP_BASE_URL}/personal-access-tokens`,
        };

      case 'EXPIRED_TOKEN':
        return {
          type: DCErrorType.PAT_EXPIRED,
          message: 'Personal Access Token has expired',
          suggestions: [
            'Generate a new PAT token in Jira Data Center',
            'Update your configuration with the new token',
            'Consider setting up token rotation for automated systems',
          ],
          isRetryable: false,
          helpUrl: `${this.HELP_BASE_URL}/personal-access-tokens`,
        };

      case 'PERMISSION_DENIED':
        return {
          type: DCErrorType.PAT_INSUFFICIENT_PERMISSIONS,
          message: 'PAT token lacks required permissions',
          suggestions: [
            'Check PAT token permissions in Jira Data Center',
            'Ensure user has access to required projects and operations',
            'Contact Jira administrator to verify user permissions',
            'Regenerate PAT with appropriate permissions',
          ],
          isRetryable: false,
        };

      case 'NETWORK_ERROR':
        return {
          type: DCErrorType.NETWORK_TIMEOUT,
          message: authError.message,
          suggestions: [
            'Check network connectivity to Jira Data Center',
            'Verify base URL and context path are correct',
            'Check firewall and proxy settings',
            'Try increasing timeout configuration',
          ],
          isRetryable: true,
          retryDelay: 5000,
        };

      default:
        return {
          type: DCErrorType.UNKNOWN_ERROR,
          message: authError.message,
          suggestions: ['Check logs for more details', 'Contact support if issue persists'],
          isRetryable: false,
        };
    }
  }

  /**
   * Map DC API errors to user-friendly format
   */
  static mapDCApiError(error: DCApiError): UserFriendlyError {
    const { statusCode, statusText, body } = error;

    switch (statusCode) {
      case 400:
        return {
          type: DCErrorType.VALIDATION_ERROR,
          message: 'Invalid request data',
          suggestions: [
            'Check request parameters and format',
            'Verify required fields are provided',
            'Check field value formats and constraints',
            body?.errorMessages?.[0] || 'Review API documentation for correct format',
          ],
          isRetryable: false,
        };

      case 401:
        return {
          type: DCErrorType.PAT_INVALID,
          message: 'Authentication required or token invalid',
          suggestions: [
            'Verify PAT token is valid and not expired',
            'Check token permissions',
            'Regenerate PAT token if necessary',
          ],
          isRetryable: false,
        };

      case 403:
        return {
          type: DCErrorType.PERMISSION_DENIED,
          message: 'Access denied - insufficient permissions',
          suggestions: [
            'Check user permissions for this operation',
            'Verify project access permissions',
            'Contact Jira administrator for access',
            'Check if resource exists and is accessible',
          ],
          isRetryable: false,
        };

      case 404:
        return {
          type: DCErrorType.RESOURCE_NOT_FOUND,
          message: 'Resource not found',
          suggestions: [
            'Verify the resource ID or key is correct',
            'Check if the resource has been deleted',
            'Ensure you have access to view the resource',
            'Verify API endpoint URL is correct',
          ],
          isRetryable: false,
        };

      case 429:
        return {
          type: DCErrorType.API_RATE_LIMITED,
          message: 'Rate limit exceeded',
          suggestions: [
            'Reduce request frequency',
            'Implement exponential backoff',
            'Check rate limiting configuration',
            'Contact administrator about rate limits',
          ],
          isRetryable: true,
          retryDelay: 60000, // 1 minute
        };

      case 500:
        return {
          type: DCErrorType.DC_UNAVAILABLE,
          message: 'Jira Data Center internal server error',
          suggestions: [
            'Try the request again in a few minutes',
            'Check Jira Data Center server logs',
            'Contact Jira administrator if error persists',
            'Verify server health and resources',
          ],
          isRetryable: true,
          retryDelay: 30000, // 30 seconds
        };

      case 502:
      case 503:
        return {
          type: DCErrorType.DC_UNAVAILABLE,
          message: 'Jira Data Center temporarily unavailable',
          suggestions: [
            'Server may be under maintenance or overloaded',
            'Try again in a few minutes',
            'Check server status with administrator',
            'Verify network connectivity',
          ],
          isRetryable: true,
          retryDelay: 60000, // 1 minute
        };

      case 504:
        return {
          type: DCErrorType.NETWORK_TIMEOUT,
          message: 'Gateway timeout - request took too long',
          suggestions: [
            'Try again with a simpler request',
            'Check network connectivity',
            'Contact administrator about server performance',
            'Consider breaking large requests into smaller ones',
          ],
          isRetryable: true,
          retryDelay: 10000, // 10 seconds
        };

      default:
        return {
          type: DCErrorType.UNKNOWN_ERROR,
          message: `HTTP ${statusCode}: ${statusText}`,
          suggestions: [
            'Check request format and parameters',
            'Review API documentation',
            'Contact support with error details',
            body?.message || 'Check server logs for more information',
          ],
          isRetryable: statusCode >= 500,
          ...(statusCode >= 500 && { retryDelay: 30000 }),
        };
    }
  }

  /**
   * Map network errors to user-friendly format
   */
  static mapNetworkError(error: Error): UserFriendlyError {
    const message = error.message.toLowerCase();

    if (error.name === 'AbortError' || message.includes('timeout')) {
      return {
        type: DCErrorType.NETWORK_TIMEOUT,
        message: 'Request timeout - server took too long to respond',
        suggestions: [
          'Check network connectivity',
          'Increase timeout configuration',
          'Try again in a few minutes',
          'Contact administrator if server is slow',
        ],
        isRetryable: true,
        retryDelay: 5000,
      };
    }

    if (message.includes('enotfound') || message.includes('dns')) {
      return {
        type: DCErrorType.DNS_RESOLUTION_FAILED,
        message: 'DNS resolution failed - cannot find server',
        suggestions: [
          'Check base URL spelling and format',
          'Verify DNS settings and connectivity',
          'Try using IP address instead of hostname',
          'Contact network administrator',
        ],
        isRetryable: true,
        retryDelay: 10000,
      };
    }

    if (message.includes('econnrefused') || message.includes('connection refused')) {
      return {
        type: DCErrorType.NETWORK_UNREACHABLE,
        message: 'Connection refused - server is not accepting connections',
        suggestions: [
          'Check if Jira Data Center is running',
          'Verify port number and URL',
          'Check firewall and proxy settings',
          'Contact server administrator',
        ],
        isRetryable: true,
        retryDelay: 15000,
      };
    }

    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      return {
        type: DCErrorType.SSL_CERTIFICATE_ERROR,
        message: 'SSL certificate validation failed',
        suggestions: [
          'Check SSL certificate validity',
          'Verify certificate chain',
          'Set validateSsl: false for testing (not recommended for production)',
          'Contact administrator about certificate issues',
        ],
        isRetryable: false,
      };
    }

    return {
      type: DCErrorType.NETWORK_UNREACHABLE,
      message: `Network error: ${error.message}`,
      suggestions: [
        'Check network connectivity',
        'Verify server URL and settings',
        'Try again in a few minutes',
        'Contact network administrator if issue persists',
      ],
      isRetryable: true,
      retryDelay: 10000,
    };
  }

  /**
   * Determine retry strategy for an error
   */
  static getRetryStrategy(error: UserFriendlyError, attemptNumber: number): RetryStrategy {
    if (!error.isRetryable || attemptNumber >= 3) {
      return {
        shouldRetry: false,
        delay: 0,
        maxAttempts: 3,
      };
    }

    const baseDelay = error.retryDelay || 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const maxDelay = 60000; // 1 minute max

    return {
      shouldRetry: true,
      delay: Math.min(exponentialDelay, maxDelay),
      maxAttempts: 3,
    };
  }

  /**
   * Log error with structured format
   */
  static logError(
    error: UserFriendlyError,
    context?: RequestContext,
    originalError?: Error
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      errorType: error.type,
      message: error.message,
      isRetryable: error.isRetryable,
      context: context ? {
        method: context.method,
        url: context.url,
        attemptNumber: context.attemptNumber,
      } : undefined,
      originalError: originalError ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack,
      } : undefined,
    };

    // In a real implementation, you might use a structured logging library
    console.error('DC Error:', JSON.stringify(logData, null, 2));
  }

  /**
   * Create user-friendly error message with suggestions
   */
  static formatErrorMessage(error: UserFriendlyError): string {
    let message = `❌ ${error.message}\n`;
    
    if (error.suggestions.length > 0) {
      message += '\n💡 Suggestions:\n';
      error.suggestions.forEach((suggestion, index) => {
        message += `   ${index + 1}. ${suggestion}\n`;
      });
    }

    if (error.helpUrl) {
      message += `\n📖 Help: ${error.helpUrl}`;
    }

    return message;
  }
}