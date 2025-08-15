/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  includeStackTrace: boolean;
  sensitiveFields: string[];
}

/**
 * Structured Logger for MCP Jira Data Center Server
 * Provides audit-compliant logging for enterprise environments
 */
export class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      includeStackTrace: true,
      sensitiveFields: [
        'personalAccessToken',
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
      ],
      ...config,
    };
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>, component?: string): void {
    this.log(LogLevel.DEBUG, message, context, component);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>, component?: string): void {
    this.log(LogLevel.INFO, message, context, component);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>, component?: string): void {
    this.log(LogLevel.WARN, message, context, component);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
    component?: string
  ): void {
    const logContext = context || {};
    
    if (error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
      };
    }

    this.log(LogLevel.ERROR, message, logContext, component);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    component?: string
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(component && { component }),
      ...(context && { context: this.sanitizeContext(context) }),
    };

    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.logToFile(logEntry);
    }
  }

  /**
   * Check if message should be logged based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if field contains sensitive information
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(sensitive =>
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }

  /**
   * Mask sensitive values
   */
  private maskSensitiveValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value.length <= 8) {
        return '***';
      }
      const start = value.substring(0, 4);
      const end = value.substring(value.length - 4);
      return `${start}...${end}`;
    }
    return '[REDACTED]';
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, component, context } = entry;
    
    const prefix = component ? `[${component}]` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const logMessage = `${timestamp} ${level.toUpperCase()} ${prefix} ${message}${contextStr}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  /**
   * Log to file (in a real implementation, you might use fs.appendFile)
   */
  private logToFile(entry: LogEntry): void {
    // This is a placeholder - in a real implementation, you would write to a file
    // For now, we'll just indicate that file logging would happen here
    const logLine = JSON.stringify(entry) + '\n';
    
    // In a real implementation:
    // import { appendFile } from 'fs/promises';
    // await appendFile(this.config.filePath!, logLine);
    
    // For this implementation, we'll just note that file logging would occur
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
      console.log(`[FILE LOG] ${logLine.trim()}`);
    }
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create a child logger with a specific component name
   */
  child(component: string): ComponentLogger {
    return new ComponentLogger(this, component);
  }

  /**
   * Log authentication events (audit trail)
   */
  auditAuth(event: string, user?: string, success?: boolean, context?: Record<string, unknown>): void {
    this.info(`AUTH: ${event}`, {
      ...context,
      user: user || 'unknown',
      success: success ?? false,
      auditEvent: true,
    }, 'AUTH');
  }

  /**
   * Log API request/response (for debugging)
   */
  apiCall(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    context?: Record<string, unknown>
  ): void {
    const level = statusCode && statusCode >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, `API: ${method} ${url}`, {
      ...context,
      method,
      url,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    }, 'API');
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: Record<string, unknown>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    this.log(level, `PERF: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      slow: duration > 5000,
    }, 'PERF');
  }
}

/**
 * Component-specific logger that automatically includes component name
 */
export class ComponentLogger {
  constructor(private logger: Logger, private component: string) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, context, this.component);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, context, this.component);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, context, this.component);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.logger.error(message, error, context, this.component);
  }

  auditAuth(event: string, user?: string, success?: boolean, context?: Record<string, unknown>): void {
    this.logger.auditAuth(event, user, success, context);
  }

  apiCall(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    context?: Record<string, unknown>
  ): void {
    this.logger.apiCall(method, url, statusCode, duration, context);
  }

  performance(operation: string, duration: number, context?: Record<string, unknown>): void {
    this.logger.performance(operation, duration, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();