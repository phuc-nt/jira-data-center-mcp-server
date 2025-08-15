/**
 * User Resolution System for Data Center
 * Handles AccountId ↔ Username dual identifier support with caching
 */

import type { JiraDataCenterConfig } from '../config/datacenter-config.js';
import type { PATAuthenticator } from '../auth/pat-authenticator.js';
import { logger } from '../utils/logger.js';

/**
 * User information from DC instance
 */
export interface User {
  accountId: string;
  username: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  locale?: string;
  timeZone?: string;
}

/**
 * User identifier types supported by DC
 */
export type UserIdentifierType = 'accountId' | 'username' | 'email' | 'displayName';

/**
 * User resolution strategies
 */
export enum UserResolutionStrategy {
  ACCOUNT_ID_FIRST = 'accountId_first',    // Try accountId, fallback to username
  USERNAME_FIRST = 'username_first',       // Try username, fallback to accountId  
  EMAIL_LOOKUP = 'email_lookup',           // Search by email address
  DISPLAY_NAME = 'display_name',           // Search by display name
  AUTO_DETECT = 'auto_detect'              // Automatically detect identifier type
}

/**
 * User resolution result
 */
export interface UserResolutionResult {
  user?: User;
  success: boolean;
  strategy: UserResolutionStrategy;
  identifierType: UserIdentifierType;
  error?: string;
  cached: boolean;
}

/**
 * User search options
 */
export interface UserSearchOptions {
  strategy?: UserResolutionStrategy;
  maxResults?: number;
  includeInactive?: boolean;
  useCache?: boolean;
  timeout?: number;
}

/**
 * Cached user entry
 */
interface CachedUser {
  user: User;
  timestamp: number;
  identifiers: Set<string>; // All known identifiers for this user
}

/**
 * User Resolver for Data Center
 * Handles dual identifier system and user lookup strategies
 */
export class UserResolver {
  private readonly logger = logger.child('UserResolver');
  private readonly userCache = new Map<string, CachedUser>();
  private readonly CACHE_DURATION = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(
    private config: JiraDataCenterConfig,
    private authenticator: PATAuthenticator
  ) {
    this.logger.debug('UserResolver initialized');
  }

