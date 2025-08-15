/**
 * Error Handling & Retry Logic for Data Center API calls
 * Provides robust error handling, retry strategies, and circuit breaker functionality
 */

import { logger } from '../utils/logger.js';

/**
 * Error types that can occur during API calls
 */
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND_ERROR = 'not_found_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SERVER_ERROR = 'server_error',
  VALIDATION_ERROR = 'validation_error',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Retry strategy types
 */
export enum RetryStrategy {
  FIXED_DELAY = 'fixed_delay',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  CUSTOM = 'custom'
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, blocking requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * API error with enhanced metadata
 */
export class APIError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number; // seconds
  public readonly originalError?: Error;
  public readonly requestId?: string;
  public readonly endpoint?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType,
    options: {
      statusCode?: number;
      retryable?: boolean;
      retryAfter?: number;
      originalError?: Error;
      requestId?: string;
      endpoint?: string;
    } = {}
  ) {
    super(message);
    this.name = 'APIError';
    this.type = type;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? this.isRetryableByDefault(type, options.statusCode);
    this.retryAfter = options.retryAfter;
    this.originalError = options.originalError;
    this.requestId = options.requestId;
    this.endpoint = options.endpoint;
    this.timestamp = new Date();
  }

  private isRetryableByDefault(type: ErrorType, statusCode?: number): boolean {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.RATE_LIMIT_ERROR:
      case ErrorType.SERVER_ERROR:
        return true;
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.NOT_FOUND_ERROR:
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.CIRCUIT_BREAKER_OPEN:
        return false;
      default:
        // Retry on 5xx errors, but not 4xx
        return statusCode ? statusCode >= 500 : false;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      requestId: this.requestId,
      endpoint: this.endpoint,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number;  // milliseconds
  backoffMultiplier: number; // for exponential backoff
  jitter: boolean; // add random jitter to delays
  retryCondition?: (error: APIError, attempt: number) => boolean;
  onRetry?: (error: APIError, attempt: number, delay: number) => void;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // number of failures to open circuit
  recoveryTimeout: number;     // ms to wait before trying to close circuit
  successThreshold: number;    // number of successes to close circuit
  enabled: boolean;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  timeout: number; // request timeout in ms
  enableMetrics: boolean;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState_Internal {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

/**
 * Error handling metrics
 */
export interface ErrorMetrics {
  totalRequests: number;
  totalFailures: number;
  totalRetries: number;
  circuitBreakerTrips: number;
  errorsByType: Record<ErrorType, number>;
  averageRetryDelay: number;
  lastError?: APIError;
}

/**
 * Default configurations
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  successThreshold: 3,
  enabled: true
};

/**
 * Error Handler with Retry Logic and Circuit Breaker
 * Provides comprehensive error handling for DC API calls
 */
export class APIErrorHandler {
  private readonly logger = logger.child('APIErrorHandler');
  private readonly circuitBreakerState: CircuitBreakerState_Internal;
  private readonly metrics: ErrorMetrics;

  constructor(private config: ErrorHandlerConfig) {
    this.circuitBreakerState = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0
    };

    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalRetries: 0,
      circuitBreakerTrips: 0,
      errorsByType: {} as Record<ErrorType, number>,
      averageRetryDelay: 0
    };

    this.logger.debug('APIErrorHandler initialized', {
      retryStrategy: config.retry.strategy,
      maxRetries: config.retry.maxRetries,
      circuitBreakerEnabled: config.circuitBreaker.enabled
    });
  }

  /**
   * Execute request with error handling and retry logic
   */
  async executeWithRetry<T>(
    request: () => Promise<T>,
    endpoint?: string,
    requestId?: string
  ): Promise<T> {
    this.metrics.totalRequests++;

    // Check circuit breaker
    if (this.config.circuitBreaker.enabled && !this.canMakeRequest()) {
      const error = new APIError(
        'Circuit breaker is open - service unavailable',
        ErrorType.CIRCUIT_BREAKER_OPEN,
        { endpoint, requestId, retryable: false }
      );
      this.recordFailure(error);
      throw error;
    }

    let lastError: APIError;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        // Add request timeout
        const result = await this.withTimeout(request(), this.config.timeout);
        
        // Record success
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = this.normalizeError(error, endpoint, requestId);
        this.recordFailure(lastError);
        
        // Don't retry if not retryable or on last attempt
        if (!lastError.retryable || attempt === this.config.retry.maxRetries) {
          break;
        }

        // Custom retry condition
        if (this.config.retry.retryCondition && 
            !this.config.retry.retryCondition(lastError, attempt + 1)) {
          this.logger.debug('Custom retry condition failed', {
            error: lastError.type,
            attempt: attempt + 1
          });
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt + 1);
        totalDelay += delay;

        this.logger.info('Retrying request', {
          attempt: attempt + 1,
          maxRetries: this.config.retry.maxRetries,
          delay,
          errorType: lastError.type,
          endpoint
        });

        // Call retry callback
        if (this.config.retry.onRetry) {
          this.config.retry.onRetry(lastError, attempt + 1, delay);
        }

        // Wait before retry
        await this.delay(delay);
        this.metrics.totalRetries++;
      }
    }

    // Update metrics
    this.updateAverageRetryDelay(totalDelay);
    this.metrics.lastError = lastError!;

    throw lastError!;
  }

  /**
   * Normalize various error types to APIError
   */
  private normalizeError(error: unknown, endpoint?: string, requestId?: string): APIError {
    if (error instanceof APIError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new APIError(
          'Request timeout',
          ErrorType.TIMEOUT_ERROR,
          { originalError: error, endpoint, requestId }
        );
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        return new APIError(
          'Network error',
          ErrorType.NETWORK_ERROR,
          { originalError: error, endpoint, requestId }
        );
      }

      // Check for HTTP response errors
      const statusMatch = error.message.match(/(\d{3})/);
      if (statusMatch) {
        const statusCode = parseInt(statusMatch[1]);
        const errorType = this.getErrorTypeFromStatus(statusCode);
        
        return new APIError(
          error.message,
          errorType,
          { statusCode, originalError: error, endpoint, requestId }
        );
      }
    }

    // Unknown error
    return new APIError(
      error instanceof Error ? error.message : 'Unknown error',
      ErrorType.UNKNOWN_ERROR,
      { originalError: error instanceof Error ? error : undefined, endpoint, requestId }
    );
  }

  /**
   * Determine error type from HTTP status code
   */
  private getErrorTypeFromStatus(statusCode: number): ErrorType {
    switch (statusCode) {
      case 401:
        return ErrorType.AUTHENTICATION_ERROR;
      case 403:
        return ErrorType.AUTHORIZATION_ERROR;
      case 404:
        return ErrorType.NOT_FOUND_ERROR;
      case 422:
        return ErrorType.VALIDATION_ERROR;
      case 429:
        return ErrorType.RATE_LIMIT_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorType.SERVER_ERROR;
      default:
        return statusCode >= 400 && statusCode < 500 
          ? ErrorType.VALIDATION_ERROR 
          : ErrorType.SERVER_ERROR;
    }
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.config.retry.strategy) {
      case RetryStrategy.FIXED_DELAY:
        delay = this.config.retry.baseDelay;
        break;

      case RetryStrategy.LINEAR_BACKOFF:
        delay = this.config.retry.baseDelay * attempt;
        break;

      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
        break;

      default:
        delay = this.config.retry.baseDelay;
    }

    // Apply maximum delay limit
    delay = Math.min(delay, this.config.retry.maxDelay);

    // Add jitter if enabled
    if (this.config.retry.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // Random between 50-100% of calculated delay
    }

    return Math.round(delay);
  }

  /**
   * Add timeout to promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new DOMException('Request timeout', 'AbortError'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Simple delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if request can be made (circuit breaker logic)
   */
  private canMakeRequest(): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return true;
    }

    const now = Date.now();
    const state = this.circuitBreakerState;

    switch (state.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (state.nextAttemptTime && now >= state.nextAttemptTime) {
          // Try to move to half-open
          state.state = CircuitBreakerState.HALF_OPEN;
          state.successCount = 0;
          this.logger.info('Circuit breaker moving to half-open state');
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(): void {
    const state = this.circuitBreakerState;

    if (state.state === CircuitBreakerState.HALF_OPEN) {
      state.successCount++;
      if (state.successCount >= this.config.circuitBreaker.successThreshold) {
        // Close the circuit
        state.state = CircuitBreakerState.CLOSED;
        state.failureCount = 0;
        state.successCount = 0;
        this.logger.info('Circuit breaker closed - service recovered');
      }
    } else if (state.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      state.failureCount = 0;
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(error: APIError): void {
    this.metrics.totalFailures++;
    
    // Update error type metrics
    const errorType = error.type;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;

    // Circuit breaker logic
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    const state = this.circuitBreakerState;

    if (state.state === CircuitBreakerState.CLOSED) {
      state.failureCount++;
      if (state.failureCount >= this.config.circuitBreaker.failureThreshold) {
        // Open the circuit
        state.state = CircuitBreakerState.OPEN;
        state.lastFailureTime = Date.now();
        state.nextAttemptTime = Date.now() + this.config.circuitBreaker.recoveryTimeout;
        this.metrics.circuitBreakerTrips++;
        
        this.logger.error('Circuit breaker opened due to failures', {
          failureCount: state.failureCount,
          threshold: this.config.circuitBreaker.failureThreshold
        });
      }
    } else if (state.state === CircuitBreakerState.HALF_OPEN) {
      // Failed during half-open, go back to open
      state.state = CircuitBreakerState.OPEN;
      state.failureCount++;
      state.nextAttemptTime = Date.now() + this.config.circuitBreaker.recoveryTimeout;
      
      this.logger.warn('Circuit breaker reopened after failed attempt');
    }
  }

  /**
   * Update average retry delay metric
   */
  private updateAverageRetryDelay(totalDelay: number): void {
    if (this.metrics.totalRetries === 0) {
      this.metrics.averageRetryDelay = totalDelay;
    } else {
      // Moving average
      this.metrics.averageRetryDelay = 
        (this.metrics.averageRetryDelay * (this.metrics.totalRetries - 1) + totalDelay) / this.metrics.totalRetries;
    }
  }

  /**
   * Get current error handling metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    nextAttemptTime?: number;
  } {
    return {
      state: this.circuitBreakerState.state,
      failureCount: this.circuitBreakerState.failureCount,
      successCount: this.circuitBreakerState.successCount,
      nextAttemptTime: this.circuitBreakerState.nextAttemptTime
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState.state = CircuitBreakerState.CLOSED;
    this.circuitBreakerState.failureCount = 0;
    this.circuitBreakerState.successCount = 0;
    delete this.circuitBreakerState.lastFailureTime;
    delete this.circuitBreakerState.nextAttemptTime;
    
    this.logger.info('Circuit breaker manually reset');
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.totalRequests = 0;
    this.metrics.totalFailures = 0;
    this.metrics.totalRetries = 0;
    this.metrics.circuitBreakerTrips = 0;
    this.metrics.errorsByType = {} as Record<ErrorType, number>;
    this.metrics.averageRetryDelay = 0;
    delete this.metrics.lastError;
    
    this.logger.debug('Error handling metrics reset');
  }

  /**
   * Create default error handler configuration
   */
  static createDefaultConfig(overrides: Partial<ErrorHandlerConfig> = {}): ErrorHandlerConfig {
    return {
      retry: { ...DEFAULT_RETRY_CONFIG, ...overrides.retry },
      circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...overrides.circuitBreaker },
      timeout: overrides.timeout || 30000,
      enableMetrics: overrides.enableMetrics ?? true
    };
  }

  /**
   * Create error handler with production-ready settings
   */
  static createProductionHandler(overrides: Partial<ErrorHandlerConfig> = {}): APIErrorHandler {
    const config = APIErrorHandler.createDefaultConfig({
      retry: {
        strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
        ...overrides.retry
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        successThreshold: 3,
        enabled: true,
        ...overrides.circuitBreaker
      },
      timeout: 30000,
      enableMetrics: true,
      ...overrides
    });

    return new APIErrorHandler(config);
  }
}