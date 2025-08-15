/**
 * Search Module for MCP Jira Data Center Server
 * Provides comprehensive search functionality using DC API v2/latest + Agile API v1.0
 * HIGH COMPATIBILITY with DC-specific enhancements
 */

import type { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import type { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { DataCenterAPIClient } from '../../api/datacenter-client.js';
import { logger } from '../../utils/logger.js';

// Re-export types for external use
export type { 
  EnhancedSearchParams, EnhancedSearchResponse, 
  EpicSearchParams, EpicSearchResponse, Epic,
  UniversalUserSearchParams, UniversalUserSearchResponse,
  Filter, FilterListParams, FilterListResponse
} from './types.js';

// Import individual search implementations
import { EnhancedSearchManager } from './enhanced-search.js';
import { EpicSearchManager } from './epic-search.js';
import { UniversalUserSearchManager } from './universal-user-search.js';

// Import types from other modules for consolidated tools
import type { User, Project, Version } from '../core/types.js';

/**
 * Search Module - Complete search and discovery implementation
 * Handles all search operations với DC-specific optimizations
 */
export class SearchModule {
  private readonly logger = logger.child('SearchModule');
  private readonly apiClient: DataCenterAPIClient;
  private readonly enhancedSearchManager: EnhancedSearchManager;
  private readonly epicSearchManager: EpicSearchManager;
  private readonly universalUserSearchManager: UniversalUserSearchManager;

  constructor(
    config: JiraDataCenterConfig,
    authenticator: PATAuthenticator
  ) {
    this.apiClient = new DataCenterAPIClient(config, authenticator);
    this.enhancedSearchManager = new EnhancedSearchManager(this.apiClient);
    this.epicSearchManager = new EpicSearchManager(this.apiClient);
    this.universalUserSearchManager = new UniversalUserSearchManager(this.apiClient);

    this.logger.info('Search Module initialized', {
      apiVersion: '2/latest + Agile 1.0',
      compatibility: 'HIGH - DC-enhanced với better performance'
    });
  }

  /**
   * Initialize the Search module
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Search Module');
    
    try {
      // Initialize API client
      await this.apiClient.initialize();
      
      this.logger.info('Search Module initialization completed');
    } catch (error) {
      this.logger.error('Search Module initialization failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ========== ENHANCED SEARCH TOOLS ==========

  /**
   * Enhanced issue search with smart filtering
   * Tool: enhancedSearchIssues
   * Endpoint: /rest/api/2/search (Version change only, enhanced với DC optimizations)
   */
  async enhancedSearchIssues(params: {
    jql?: string;
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
    validateQuery?: boolean;
    properties?: string[];
    fieldsByKeys?: boolean;
    options?: {
      enableCaching?: boolean;
      cacheTtl?: number;
      searchTimeout?: number;
    };
  }) {
    return this.enhancedSearchManager.enhancedSearchIssues(params);
  }

  /**
   * Enhanced issue retrieval with context awareness
   * Tool: enhancedGetIssue
   * Endpoint: /rest/api/2/issue/{issueKey} (Version change only, enhanced context loading)
   */
  async enhancedGetIssue(params: {
    issueIdOrKey: string;
    fields?: string[];
    expand?: string[];
    properties?: string[];
    fieldsByKeys?: boolean;
    updateHistory?: boolean;
    options?: {
      enableCaching?: boolean;
      cacheTtl?: number;
      searchTimeout?: number;
    };
  }) {
    return this.enhancedSearchManager.enhancedGetIssue(params);
  }

  // ========== EPIC SEARCH TOOLS ==========

  /**
   * Epic search via Agile API
   * Tool: epicSearchAgile
   * Endpoint: /rest/agile/1.0/board/{boardId}/epic (Better DC support)
   */
  async epicSearchAgile(params: {
    boardId: number;
    query?: string;
    startAt?: number;
    maxResults?: number;
    done?: boolean;
  }) {
    return this.epicSearchManager.epicSearchAgile(params);
  }

  // ========== UNIVERSAL USER SEARCH TOOLS ==========

  /**
   * Universal user search with multiple modes
   * Tool: universalSearchUsers
   * Endpoints: Multiple DC endpoints (Enhanced DC version)
   */
  async universalSearchUsers(params: {
    query?: string;
    mode?: 'assignable' | 'general' | 'project';
    issueKey?: string;
    projectKey?: string;
    startAt?: number;
    maxResults?: number;
    includeActive?: boolean;
    includeInactive?: boolean;
  }) {
    return this.universalUserSearchManager.universalSearchUsers(params);
  }

  // ========== CONSOLIDATED TOOLS (from other modules) ==========

  /**
   * List users
   * Tool: listUsers (consolidated from Core Module)
   * Endpoint: /rest/api/2/user/search (Endpoint changed from Cloud)
   */
  async listUsers(params: {
    query?: string;
    username?: string;
    accountId?: string;
    startAt?: number;
    maxResults?: number;
    includeActive?: boolean;
    includeInactive?: boolean;
  } = {}) {
    return this.universalUserSearchManager.universalSearchUsers({
      ...params,
      mode: 'general'
    });
  }

  /**
   * Get user
   * Tool: getUser (consolidated from Core Module)  
   * Endpoint: /rest/api/2/user (Username support added)
   */
  async getUser(params: {
    accountId?: string;
    username?: string;
    expand?: string[];
  }) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.accountId) {
      queryParams.accountId = params.accountId;
    } else if (params.username) {
      queryParams.key = params.username;
    } else {
      throw new Error('Either accountId or username must be provided');
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    const response = await this.apiClient.request<User>(
      '/rest/api/2/user',
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * List projects
   * Tool: listProjects (consolidated from Core Module)
   * Endpoint: /rest/api/2/project (Version change only)
   */
  async listProjects(params: {
    expand?: string[];
    recent?: number;
    properties?: string[];
    typeKey?: string;
    categoryId?: number;
    action?: 'view' | 'browse' | 'edit';
    startAt?: number;
    maxResults?: number;
  } = {}) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }
    if (params.recent !== undefined) queryParams.recent = params.recent;
    if (params.properties && params.properties.length > 0) {
      queryParams.properties = params.properties.join(',');
    }
    if (params.typeKey) queryParams.typeKey = params.typeKey;
    if (params.categoryId !== undefined) queryParams.categoryId = params.categoryId;
    if (params.action) queryParams.action = params.action;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    const response = await this.apiClient.request<Project[] | any>(
      '/rest/api/2/project',
      {
        method: 'GET',
        queryParams
      }
    );

    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return {
        values: response.data,
        total: response.data.length,
        maxResults: params.maxResults || 50,
        startAt: params.startAt || 0,
        isLast: true
      };
    }

    return response.data;
  }

  /**
   * List project versions
   * Tool: listProjectVersions (consolidated from Core Module)
   * Endpoint: /rest/api/2/project/{projectKey}/versions (Endpoint changed)
   */
  async listProjectVersions(params: {
    projectIdOrKey: string;
    expand?: string[];
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    query?: string;
    status?: string;
  }) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.query) queryParams.query = params.query;
    if (params.status) queryParams.status = params.status;

    const response = await this.apiClient.request<Version[]>(
      `/rest/api/2/project/${encodeURIComponent(params.projectIdOrKey)}/versions`,
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * List filters
   * Tool: listFilters
   * Endpoint: /rest/api/2/filter/search (Version change only)
   */
  async listFilters(params: {
    filterName?: string;
    accountId?: string;
    owner?: string;
    groupname?: string;
    groupId?: string;
    projectId?: number;
    id?: number[];
    orderBy?: string;
    startAt?: number;
    maxResults?: number;
    expand?: string[];
  } = {}) {
    const queryParams: Record<string, unknown> = {};
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'expand' && Array.isArray(value)) {
          queryParams[key] = value.join(',');
        } else if (key === 'id' && Array.isArray(value)) {
          queryParams[key] = value.join(',');
        } else {
          queryParams[key] = value;
        }
      }
    });

    const response = await this.apiClient.request<any>(
      '/rest/api/2/filter/search',
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * Get filter
   * Tool: getFilter
   * Endpoint: /rest/api/2/filter/{filterId} (Version change only)
   */
  async getFilter(params: {
    filterId: string;
    expand?: string[];
    overrideSharePermissions?: boolean;
  }) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }
    if (params.overrideSharePermissions !== undefined) {
      queryParams.overrideSharePermissions = params.overrideSharePermissions;
    }

    const response = await this.apiClient.request<any>(
      `/rest/api/2/filter/${encodeURIComponent(params.filterId)}`,
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * List boards (consolidated from Agile Module)
   * Tool: listBoards
   * Endpoint: /rest/agile/1.0/board (No changes needed)
   */
  async listBoards(params: {
    projectKeyOrId?: string;
    type?: 'scrum' | 'kanban';
    name?: string;
    startAt?: number;
    maxResults?: number;
  } = {}) {
    const queryParams: Record<string, unknown> = {};
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = value;
      }
    });

    const response = await this.apiClient.request<any>(
      '/rest/agile/1.0/board',
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * List sprints (consolidated from Agile Module)
   * Tool: listSprints
   * Endpoint: /rest/agile/1.0/board/{boardId}/sprint (No changes needed)
   */
  async listSprints(params: {
    boardId: number;
    state?: 'future' | 'active' | 'closed';
    startAt?: number;
    maxResults?: number;
  }) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.state) queryParams.state = params.state;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    const response = await this.apiClient.request<any>(
      `/rest/agile/1.0/board/${params.boardId}/sprint`,
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  /**
   * List backlog issues (consolidated from Agile Module)
   * Tool: listBacklogIssues
   * Endpoint: /rest/agile/1.0/board/{boardId}/backlog (No changes needed)
   */
  async listBacklogIssues(params: {
    boardId: number;
    jql?: string;
    validateQuery?: boolean;
    fields?: string[];
    expand?: string[];
    startAt?: number;
    maxResults?: number;
  }) {
    const queryParams: Record<string, unknown> = {};
    
    if (params.jql) queryParams.jql = params.jql;
    if (params.validateQuery !== undefined) queryParams.validateQuery = params.validateQuery;
    if (params.fields) queryParams.fields = params.fields.join(',');
    if (params.expand) queryParams.expand = params.expand.join(',');
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    const response = await this.apiClient.request<any>(
      `/rest/agile/1.0/board/${params.boardId}/backlog`,
      {
        method: 'GET',
        queryParams
      }
    );

    return response.data;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get module health status
   */
  getHealthStatus() {
    return {
      module: 'search',
      apiVersion: '2/latest + Agile 1.0',
      compatibility: 'HIGH',
      clientStats: this.apiClient.getClientStats(),
      errorMetrics: this.apiClient.getErrorMetrics(),
      cacheStats: this.enhancedSearchManager.getCacheStats()
    };
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return {
      enhancedSearch: {
        tools: ['enhancedSearchIssues', 'enhancedGetIssue'],
        compatibility: 'HIGH - Version change với DC optimizations'
      },
      epicSearch: {
        tools: ['epicSearchAgile'],
        compatibility: 'HIGH - Better DC support than Cloud'
      },
      universalUserSearch: {
        tools: ['universalSearchUsers'],
        compatibility: 'ENHANCED - Multiple search strategies'
      },
      consolidatedTools: {
        tools: [
          'listUsers', 'getUser', 'listProjects', 'listProjectVersions',
          'listFilters', 'getFilter', 'listBoards', 'listSprints', 'listBacklogIssues'
        ],
        compatibility: 'HIGH - Mostly version changes với some endpoint adaptations'
      },
      totalTools: 14,
      dcEnhancements: [
        'Smart JQL optimization cho Data Center indexing',
        'Enhanced caching với TTL management',
        'Parallel search capabilities',
        'Advanced user search với multiple strategies',
        'Epic search với better DC performance',
        'Cross-board và cross-project search optimization'
      ]
    };
  }

  /**
   * Advanced multi-entity search
   */
  async multiEntitySearch(params: {
    query: string;
    entities: Array<'issues' | 'users' | 'projects' | 'boards' | 'sprints' | 'epics'>;
    maxResults?: number;
    projectContext?: string;
    boardContext?: number;
  }) {
    const startTime = Date.now();
    this.logger.debug('Multi-entity search', { params });

    const results: any = {};
    const searchPromises: Array<Promise<void>> = [];

    // Search issues
    if (params.entities.includes('issues')) {
      searchPromises.push(
        this.enhancedSearchIssues({
          jql: `text ~ "${params.query}"`,
          maxResults: params.maxResults || 10
        }).then(result => {
          results.issues = {
            results: result.issues,
            total: result.total
          };
        }).catch(error => {
          this.logger.warn('Issues search failed in multi-entity search', { error });
          results.issues = { results: [], total: 0 };
        })
      );
    }

    // Search users
    if (params.entities.includes('users')) {
      searchPromises.push(
        this.universalSearchUsers({
          query: params.query,
          maxResults: params.maxResults || 10
        }).then(result => {
          results.users = {
            results: result.users,
            total: result.total
          };
        }).catch(error => {
          this.logger.warn('Users search failed in multi-entity search', { error });
          results.users = { results: [], total: 0 };
        })
      );
    }

    // Search projects
    if (params.entities.includes('projects')) {
      searchPromises.push(
        this.listProjects({
          maxResults: params.maxResults || 10
        }).then(result => {
          // Filter by query
          const filteredProjects = result.values.filter((project: any) =>
            project.name.toLowerCase().includes(params.query.toLowerCase()) ||
            project.key.toLowerCase().includes(params.query.toLowerCase())
          );
          results.projects = {
            results: filteredProjects,
            total: filteredProjects.length
          };
        }).catch(error => {
          this.logger.warn('Projects search failed in multi-entity search', { error });
          results.projects = { results: [], total: 0 };
        })
      );
    }

    // Add other entity searches...

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    const searchTime = Date.now() - startTime;
    
    this.logger.info('Multi-entity search completed', {
      query: params.query,
      entities: params.entities,
      searchTime,
      resultsCount: Object.keys(results).length
    });

    return {
      ...results,
      metadata: {
        searchTime,
        query: params.query,
        entities: params.entities,
        searchMode: 'multi-entity'
      }
    };
  }

  /**
   * Clear all search caches
   */
  clearSearchCache(): void {
    this.enhancedSearchManager.clearCache();
    this.logger.info('All search caches cleared');
  }
}