  /**
   * Resolve user by any identifier
   */
  async resolveUser(
    identifier: string,
    options: UserSearchOptions = {}
  ): Promise<UserResolutionResult> {
    const opts = {
      strategy: UserResolutionStrategy.AUTO_DETECT,
      maxResults: 1,
      includeInactive: false,
      useCache: true,
      timeout: 10000,
      ...options
    };

    this.logger.debug('Resolving user', {
      identifier: this.maskIdentifier(identifier),
      strategy: opts.strategy
    });

    // Check cache first
    if (opts.useCache) {
      const cached = this.getCachedUser(identifier);
      if (cached) {
        this.logger.debug('User found in cache', {
          identifier: this.maskIdentifier(identifier)
        });
        return {
          user: cached.user,
          success: true,
          strategy: opts.strategy,
          identifierType: this.detectIdentifierType(identifier),
          cached: true
        };
      }
    }

    // Determine resolution strategy
    let strategy = opts.strategy;
    if (strategy === UserResolutionStrategy.AUTO_DETECT) {
      strategy = this.selectOptimalStrategy(identifier);
    }

    // Execute resolution
    try {
      const result = await this.executeResolution(identifier, strategy, opts);
      
      // Cache successful result
      if (result.success && result.user && opts.useCache) {
        this.cacheUser(result.user, identifier);
      }

      return result;
    } catch (error) {
      this.logger.warn('User resolution failed', {
        identifier: this.maskIdentifier(identifier),
        strategy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        strategy,
        identifierType: this.detectIdentifierType(identifier),
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false
      };
    }
  }

  /**
   * Find user by account ID
   */
  async findUserByAccountId(accountId: string): Promise<User | null> {
    const result = await this.makeUserRequest('/rest/api/latest/user', {
      accountId
    });

    return result ? this.normalizeUserData(result) : null;
  }

  /**
   * Find user by username
   */
  async findUserByUsername(username: string): Promise<User | null> {
    const result = await this.makeUserRequest('/rest/api/latest/user', {
      username
    });

    return result ? this.normalizeUserData(result) : null;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const results = await this.makeUserRequest('/rest/api/latest/user/search', {
      query: email,
      maxResults: 1
    });

    if (Array.isArray(results) && results.length > 0) {
      return this.normalizeUserData(results[0]);
    }

    return null;
  }

  /**
   * Search users by display name
   */
  async findUsersByDisplayName(displayName: string, maxResults = 5): Promise<User[]> {
    const results = await this.makeUserRequest('/rest/api/latest/user/search', {
      query: displayName,
      maxResults
    });

    if (Array.isArray(results)) {
      return results.map(user => this.normalizeUserData(user));
    }

    return [];
  }

  /**
   * Get assignable identifier for specific context
   */
  getAssignableIdentifier(user: User, context: 'issue' | 'comment' = 'issue'): string {
    // Data Center typically prefers accountId for assignments
    // but username is also supported for backward compatibility
    if (user.accountId && user.accountId !== user.username) {
      return user.accountId;
    }
    
    return user.username;
  }

  /**
   * Validate user for assignment to issue
   */
  async validateUserForAssignment(
    userId: string,
    issueKey: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const endpoint = `/rest/api/latest/user/assignable/search`;
      const params = {
        query: userId,
        issueKey,
        maxResults: 1
      };

      const results = await this.makeUserRequest(endpoint, params);
      
      if (Array.isArray(results) && results.length > 0) {
        return { valid: true };
      }

      return {
        valid: false,
        reason: 'User is not assignable to this issue'
      };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Detect identifier type from string pattern
   */
  detectIdentifierType(identifier: string): UserIdentifierType {
    // Account ID pattern (typically UUID-like or numeric)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) ||
        /^[0-9a-f]{24}$/i.test(identifier) ||
        /^\d+$/.test(identifier)) {
      return 'accountId';
    }

    // Email pattern
    if (identifier.includes('@') && identifier.includes('.')) {
      return 'email';
    }

    // Display name pattern (contains spaces)
    if (identifier.includes(' ')) {
      return 'displayName';
    }

    // Default to username
    return 'username';
  }

  /**
   * Select optimal resolution strategy based on identifier
   */
  private selectOptimalStrategy(identifier: string): UserResolutionStrategy {
    const type = this.detectIdentifierType(identifier);
    
    switch (type) {
      case 'accountId':
        return UserResolutionStrategy.ACCOUNT_ID_FIRST;
      case 'email':
        return UserResolutionStrategy.EMAIL_LOOKUP;
      case 'displayName':
        return UserResolutionStrategy.DISPLAY_NAME;
      case 'username':
      default:
        return UserResolutionStrategy.USERNAME_FIRST;
    }
  }

  /**
   * Execute user resolution with specific strategy
   */
  private async executeResolution(
    identifier: string,
    strategy: UserResolutionStrategy,
    options: UserSearchOptions
  ): Promise<UserResolutionResult> {
    let user: User | null = null;
    let error: string | undefined;
    const identifierType = this.detectIdentifierType(identifier);

    switch (strategy) {
      case UserResolutionStrategy.ACCOUNT_ID_FIRST:
        user = await this.findUserByAccountId(identifier);
        if (!user) {
          user = await this.findUserByUsername(identifier);
        }
        break;

      case UserResolutionStrategy.USERNAME_FIRST:
        user = await this.findUserByUsername(identifier);
        if (!user) {
          user = await this.findUserByAccountId(identifier);
        }
        break;

      case UserResolutionStrategy.EMAIL_LOOKUP:
        user = await this.findUserByEmail(identifier);
        break;

      case UserResolutionStrategy.DISPLAY_NAME:
        const users = await this.findUsersByDisplayName(identifier, 1);
        user = users[0] || null;
        break;

      default:
        error = `Unsupported resolution strategy: ${strategy}`;
    }

    return {
      user: user || undefined,
      success: !!user,
      strategy,
      identifierType,
      error,
      cached: false
    };
  }

  /**
   * Make authenticated request to user API
   */
  private async makeUserRequest(
    endpoint: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const contextPath = this.config.contextPath || '';
    
    // Build URL with query parameters
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    
    const url = `${baseUrl}${contextPath}${endpoint}?${searchParams.toString()}`;

    const authHeaders = this.authenticator.getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeaders['Authorization'],
          'Accept': authHeaders['Accept'],
          'User-Agent': authHeaders['User-Agent']
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`User API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Normalize user data from DC API response
   */
  private normalizeUserData(userData: any): User {
    return {
      accountId: userData.accountId || userData.name || userData.key || 'unknown',
      username: userData.name || userData.username || userData.key || 'unknown',
      displayName: userData.displayName || userData.name || 'Unknown User',
      emailAddress: userData.emailAddress || userData.email,
      active: userData.active !== false, // Default to true
      locale: userData.locale,
      timeZone: userData.timeZone || userData.timezone
    };
  }

  /**
   * Cache user data with multiple identifiers
   */
  private cacheUser(user: User, originalIdentifier: string): void {
    // Limit cache size
    if (this.userCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry();
    }

    const cached: CachedUser = {
      user,
      timestamp: Date.now(),
      identifiers: new Set([
        originalIdentifier,
        user.accountId,
        user.username,
        user.displayName
      ])
    };

    // Add entry for original identifier
    this.userCache.set(originalIdentifier, cached);

    // Add entries for all known identifiers
    for (const identifier of cached.identifiers) {
      if (identifier && identifier !== originalIdentifier) {
        this.userCache.set(identifier, cached);
      }
    }

    this.logger.debug('User cached', {
      identifiers: Array.from(cached.identifiers).map(id => this.maskIdentifier(id))
    });
  }

  /**
   * Get cached user by any identifier
   */
  private getCachedUser(identifier: string): CachedUser | null {
    const cached = this.userCache.get(identifier);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.removeCachedUser(identifier);
      return null;
    }

    return cached;
  }

  /**
   * Remove cached user by identifier
   */
  private removeCachedUser(identifier: string): void {
    const cached = this.userCache.get(identifier);
    if (cached) {
      // Remove all identifier entries for this user
      for (const id of cached.identifiers) {
        this.userCache.delete(id);
      }
    }
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldestTime = Date.now();
    let oldestKey = '';

    for (const [key, cached] of this.userCache) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeCachedUser(oldestKey);
    }
  }

  /**
   * Mask identifier for logging (security)
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.length <= 4) {
      return '***';
    }
    
    const start = identifier.substring(0, 2);
    const end = identifier.substring(identifier.length - 2);
    return `${start}...${end}`;
  }

  /**
   * Clear user resolution cache
   */
  clearCache(): void {
    this.userCache.clear();
    this.logger.debug('User resolution cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    oldestEntry?: number;
  } {
    let oldestTime = Date.now();
    for (const cached of this.userCache.values()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
      }
    }

    return {
      size: this.userCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      oldestEntry: this.userCache.size > 0 ? oldestTime : undefined
    };
  }
}