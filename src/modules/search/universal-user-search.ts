/**
 * Universal User Search for Search Module
 * Provides comprehensive user search across multiple DC endpoints
 * ENHANCED DC VERSION - Better than Cloud with multiple search strategies
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  UniversalUserSearchParams,
  UniversalUserSearchResponse,
  SearchMetadata
} from './types.js';
import type { User } from '../core/types.js';
import { logger } from '../../utils/logger.js';

export class UniversalUserSearchManager {
  private readonly logger = logger.child('UniversalUserSearchManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('UniversalUserSearchManager initialized');
  }

  /**
   * Universal user search with multiple search modes
   * Tool: universalSearchUsers
   * Endpoints: Multiple DC endpoints for comprehensive search
   * Compatibility: ENHANCED DC VERSION - Better than Cloud with multiple strategies
   */
  async universalSearchUsers(params: UniversalUserSearchParams): Promise<UniversalUserSearchResponse> {
    const startTime = Date.now();
    this.logger.debug('Universal user search', { params });

    const searchMode = params.mode || 'general';
    const maxResults = params.maxResults || 50;
    const startAt = params.startAt || 0;

    try {
      let users: User[] = [];
      let searchContext: any = {};

      switch (searchMode) {
        case 'assignable':
          users = await this.searchAssignableUsers(params);
          searchContext = {
            issueKey: params.issueKey,
            projectKey: params.projectKey
          };
          break;

        case 'project':
          users = await this.searchProjectUsers(params);
          searchContext = {
            projectKey: params.projectKey
          };
          break;

        case 'general':
        default:
          users = await this.searchGeneralUsers(params);
          break;
      }

      // Apply pagination
      const paginatedUsers = users.slice(startAt, startAt + maxResults);

      const searchTime = Date.now() - startTime;
      const result: UniversalUserSearchResponse = {
        users: paginatedUsers,
        total: users.length,
        searchMode,
        searchContext
      };

      this.logger.info('Universal user search completed', {
        searchMode,
        query: params.query,
        total: result.total,
        returned: result.users.length,
        searchTime
      });

      return result;
    } catch (error) {
      this.logger.error('Universal user search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        searchMode,
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Search assignable users for specific context
   */
  private async searchAssignableUsers(params: UniversalUserSearchParams): Promise<User[]> {
    this.logger.debug('Searching assignable users', { params });

    const users: User[] = [];

    try {
      // Strategy 1: Use issue-specific assignable search if issue key provided
      if (params.issueKey) {
        const issueAssignableUsers = await this.apiClient.request<User[]>(
          `/rest/api/2/issue/${params.issueKey}/assignable/multiProjectSearch`,
          {
            method: 'GET',
            queryParams: {
              query: params.query || '',
              maxResults: params.maxResults || 50
            }
          }
        );
        users.push(...issueAssignableUsers.data);
      }

      // Strategy 2: Use project-specific assignable search if project provided
      if (params.projectKey && users.length === 0) {
        const projectAssignableUsers = await this.apiClient.request<User[]>(
          '/rest/api/2/user/assignable/search',
          {
            method: 'GET',
            queryParams: {
              project: params.projectKey,
              query: params.query || '',
              maxResults: params.maxResults || 50
            }
          }
        );
        users.push(...projectAssignableUsers.data);
      }

      // Strategy 3: Fallback to general assignable search
      if (users.length === 0) {
        const generalAssignableUsers = await this.apiClient.request<User[]>(
          '/rest/api/2/user/assignable/search',
          {
            method: 'GET',
            queryParams: {
              query: params.query || '',
              maxResults: params.maxResults || 50
            }
          }
        );
        users.push(...generalAssignableUsers.data);
      }

      this.logger.debug('Assignable users search completed', {
        usersFound: users.length,
        strategies: [
          params.issueKey ? 'issue-specific' : null,
          params.projectKey ? 'project-specific' : null,
          'general-assignable'
        ].filter(Boolean)
      });

      return this.deduplicateUsers(users);
    } catch (error) {
      this.logger.warn('Assignable users search failed, falling back to general search', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.searchGeneralUsers(params);
    }
  }

  /**
   * Search users within a specific project context
   */
  private async searchProjectUsers(params: UniversalUserSearchParams): Promise<User[]> {
    this.logger.debug('Searching project users', { params });

    if (!params.projectKey) {
      throw new Error('Project key is required for project user search');
    }

    try {
      const users: User[] = [];

      // Strategy 1: Get project roles and their users
      try {
        const projectRoles = await this.apiClient.request<Record<string, string>>(
          `/rest/api/2/project/${params.projectKey}/role`,
          { method: 'GET' }
        );

        // Get users from each role
        for (const [roleName, roleUrl] of Object.entries(projectRoles)) {
          try {
            const roleDetails = await this.apiClient.request<any>(
              roleUrl,
              { method: 'GET' }
            );

            if (roleDetails.data.actors) {
              roleDetails.data.actors.forEach((actor: any) => {
                if (actor.type === 'atlassian-user-role-actor' && actor.user) {
                  users.push(actor.user);
                }
              });
            }
          } catch (roleError) {
            this.logger.debug('Failed to get role details', {
              roleName,
              error: roleError instanceof Error ? roleError.message : 'Unknown error'
            });
          }
        }
      } catch (rolesError) {
        this.logger.debug('Failed to get project roles, trying alternative methods', {
          error: rolesError instanceof Error ? rolesError.message : 'Unknown error'
        });
      }

      // Strategy 2: Use assignable search as fallback
      if (users.length === 0) {
        const assignableUsers = await this.apiClient.request<User[]>(
          '/rest/api/2/user/assignable/search',
          {
            method: 'GET',
            queryParams: {
              project: params.projectKey,
              query: params.query || '',
              maxResults: params.maxResults || 50
            }
          }
        );
        users.push(...assignableUsers.data);
      }

      // Filter by query if provided
      let filteredUsers = this.deduplicateUsers(users);
      if (params.query && params.query.trim().length > 0) {
        const searchTerm = params.query.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.displayName.toLowerCase().includes(searchTerm) ||
          user.emailAddress?.toLowerCase().includes(searchTerm) ||
          user.name?.toLowerCase().includes(searchTerm) ||
          user.accountId.toLowerCase().includes(searchTerm)
        );
      }

      this.logger.debug('Project users search completed', {
        projectKey: params.projectKey,
        totalUsers: users.length,
        filteredUsers: filteredUsers.length
      });

      return filteredUsers;
    } catch (error) {
      this.logger.warn('Project users search failed, falling back to general search', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectKey: params.projectKey
      });
      return this.searchGeneralUsers(params);
    }
  }

  /**
   * General user search across the instance
   */
  private async searchGeneralUsers(params: UniversalUserSearchParams): Promise<User[]> {
    this.logger.debug('Searching general users', { params });

    try {
      const queryParams: Record<string, unknown> = {
        maxResults: params.maxResults || 50
      };

      if (params.query) {
        queryParams.query = params.query;
      }

      if (params.includeActive !== undefined) {
        queryParams.includeActive = params.includeActive;
      }

      if (params.includeInactive !== undefined) {
        queryParams.includeInactive = params.includeInactive;
      }

      const response = await this.apiClient.request<User[]>(
        '/rest/api/2/user/search',
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.debug('General users search completed', {
        usersFound: response.data.length,
        query: params.query
      });

      return response.data;
    } catch (error) {
      this.logger.error('General users search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Advanced user search with multiple criteria
   */
  async advancedUserSearch(params: {
    query?: string;
    emailDomain?: string;
    groups?: string[];
    active?: boolean;
    lastLoginAfter?: string;
    projectKeys?: string[];
    maxResults?: number;
  }): Promise<{
    users: User[];
    searchMetadata: SearchMetadata;
  }> {
    const startTime = Date.now();
    this.logger.debug('Advanced user search', { params });

    try {
      let users: User[] = [];

      // Start with general search if query provided
      if (params.query) {
        const generalUsers = await this.searchGeneralUsers({
          query: params.query,
          maxResults: params.maxResults || 200, // Get more to allow filtering
          includeActive: params.active
        });
        users = generalUsers;
      } else {
        // Get all users if no query (up to limit)
        const allUsers = await this.searchGeneralUsers({
          maxResults: params.maxResults || 200,
          includeActive: params.active
        });
        users = allUsers;
      }

      // Apply additional filters
      let filteredUsers = users;

      // Filter by email domain
      if (params.emailDomain) {
        filteredUsers = filteredUsers.filter(user =>
          user.emailAddress?.toLowerCase().endsWith(`@${params.emailDomain.toLowerCase()}`)
        );
      }

      // Filter by active status if specifically requested
      if (params.active !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.active === params.active);
      }

      // If project keys provided, ensure users are assignable to those projects
      if (params.projectKeys && params.projectKeys.length > 0) {
        const projectUsers = new Set<string>();
        
        for (const projectKey of params.projectKeys) {
          try {
            const projectSpecificUsers = await this.searchProjectUsers({
              projectKey,
              maxResults: 1000
            });
            projectSpecificUsers.forEach(user => projectUsers.add(user.accountId));
          } catch (projectError) {
            this.logger.debug('Failed to get users for project', {
              projectKey,
              error: projectError instanceof Error ? projectError.message : 'Unknown error'
            });
          }
        }

        filteredUsers = filteredUsers.filter(user => projectUsers.has(user.accountId));
      }

      // Apply final limit
      const limitedUsers = filteredUsers.slice(0, params.maxResults || 50);

      const searchTime = Date.now() - startTime;
      const metadata: SearchMetadata = {
        searchTime,
        resultCount: limitedUsers.length,
        totalAvailable: filteredUsers.length,
        searchMode: 'advanced-user-search',
        optimizations: ['deduplication', 'multi-criteria-filtering', 'result-limiting']
      };

      this.logger.info('Advanced user search completed', {
        query: params.query,
        emailDomain: params.emailDomain,
        projectKeys: params.projectKeys,
        totalFound: filteredUsers.length,
        returned: limitedUsers.length,
        searchTime
      });

      return {
        users: limitedUsers,
        searchMetadata: metadata
      };
    } catch (error) {
      this.logger.error('Advanced user search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Get user suggestions based on partial input
   */
  async getUserSuggestions(params: {
    partialInput: string;
    context?: 'assignable' | 'mention' | 'general';
    projectKey?: string;
    issueKey?: string;
    maxSuggestions?: number;
  }): Promise<Array<{
    user: User;
    matchType: 'name' | 'email' | 'username' | 'accountId';
    relevanceScore: number;
  }>> {
    this.logger.debug('Getting user suggestions', { params });

    const maxSuggestions = params.maxSuggestions || 10;
    let users: User[] = [];

    try {
      // Search based on context
      switch (params.context) {
        case 'assignable':
          users = await this.searchAssignableUsers({
            query: params.partialInput,
            projectKey: params.projectKey,
            issueKey: params.issueKey,
            maxResults: maxSuggestions * 2 // Get more for scoring
          });
          break;

        case 'mention':
        case 'general':
        default:
          users = await this.searchGeneralUsers({
            query: params.partialInput,
            maxResults: maxSuggestions * 2
          });
          break;
      }

      // Score and rank suggestions
      const suggestions = users.map(user => {
        const input = params.partialInput.toLowerCase();
        let matchType: 'name' | 'email' | 'username' | 'accountId' = 'name';
        let relevanceScore = 0;

        // Calculate relevance score
        if (user.displayName.toLowerCase().startsWith(input)) {
          relevanceScore += 100;
          matchType = 'name';
        } else if (user.displayName.toLowerCase().includes(input)) {
          relevanceScore += 50;
          matchType = 'name';
        }

        if (user.emailAddress && user.emailAddress.toLowerCase().includes(input)) {
          relevanceScore += 30;
          if (relevanceScore < 50) matchType = 'email';
        }

        if (user.name && user.name.toLowerCase().includes(input)) {
          relevanceScore += 40;
          if (relevanceScore < 50) matchType = 'username';
        }

        if (user.accountId.toLowerCase().includes(input)) {
          relevanceScore += 20;
          if (relevanceScore < 50) matchType = 'accountId';
        }

        // Boost active users
        if (user.active) {
          relevanceScore += 10;
        }

        return {
          user,
          matchType,
          relevanceScore
        };
      })
      .filter(suggestion => suggestion.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSuggestions);

      this.logger.debug('User suggestions generated', {
        partialInput: params.partialInput,
        context: params.context,
        suggestionsCount: suggestions.length
      });

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to get user suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        partialInput: params.partialInput,
        context: params.context
      });
      return [];
    }
  }

  /**
   * Remove duplicate users from array
   */
  private deduplicateUsers(users: User[]): User[] {
    const uniqueUsers = new Map<string, User>();
    
    users.forEach(user => {
      if (!uniqueUsers.has(user.accountId)) {
        uniqueUsers.set(user.accountId, user);
      }
    });

    return Array.from(uniqueUsers.values());
  }

  /**
   * Get comprehensive user profile with additional context
   */
  async getUserProfile(params: {
    accountId?: string;
    username?: string;
    includeGroups?: boolean;
    includeProjects?: boolean;
    includeRecentActivity?: boolean;
  }): Promise<{
    user: User;
    groups?: string[];
    projects?: string[];
    lastActivity?: string;
    permissions?: string[];
  }> {
    this.logger.debug('Getting comprehensive user profile', { params });

    try {
      // Get basic user info
      const userResponse = await this.apiClient.request<User>(
        '/rest/api/2/user',
        {
          method: 'GET',
          queryParams: {
            accountId: params.accountId,
            key: params.username,
            expand: params.includeGroups ? 'groups' : undefined
          }
        }
      );

      const user = userResponse.data;
      const profile: any = { user };

      // Add groups if requested
      if (params.includeGroups && user.groups) {
        profile.groups = user.groups.items.map(group => group.name);
      }

      // Add projects if requested
      if (params.includeProjects) {
        try {
          // This would require additional API calls to get user's projects
          // For now, we'll note this as a potential enhancement
          profile.projects = [];
        } catch (projectError) {
          this.logger.debug('Could not retrieve user projects', {
            error: projectError instanceof Error ? projectError.message : 'Unknown error'
          });
        }
      }

      this.logger.info('User profile retrieved successfully', {
        accountId: user.accountId,
        username: user.name,
        active: user.active,
        hasGroups: !!profile.groups,
        hasProjects: !!profile.projects
      });

      return profile;
    } catch (error) {
      this.logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        accountId: params.accountId,
        username: params.username
      });
      throw error;
    }
  }
}