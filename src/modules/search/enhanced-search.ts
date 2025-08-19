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
    this.logger.debug('Enhanced issue search (DC optimized)', { params });

    // Build query parameters with DC performance optimizations
    const queryParams: Record<string, unknown> = {};
    
    if (params.jql) {
      queryParams.jql = this.optimizeJQLForDC(params.jql);
    }

    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    // FOR DC: Reduce maxResults to prevent timeouts (analysis.md fix)
    if (params.maxResults !== undefined) {
      // Cap at 20 to prevent timeouts in DC environment
      queryParams.maxResults = Math.min(params.maxResults, 20);
    } else {
      queryParams.maxResults = 20; // Reduced default from 50 to 20
    }

    if (params.validateQuery !== undefined) {
      queryParams.validateQuery = params.validateQuery;
    }

    // FOR DC: Use minimal fields to prevent timeouts
    if (params.fields && params.fields.length > 0) {
      // Limit to essential fields only for performance
      const essentialFields = ['summary', 'status', 'assignee', 'created', 'updated', 'issuetype', 'priority'];
      const requestedFields = params.fields.filter(field => essentialFields.includes(field) || !field.includes('*'));
      queryParams.fields = requestedFields.slice(0, 8).join(','); // Limit to 8 fields max
    } else {
      // Default to essential fields only
      queryParams.fields = 'summary,status,assignee,created,issuetype,priority';
    }

    // FOR DC: Minimize expand parameters to prevent timeouts
    if (params.expand && params.expand.length > 0) {
      // Remove changelog and other heavy expand options
      const lightExpands = params.expand.filter(exp => 
        !exp.includes('changelog') && 
        !exp.includes('worklog') && 
        !exp.includes('attachment')
      );
      if (lightExpands.length > 0) {
        queryParams.expand = lightExpands.slice(0, 2).join(','); // Max 2 expand options
      }
    }
    // Don't set default expand to avoid performance issues

    if (params.properties && params.properties.length > 0) {
      // Limit properties for performance
      queryParams.properties = params.properties.slice(0, 3).join(',');
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
          timeout: params.options?.searchTimeout || 15000 // Reduced timeout to 15s
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

      this.logger.info('Enhanced search completed successfully (DC optimized)', {
        total: enhancedResponse.total,
        returned: enhancedResponse.issues.length,
        searchTime,
        jqlLength: params.jql?.length || 0,
        cached: false,
        dcOptimizations: {
          maxResults: queryParams.maxResults,
          fieldsCount: (queryParams.fields as string)?.split(',').length || 0,
          expandCount: queryParams.expand ? (queryParams.expand as string).split(',').length : 0
        }
      });

      return enhancedResponse;
    } catch (error: any) {
      // Enhanced error handling for DC search timeouts
      const errorDetails = {
        endpoint: '/rest/api/2/search',
        queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC search performance optimized with reduced parameters'
      };

      this.logger.error('Enhanced search failed - DC performance issue', errorDetails);

      // Check if it's a timeout error
      if (error.message && (error.message.includes('timeout') || error.message.includes('TIMEOUT'))) {
        const dcError = {
          status: 408,
          message: 'Search timeout in Jira Data Center',
          errorMessages: [
            'Search query took too long to execute',
            'Query complexity may be too high for current DC configuration',
            'Try reducing maxResults, simplifying JQL, or removing expand parameters',
            'Consider using pagination for large result sets'
          ],
          errors: {
            timeout: 'Search exceeded timeout limit',
            performance: 'Query too complex for DC performance'
          },
          troubleshooting: {
            jqlOptimization: 'Simplify JQL query and avoid complex functions',
            pagination: 'Use smaller maxResults (5-10) with pagination',
            fieldSelection: 'Request only essential fields',
            expandLimitation: 'Avoid expand parameters like changelog, worklog',
            indexOptimization: 'Check with Jira admin about index optimization',
            dcPerformance: 'DC search is optimized for maxResults=20, fields=essential only'
          },
          dcSolution: 'Use enhancedSearchIssues({ jql: "simple query", maxResults: 10, fields: ["summary","status"] })'
        };
        throw new Error(`HTTP 408: ${JSON.stringify(dcError, null, 2)}`);
      }

      // Other errors
      const dcError = {
        status: 400,
        message: 'Cannot search issues in Jira Data Center',
        errorMessages: [
          'Search query failed to execute',
          'Verify JQL syntax is correct',
          'Check if your PAT token has search permissions',
          'Ensure projects in query are accessible'
        ],
        errors: {
          jql: 'JQL query may be invalid or too complex',
          permission: 'May lack search permissions',
          projects: 'Referenced projects may not be accessible'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Browse projects" permission',
          jqlValidation: 'Test JQL in Jira UI first',
          projectAccess: 'Verify access to all projects in query',
          dcOptimization: 'Use performance-optimized parameters for DC'
        },
        dcSolution: 'Use simple JQL with minimal fields: enhancedSearchIssues({ jql: "project = KEY", maxResults: 20 })'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
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
    this.logger.debug('Enhanced issue retrieval (DC optimized)', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      const error = {
        status: 400,
        message: 'Issue ID or key is required',
        errorMessages: ['Missing required parameter: issueIdOrKey'],
        errors: {}
      };
      this.logger.error('Missing issue identifier', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    const queryParams: Record<string, unknown> = {};
    
    // FOR DC: Use minimal fields to prevent timeouts (analysis.md fix)
    if (params.fields && params.fields.length > 0) {
      // Limit to essential fields for performance
      const essentialFields = ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'issuetype', 'priority'];
      const requestedFields = params.fields.filter(field => essentialFields.includes(field) || !field.includes('*'));
      queryParams.fields = requestedFields.slice(0, 10).join(','); // Limit to 10 fields max
    } else {
      // Default to minimal essential fields
      queryParams.fields = 'summary,status,assignee,created,description,issuetype,priority';
    }

    // FOR DC: Reduce expand parameters to prevent timeouts
    if (params.expand && params.expand.length > 0) {
      // Remove performance-heavy expand options
      const lightExpands = params.expand.filter(exp => 
        !exp.includes('changelog') && 
        !exp.includes('worklog') && 
        !exp.includes('attachment') &&
        !exp.includes('transitions') &&
        !exp.includes('operations')
      );
      if (lightExpands.length > 0) {
        queryParams.expand = lightExpands.slice(0, 1).join(','); // Max 1 expand option
      }
    }
    // Don't set default expand to avoid performance issues

    if (params.properties && params.properties.length > 0) {
      // Limit properties for performance
      queryParams.properties = params.properties.slice(0, 2).join(',');
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
          timeout: params.options?.searchTimeout || 10000 // Reduced timeout to 10s
        }
      );

      const searchTime = Date.now() - startTime;

      // Cache result if enabled
      if (params.options?.enableCaching) {
        this.setCachedResult(cacheKey, response.data, params.options.cacheTtl || 600000); // 10 min default for issues
      }

      this.logger.info('Enhanced issue retrieval completed (DC optimized)', {
        issueKey: response.data.key,
        issueId: response.data.id,
        projectKey: response.data.fields.project.key,
        status: response.data.fields.status.name,
        searchTime,
        cached: false,
        dcOptimizations: {
          fieldsCount: (queryParams.fields as string)?.split(',').length || 0,
          expandCount: queryParams.expand ? (queryParams.expand as string).split(',').length : 0,
          propertiesCount: queryParams.properties ? (queryParams.properties as string).split(',').length : 0
        }
      });

      return response.data;
    } catch (error: any) {
      // Enhanced error handling for DC issue retrieval
      const errorDetails = {
        endpoint: `/rest/api/2/issue/${params.issueIdOrKey}`,
        queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC issue retrieval optimized with minimal expand parameters'
      };

      this.logger.error('Enhanced issue retrieval failed - DC performance issue', errorDetails);

      // Check if it's a timeout error
      if (error.message && (error.message.includes('timeout') || error.message.includes('TIMEOUT'))) {
        const dcError = {
          status: 408,
          message: 'Issue retrieval timeout in Jira Data Center',
          errorMessages: [
            'Issue retrieval took too long to execute',
            'Issue may have large amounts of data (comments, worklogs, attachments)',
            'Try reducing fields or removing expand parameters',
            'Consider retrieving comments/worklogs separately'
          ],
          errors: {
            timeout: 'Issue retrieval exceeded timeout limit',
            performance: 'Issue data too large for single request'
          },
          troubleshooting: {
            fieldOptimization: 'Request only essential fields',
            expandLimitation: 'Avoid expand parameters like changelog, worklog, attachment',
            separateRequests: 'Retrieve comments/worklogs separately if needed',
            dcPerformance: 'DC optimized for minimal fields and single expand option',
            dataSize: 'Large issues may require pagination or selective field access'
          },
          dcSolution: 'Use enhancedGetIssue({ issueIdOrKey: "ISSUE-123", fields: ["summary","status","assignee"] })'
        };
        throw new Error(`HTTP 408: ${JSON.stringify(dcError, null, 2)}`);
      }

      // Check if it's a 404 error (issue not found)
      if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
        const dcError = {
          status: 404,
          message: 'Issue not found in Jira Data Center',
          errorMessages: [
            `Issue '${params.issueIdOrKey}' does not exist or is not accessible`,
            'Verify the issue key/ID is correct',
            'Check if your PAT token has access to the project',
            'Ensure the issue has not been deleted or moved'
          ],
          errors: {
            issue: `Issue '${params.issueIdOrKey}' not found or not accessible`
          },
          troubleshooting: {
            permissions: 'Ensure PAT has "Browse projects" permission',
            issueExists: 'Verify the issue key/ID exists in your DC instance',
            projectAccess: 'Check if you have access to the project containing this issue',
            issueStatus: 'Verify the issue has not been deleted or archived'
          },
          dcSolution: 'Verify issue exists: enhancedGetIssue({ issueIdOrKey: "VALID-ISSUE-KEY" })'
        };
        throw new Error(`HTTP 404: ${JSON.stringify(dcError, null, 2)}`);
      }

      // Other errors
      const dcError = {
        status: 400,
        message: 'Cannot retrieve issue in Jira Data Center',
        errorMessages: [
          `Failed to retrieve issue '${params.issueIdOrKey}'`,
          'Verify the issue exists and is accessible',
          'Check if your PAT token has appropriate permissions',
          'Ensure request parameters are valid'
        ],
        errors: {
          issue: `Issue '${params.issueIdOrKey}' retrieval failed`,
          permission: 'May lack appropriate access permissions',
          parameters: 'Request parameters may be invalid'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Browse projects" permission',
          issueAccess: 'Verify access to the issue and its project',
          parameterValidation: 'Check field names and expand parameters are valid',
          dcOptimization: 'Use minimal fields and expand parameters for best performance'
        },
        dcSolution: 'Use simple request: enhancedGetIssue({ issueIdOrKey: "ISSUE-123" })'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
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