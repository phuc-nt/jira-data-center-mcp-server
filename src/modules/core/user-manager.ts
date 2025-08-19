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
   * Compatibility: FIXED - Use username parameter for DC (accountId not supported)
   */
  async getUser(params: {
    accountId?: string;
    username?: string;
    expand?: string[];
  }): Promise<User> {
    this.logger.debug('Getting user details', { params });

    if (!params.accountId && !params.username) {
      const error = {
        status: 400,
        message: 'Either accountId or username must be provided',
        errorMessages: ['Missing required parameter: accountId or username'],
        errors: {}
      };
      this.logger.error('Missing user identifier', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    const queryParams: Record<string, unknown> = {};
    
    // FOR DC: Use username parameter (accountId not supported in most DC versions)
    // Try username first, fallback to accountId if provided
    if (params.username) {
      queryParams.username = params.username;
    } else if (params.accountId) {
      // Try to use accountId but expect it might fail in DC
      queryParams.accountId = params.accountId;
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
        active: response.data.active,
        usedParameter: params.username ? 'username' : 'accountId'
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error handling with DC-specific guidance
      const errorDetails = {
        endpoint: '/rest/api/2/user',
        parameters: queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires username parameter. AccountId may not be supported in your DC version.'
      };

      this.logger.error('Failed to get user - DC API issue', errorDetails);

      // If accountId failed, suggest using username
      if (params.accountId && !params.username) {
        const dcError = {
          status: 404,
          message: 'User not found with accountId in Jira Data Center',
          errorMessages: [
            'AccountId parameter may not be supported in Jira Data Center',
            'Please use username parameter instead',
            `Attempted accountId: ${params.accountId}`
          ],
          errors: {
            accountId: 'Not supported in Jira Data Center API v2'
          },
          dcSolution: 'Use getUser({ username: "your-username" }) instead'
        };
        throw new Error(`HTTP 404: ${JSON.stringify(dcError, null, 2)}`);
      }

      // If username failed, provide detailed error
      const dcError = {
        status: 404,
        message: 'User not found in Jira Data Center',
        errorMessages: [
          `User '${params.username || params.accountId}' does not exist or is not accessible`,
          'Verify the username exists in your Jira Data Center instance',
          'Check if your PAT token has "Browse users and groups" permission'
        ],
        errors: {
          user: `User '${params.username || params.accountId}' not found`
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Browse users and groups" permission',
          userDirectory: 'Check LDAP/AD integration if using external directory',
          alternatives: 'Try using a known username from your Jira instance'
        }
      };
      throw new Error(`HTTP 404: ${JSON.stringify(dcError, null, 2)}`);
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
   * Endpoint: /rest/api/2/user/assignable/search
   * Compatibility: FIXED - Use project parameter, not issueKey for DC
   */
  async getAssignableUsers(params: AssignableUserSearchParams): Promise<User[]> {
    this.logger.debug('Getting assignable users', { params });

    if (!params.issueKey && !params.project) {
      const error = {
        status: 400,
        message: 'Either issueKey or project must be provided',
        errorMessages: ['Missing required parameter: issueKey or project'],
        errors: {}
      };
      this.logger.error('Missing project/issue identifier', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    const queryParams: Record<string, unknown> = {};
    
    // FOR DC: Use project parameter (preferred over issueKey)
    if (params.project) {
      queryParams.project = params.project;
    } else if (params.issueKey) {
      // Extract project key from issue key (e.g., PROJ-123 -> PROJ)
      const projectKey = params.issueKey.split('-')[0];
      queryParams.project = projectKey;
      this.logger.info('Extracted project key from issueKey', {
        issueKey: params.issueKey,
        extractedProject: projectKey
      });
    }

    // Add query parameter for user filtering
    if (params.query) {
      queryParams.username = params.query; // DC uses 'username' instead of 'query'
    }
    
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    try {
      const response = await this.apiClient.request<User[]>(
        '/rest/api/2/user/assignable/search',
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Assignable users retrieved successfully', {
        count: response.data.length,
        project: queryParams.project,
        usernameFilter: queryParams.username,
        endpoint: '/rest/api/2/user/assignable/search'
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error handling for DC assignable users
      const errorDetails = {
        endpoint: '/rest/api/2/user/assignable/search',
        parameters: queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires project parameter for assignable user search'
      };

      this.logger.error('Failed to get assignable users - DC API issue', errorDetails);

      const dcError = {
        status: 404,
        message: 'No assignable users found in Jira Data Center',
        errorMessages: [
          `No users can be assigned in project '${queryParams.project}'`,
          'Verify the project key exists and is accessible',
          'Check if your PAT token has "Browse projects" and "Assign issues" permissions',
          'Ensure users exist in the project with appropriate permissions'
        ],
        errors: {
          project: queryParams.project ? `Project '${queryParams.project}' may not exist or not accessible` : 'Project parameter required',
          permission: 'May lack "Browse projects" or "Assign issues" permissions'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Browse projects" and "Assign issues" permissions',
          projectAccess: 'Verify project exists and you have access to it',
          userDirectory: 'Check if project has any users with assign permissions',
          apiFormat: 'DC API requires project parameter format: /rest/api/2/user/assignable/search?project=PROJECTKEY'
        },
        dcSolution: 'Use getAssignableUsers({ project: "PROJECT_KEY" }) with a valid project key'
      };
      throw new Error(`HTTP 404: ${JSON.stringify(dcError, null, 2)}`);
    }
  }

  /**
   * Universal search users - DC optimized
   * Tool: universalSearchUsers
   * Endpoint: /rest/api/2/user/search
   * Compatibility: FIXED - Use proper DC query format with wildcard support
   */
  async searchUsers(params: UserSearchParams): Promise<User[]> {
    this.logger.debug('Searching users with universal search (DC optimized)', { params });

    const queryParams: Record<string, unknown> = {};
    
    // FOR DC: Use specific parameter format
    // If no query provided, use wildcard to get all users
    const searchQuery = params.query || '.'; // DC uses '.' as wildcard for all users
    queryParams.username = searchQuery; // DC uses 'username' parameter for search
    
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) {
      // DC performance: limit to reasonable number
      queryParams.maxResults = Math.min(params.maxResults, 50);
    } else {
      queryParams.maxResults = 50; // Default limit for DC performance
    }

    // If project or issueKey provided, use assignable search instead
    if (params.project || params.issueKey) {
      return this.getAssignableUsers({
        query: params.query,
        project: params.project,
        issueKey: params.issueKey,
        startAt: params.startAt,
        maxResults: params.maxResults
      });
    }

    try {
      const response = await this.apiClient.request<User[]>(
        '/rest/api/2/user/search',
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Universal user search completed', {
        query: searchQuery,
        found: response.data.length,
        maxResults: queryParams.maxResults,
        isWildcard: searchQuery === '.'
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error handling for DC user search
      const errorDetails = {
        endpoint: '/rest/api/2/user/search',
        parameters: queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC user search requires username parameter with proper format'
      };

      this.logger.error('Failed universal user search - DC API issue', errorDetails);

      const dcError = {
        status: 400,
        message: 'Cannot search users in Jira Data Center',
        errorMessages: [
          `User search failed with query: '${searchQuery}'`,
          'Verify your PAT token has "Browse users and groups" permission',
          'Check if user directory is properly configured (LDAP/AD)',
          'Ensure query format is compatible with DC user search'
        ],
        errors: {
          query: searchQuery === '.' ? 'Wildcard search may be restricted' : `Query '${searchQuery}' format invalid`,
          permission: 'May lack "Browse users and groups" permission'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Browse users and groups" permission',
          userDirectory: 'Check LDAP/AD configuration if using external directory',
          queryFormat: 'Use specific username or partial username for search',
          wildcardUsage: 'DC API supports "." for all users but may be restricted',
          alternatives: 'Try searching with specific username patterns'
        },
        dcSolution: 'Use universalSearchUsers({ query: "partial-username" }) with specific search terms'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
    }
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