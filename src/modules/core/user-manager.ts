/**
 * User Management for Core Module
 * Handles all user-related operations using Data Center API v2/latest
 * MODERATE COMPATIBILITY - Some endpoint changes from Cloud to DC
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  User, 
  UserListParams,
  UserListResponse,
  UserSearchParams,
  AssignableUserSearchParams,
  PaginatedResponse
} from './types.js';
import { logger } from '../../utils/logger.js';

export class UserManager {
  private readonly logger = logger.child('UserManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('UserManager initialized');
  }

  /**
   * Get user by accountId or username
   * Tool: getUser
   * Endpoint: /rest/api/2/user
   * Compatibility: MODERATE - Username support added for DC
   */
  async getUser(params: {
    accountId?: string;
    username?: string;
    expand?: string[];
  }): Promise<User> {
    this.logger.debug('Getting user details', { params });

    if (!params.accountId && !params.username) {
      throw new Error('Either accountId or username must be provided');
    }

    const queryParams: Record<string, unknown> = {};
    
    // DC supports both accountId and username (key parameter)
    if (params.accountId) {
      queryParams.accountId = params.accountId;
    } else if (params.username) {
      queryParams.key = params.username; // DC uses 'key' for username
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    try {
      const response = await this.apiClient.request<User>(
        '/rest/api/2/user',
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('User retrieved successfully', {
        accountId: response.data.accountId,
        username: response.data.name,
        displayName: response.data.displayName,
        active: response.data.active
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId: params.accountId,
        username: params.username
      });
      throw error;
    }
  }

  /**
   * List users with search functionality
   * Tool: listUsers
   * Endpoint: /rest/api/2/user/search
   * Compatibility: MODERATE - Endpoint changed from Cloud (/rest/api/3/users)
   */
  async listUsers(params: UserListParams = {}): Promise<UserListResponse> {
    this.logger.debug('Listing users', { params });

    const queryParams: Record<string, unknown> = {};
    
    // DC search parameters
    if (params.query) queryParams.query = params.query;
    if (params.username) queryParams.username = params.username;
    if (params.accountId) queryParams.accountId = params.accountId;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;
    if (params.includeActive !== undefined) queryParams.includeActive = params.includeActive;
    if (params.includeInactive !== undefined) queryParams.includeInactive = params.includeInactive;

    try {
      // DC returns array directly, need to wrap in response format
      const response = await this.apiClient.request<User[]>(
        '/rest/api/2/user/search',
        {
          method: 'GET',
          queryParams
        }
      );

      // Transform to standard response format
      const users = response.data;
      const startAt = params.startAt || 0;
      const maxResults = params.maxResults || 50;
      
      const formattedResponse: UserListResponse = {
        self: `/rest/api/2/user/search`,
        maxResults,
        startAt,
        total: users.length, // DC doesn't provide total in search
        isLast: users.length < maxResults,
        values: users
      };

      this.logger.info('Users listed successfully', {
        total: users.length,
        returned: users.length,
        query: params.query
      });

      return formattedResponse;
    } catch (error) {
      this.logger.error('Failed to list users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: params.query,
        startAt: params.startAt,
        maxResults: params.maxResults
      });
      throw error;
    }
  }

  /**
   * Get assignable users for an issue
   * Tool: getAssignableUsers
   * Endpoint: /rest/api/2/user/assignable/search or /rest/api/2/issue/{issueKey}/assignable/multiProjectSearch
   * Compatibility: MODERATE - Multiple endpoint options for DC
   */
  async getAssignableUsers(params: AssignableUserSearchParams): Promise<User[]> {
    this.logger.debug('Getting assignable users', { params });

    if (!params.issueKey && !params.project) {
      throw new Error('Either issueKey or project must be provided');
    }

    let endpoint: string;
    const queryParams: Record<string, unknown> = {};

    // Choose endpoint based on parameters
    if (params.issueKey) {
      endpoint = `/rest/api/2/issue/${params.issueKey}/assignable/multiProjectSearch`;
    } else {
      endpoint = '/rest/api/2/user/assignable/search';
      if (params.project) queryParams.project = params.project;
    }

    // Common query parameters
    if (params.query) queryParams.query = params.query;
    if (params.sessionId) queryParams.sessionId = params.sessionId;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    try {
      const response = await this.apiClient.request<User[]>(
        endpoint,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Assignable users retrieved successfully', {
        count: response.data.length,
        issueKey: params.issueKey,
        project: params.project,
        query: params.query
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get assignable users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueKey: params.issueKey,
        project: params.project,
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Search users with universal search capability
   * Enhanced method for improved user resolution
   */
  async searchUsers(params: UserSearchParams): Promise<User[]> {
    this.logger.debug('Searching users with universal search', { params });

    const queryParams: Record<string, unknown> = {};
    
    if (params.query) queryParams.query = params.query;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;
    if (params.includeActive !== undefined) queryParams.includeActive = params.includeActive;
    if (params.includeInactive !== undefined) queryParams.includeInactive = params.includeInactive;

    // If project or issueKey provided, use assignable search
    if (params.project || params.issueKey) {
      return this.getAssignableUsers({
        query: params.query,
        project: params.project,
        issueKey: params.issueKey,
        startAt: params.startAt,
        maxResults: params.maxResults
      });
    }

    // Otherwise use general user search
    const result = await this.listUsers(queryParams);
    return result.values;
  }

  /**
   * Resolve user by various identifiers
   * Utility method for user resolution in DC environment
   */
  async resolveUser(identifier: string): Promise<User | null> {
    this.logger.debug('Resolving user by identifier', { identifier });

    try {
      // Try accountId first
      if (identifier.includes(':')) {
        return await this.getUser({ accountId: identifier });
      }

      // Try username
      return await this.getUser({ username: identifier });
    } catch (error) {
      // If direct lookup fails, try search
      try {
        const searchResults = await this.searchUsers({ 
          query: identifier, 
          maxResults: 1 
        });
        
        if (searchResults.length > 0) {
          return searchResults[0];
        }
      } catch (searchError) {
        this.logger.warn('User resolution failed for all methods', {
          identifier,
          directError: error instanceof Error ? error.message : 'Unknown error',
          searchError: searchError instanceof Error ? searchError.message : 'Unknown error'
        });
      }

      return null;
    }
  }

  /**
   * Get user groups and roles
   * Utility method for permission checking
   */
  async getUserGroups(params: {
    accountId?: string;
    username?: string;
  }): Promise<string[]> {
    this.logger.debug('Getting user groups', { params });

    try {
      const user = await this.getUser({
        ...params,
        expand: ['groups']
      });

      return user.groups?.items.map(group => group.name) || [];
    } catch (error) {
      this.logger.error('Failed to get user groups', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId: params.accountId,
        username: params.username
      });
      return [];
    }
  }

  /**
   * Validate user access and permissions
   */
  async validateUserAccess(params: {
    accountId?: string;
    username?: string;
  }): Promise<{
    accessible: boolean;
    active: boolean;
    reason?: string;
  }> {
    this.logger.debug('Validating user access', { params });

    try {
      const user = await this.getUser(params);
      
      return {
        accessible: true,
        active: user.active,
        reason: !user.active ? 'User is inactive' : undefined
      };
    } catch (error) {
      return {
        accessible: false,
        active: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user activity and metadata
   */
  async getUserMetadata(params: {
    accountId?: string;
    username?: string;
  }): Promise<{
    accountId: string;
    username?: string;
    displayName: string;
    emailAddress?: string;
    active: boolean;
    lastLoginTime?: string;
    groupCount: number;
    groups: string[];
  }> {
    const user = await this.getUser({
      ...params,
      expand: ['groups', 'applicationRoles']
    });

    const groups = user.groups?.items.map(group => group.name) || [];

    return {
      accountId: user.accountId,
      username: user.name,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active,
      groupCount: groups.length,
      groups
    };
  }
}