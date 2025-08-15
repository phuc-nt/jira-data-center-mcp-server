/**
 * Enhanced Search for Search Module
 * Provides enhanced issue search and retrieval using Data Center API v2/latest
 * HIGH COMPATIBILITY - Version change only, with DC-specific optimizations
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  EnhancedSearchParams,
  EnhancedSearchResponse,
  EnhancedGetIssueParams,
  SearchMetadata,
  AdvancedSearchOptions
} from './types.js';
import type { Issue } from '../core/types.js';
import { logger } from '../../utils/logger.js';

export class EnhancedSearchManager {
  private readonly logger = logger.child('EnhancedSearchManager');
  private searchCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('EnhancedSearchManager initialized');
  }

  /**
   * Enhanced issue search with smart filtering and DC optimizations
   * Tool: enhancedSearchIssues
   * Endpoint: /rest/api/2/search
   * Compatibility: HIGH - Version change only (v3 → v2), enhanced với DC optimizations
   */
  async enhancedSearchIssues(params: EnhancedSearchParams & {
    options?: AdvancedSearchOptions;
  }): Promise<EnhancedSearchResponse> {
    const startTime = Date.now();
    this.logger.debug('Enhanced issue search', { params });

    // Build query parameters with DC optimizations
    const queryParams: Record<string, unknown> = {};
    
    if (params.jql) {
      queryParams.jql = this.optimizeJQLForDC(params.jql);
    }

    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    if (params.maxResults !== undefined) {
      // DC can handle larger result sets efficiently
      queryParams.maxResults = Math.min(params.maxResults, 1000);
    } else {
      queryParams.maxResults = 50; // Reasonable default
    }

    if (params.validateQuery !== undefined) {
      queryParams.validateQuery = params.validateQuery;
    }

    if (params.fields && params.fields.length > 0) {
      queryParams.fields = params.fields.join(',');
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.properties && params.properties.length > 0) {
      queryParams.properties = params.properties.join(',');
    }

    if (params.fieldsByKeys !== undefined) {
      queryParams.fieldsByKeys = params.fieldsByKeys;
    }

    // Check cache if enabled
    const cacheKey = this.generateCacheKey('search', queryParams);
    if (params.options?.enableCaching) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached search result', { cacheKey });
        return cached;
      }
    }

    try {
      const response = await this.apiClient.request<EnhancedSearchResponse>(
        '/rest/api/2/search',
        {
          method: 'GET',
          queryParams,
          timeout: params.options?.searchTimeout
        }
      );

      const searchTime = Date.now() - startTime;
      
      // Add DC-specific metadata
      const enhancedResponse: EnhancedSearchResponse = {
        ...response.data,
        warningMessages: response.data.warningMessages || []
      };

      // Cache result if enabled
      if (params.options?.enableCaching) {
        this.setCachedResult(cacheKey, enhancedResponse, params.options.cacheTtl || 300000); // 5 min default
      }

      this.logger.info('Enhanced search completed successfully', {
        total: enhancedResponse.total,
        returned: enhancedResponse.issues.length,
        searchTime,
        jqlLength: params.jql?.length || 0,
        cached: false
      });

      return enhancedResponse;
    } catch (error) {
      this.logger.error('Enhanced search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jql: params.jql,
        startAt: params.startAt,
        maxResults: params.maxResults
      });
      throw error;
    }
  }

  /**
   * Enhanced issue retrieval with context awareness
   * Tool: enhancedGetIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}
   * Compatibility: HIGH - Version change only (v3 → v2), enhanced với context loading
   */
  async enhancedGetIssue(params: EnhancedGetIssueParams & {
    options?: AdvancedSearchOptions;
  }): Promise<Issue> {
    const startTime = Date.now();
    this.logger.debug('Enhanced issue retrieval', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.fields && params.fields.length > 0) {
      queryParams.fields = params.fields.join(',');
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.properties && params.properties.length > 0) {
      queryParams.properties = params.properties.join(',');
    }

    if (params.fieldsByKeys !== undefined) {
      queryParams.fieldsByKeys = params.fieldsByKeys;
    }

    if (params.updateHistory !== undefined) {
      queryParams.updateHistory = params.updateHistory;
    }

    // Check cache if enabled
    const cacheKey = this.generateCacheKey('issue', { issueKey: params.issueIdOrKey, ...queryParams });
    if (params.options?.enableCaching) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached issue result', { issueKey: params.issueIdOrKey });
        return cached;
      }
    }

    try {
      const response = await this.apiClient.request<Issue>(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}`,
        {
          method: 'GET',
          queryParams,
          timeout: params.options?.searchTimeout
        }
      );

      const searchTime = Date.now() - startTime;

      // Cache result if enabled
      if (params.options?.enableCaching) {
        this.setCachedResult(cacheKey, response.data, params.options.cacheTtl || 600000); // 10 min default for issues
      }

      this.logger.info('Enhanced issue retrieval completed', {
        issueKey: response.data.key,
        issueId: response.data.id,
        projectKey: response.data.fields.project.key,
        status: response.data.fields.status.name,
        searchTime,
        cached: false
      });

      return response.data;
    } catch (error) {
      this.logger.error('Enhanced issue retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Smart JQL optimization for Data Center
   * Optimizes JQL queries for better performance in DC environment
   */
  private optimizeJQLForDC(jql: string): string {
    let optimizedJql = jql;

    // DC optimizations
    const optimizations: Array<{ pattern: RegExp; replacement: string; description: string }> = [
      // Optimize date ranges for better indexing
      {
        pattern: /created\s*>=\s*['""]([^'""]+)['""](?:\s+AND\s+created\s*<=\s*['""]([^'""]+)['""])?/gi,
        replacement: 'created >= "$1"' + (RegExp.$2 ? ' AND created <= "$2"' : ''),
        description: 'Date range optimization'
      },
      
      // Project key optimization (use = instead of IN for single values)
      {
        pattern: /project\s+IN\s*\(\s*['""]([^'""]+)['"]\s*\)/gi,
        replacement: 'project = "$1"',
        description: 'Single project optimization'
      },

      // Assignee optimization for DC user fields
      {
        pattern: /assignee\s*=\s*currentUser\(\)/gi,
        replacement: 'assignee = currentUser()',
        description: 'Current user optimization'
      }
    ];

    optimizations.forEach(opt => {
      if (opt.pattern.test(optimizedJql)) {
        optimizedJql = optimizedJql.replace(opt.pattern, opt.replacement);
        this.logger.debug('Applied JQL optimization', { 
          description: opt.description,
          original: jql,
          optimized: optimizedJql
        });
      }
    });

    return optimizedJql;
  }

  /**
   * Advanced search with multiple filters and optimizations
   */
  async advancedSearch(params: {
    filters: {
      jql?: string;
      projectKeys?: string[];
      issueTypes?: string[];
      statuses?: string[];
      assignees?: string[];
      dateRange?: {
        field: 'created' | 'updated' | 'resolved';
        from?: string;
        to?: string;
      };
    };
    options?: AdvancedSearchOptions;
    fields?: string[];
    expand?: string[];
    maxResults?: number;
  }): Promise<EnhancedSearchResponse> {
    this.logger.debug('Advanced search with filters', { params });

    // Build JQL from filters
    const jqlParts: string[] = [];

    if (params.filters.jql) {
      jqlParts.push(`(${params.filters.jql})`);
    }

    if (params.filters.projectKeys && params.filters.projectKeys.length > 0) {
      if (params.filters.projectKeys.length === 1) {
        jqlParts.push(`project = "${params.filters.projectKeys[0]}"`);
      } else {
        jqlParts.push(`project IN (${params.filters.projectKeys.map(k => `"${k}"`).join(', ')})`);
      }
    }

    if (params.filters.issueTypes && params.filters.issueTypes.length > 0) {
      jqlParts.push(`issuetype IN (${params.filters.issueTypes.map(t => `"${t}"`).join(', ')})`);
    }

    if (params.filters.statuses && params.filters.statuses.length > 0) {
      jqlParts.push(`status IN (${params.filters.statuses.map(s => `"${s}"`).join(', ')})`);
    }

    if (params.filters.assignees && params.filters.assignees.length > 0) {
      jqlParts.push(`assignee IN (${params.filters.assignees.map(a => `"${a}"`).join(', ')})`);
    }

    if (params.filters.dateRange) {
      const { field, from, to } = params.filters.dateRange;
      if (from && to) {
        jqlParts.push(`${field} >= "${from}" AND ${field} <= "${to}"`);
      } else if (from) {
        jqlParts.push(`${field} >= "${from}"`);
      } else if (to) {
        jqlParts.push(`${field} <= "${to}"`);
      }
    }

    const finalJql = jqlParts.join(' AND ');

    return this.enhancedSearchIssues({
      jql: finalJql,
      fields: params.fields,
      expand: params.expand,
      maxResults: params.maxResults,
      options: params.options
    });
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSearchSuggestions(params: {
    partialQuery: string;
    context?: 'jql' | 'project' | 'user' | 'issue';
    maxSuggestions?: number;
  }): Promise<Array<{ value: string; description: string; type: string }>> {
    this.logger.debug('Getting search suggestions', { params });

    const suggestions: Array<{ value: string; description: string; type: string }> = [];

    // Basic JQL suggestions
    if (params.context === 'jql' || !params.context) {
      const jqlKeywords = [
        'project =', 'assignee =', 'reporter =', 'status =', 'priority =',
        'issuetype =', 'created >=', 'updated >=', 'resolved >=',
        'fixVersion =', 'component =', 'labels =', 'text ~'
      ];

      jqlKeywords
        .filter(keyword => keyword.toLowerCase().includes(params.partialQuery.toLowerCase()))
        .slice(0, params.maxSuggestions || 10)
        .forEach(keyword => {
          suggestions.push({
            value: keyword,
            description: `JQL keyword: ${keyword}`,
            type: 'jql'
          });
        });
    }

    return suggestions;
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private getCachedResult(key: string): any | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      this.searchCache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCachedResult(key: string, data: any, ttl: number): void {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Simple cache cleanup - remove oldest entries if cache is too large
    if (this.searchCache.size > 1000) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.logger.debug('Search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
  } {
    const now = Date.now();
    let oldestTimestamp = now;
    
    for (const [_, cached] of this.searchCache) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
      }
    }

    return {
      size: this.searchCache.size,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
      oldestEntry: now - oldestTimestamp
    };
  }
}