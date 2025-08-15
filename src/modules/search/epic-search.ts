/**
 * Epic Search for Search Module
 * Provides epic search functionality using Agile API v1.0
 * HIGH COMPATIBILITY - Better DC support than Cloud, no API changes needed
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  EpicSearchParams,
  EpicSearchResponse,
  Epic,
  SearchMetadata
} from './types.js';
import { logger } from '../../utils/logger.js';

export class EpicSearchManager {
  private readonly logger = logger.child('EpicSearchManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('EpicSearchManager initialized');
  }

  /**
   * Search epics via Agile API with DC optimizations
   * Tool: epicSearchAgile
   * Endpoint: /rest/agile/1.0/board/{boardId}/epic
   * Compatibility: HIGH - Better DC support, no API changes needed from Cloud
   */
  async epicSearchAgile(params: EpicSearchParams): Promise<EpicSearchResponse> {
    this.logger.debug('Epic search via Agile API', { params });

    if (!params.boardId || params.boardId <= 0) {
      throw new Error('Valid board ID is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    if (params.maxResults !== undefined) {
      queryParams.maxResults = params.maxResults;
    } else {
      queryParams.maxResults = 50; // Reasonable default
    }

    if (params.done !== undefined) {
      queryParams.done = params.done;
    }

    // Note: Agile API doesn't have direct query parameter for text search
    // but DC has better epic handling than Cloud

    try {
      const response = await this.apiClient.request<EpicSearchResponse>(
        `/rest/agile/1.0/board/${params.boardId}/epic`,
        {
          method: 'GET',
          queryParams
        }
      );

      // Apply client-side filtering if query is provided
      let filteredEpics = response.data.values;
      if (params.query && params.query.trim().length > 0) {
        const searchTerm = params.query.toLowerCase().trim();
        filteredEpics = response.data.values.filter(epic => 
          epic.name.toLowerCase().includes(searchTerm) ||
          epic.summary.toLowerCase().includes(searchTerm) ||
          epic.key.toLowerCase().includes(searchTerm)
        );
      }

      const result: EpicSearchResponse = {
        maxResults: response.data.maxResults,
        startAt: response.data.startAt,
        total: filteredEpics.length,
        isLast: filteredEpics.length < (response.data.maxResults || 50),
        values: filteredEpics
      };

      this.logger.info('Epic search completed successfully', {
        boardId: params.boardId,
        total: result.total,
        returned: result.values.length,
        filtered: !!params.query,
        doneFilter: params.done
      });

      return result;
    } catch (error) {
      this.logger.error('Epic search failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        boardId: params.boardId,
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Get epic details by ID or key
   * Enhanced method for detailed epic information
   */
  async getEpicDetails(params: {
    epicIdOrKey: string;
    boardId?: number;
  }): Promise<Epic | null> {
    this.logger.debug('Getting epic details', { params });

    try {
      // If board ID provided, search within that board
      if (params.boardId) {
        const searchResult = await this.epicSearchAgile({
          boardId: params.boardId,
          maxResults: 1000 // Get all epics to find the specific one
        });

        const epic = searchResult.values.find(e => 
          e.id.toString() === params.epicIdOrKey || 
          e.key === params.epicIdOrKey
        );

        if (epic) {
          this.logger.info('Epic found in board', {
            epicId: epic.id,
            epicKey: epic.key,
            boardId: params.boardId
          });
          return epic;
        }
      }

      // Alternative: Try to get epic via issue API if available
      try {
        const response = await this.apiClient.request<any>(
          `/rest/api/2/issue/${encodeURIComponent(params.epicIdOrKey)}`,
          {
            method: 'GET',
            queryParams: {
              fields: 'key,summary,status,customfield_10000', // Epic Name field
              expand: 'names'
            }
          }
        );

        // Convert issue to epic format if it's an epic
        const issue = response.data;
        if (issue.fields.issuetype?.name === 'Epic' || issue.fields.customfield_10000) {
          const epic: Epic = {
            id: parseInt(issue.id),
            key: issue.key,
            self: issue.self,
            name: issue.fields.customfield_10000 || issue.fields.summary,
            summary: issue.fields.summary,
            color: { key: 'blue-gray' }, // Default color
            done: issue.fields.status.statusCategory?.key === 'done'
          };

          this.logger.info('Epic retrieved via issue API', {
            epicId: epic.id,
            epicKey: epic.key
          });

          return epic;
        }
      } catch (issueError) {
        this.logger.debug('Could not retrieve epic via issue API', {
          epicIdOrKey: params.epicIdOrKey,
          error: issueError instanceof Error ? issueError.message : 'Unknown error'
        });
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get epic details', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        epicIdOrKey: params.epicIdOrKey,
        boardId: params.boardId
      });
      return null;
    }
  }

  /**
   * Search epics across multiple boards
   * Enhanced method for cross-board epic search
   */
  async searchEpicsAcrossBoards(params: {
    boardIds: number[];
    query?: string;
    done?: boolean;
    maxResults?: number;
  }): Promise<{
    epics: Array<Epic & { boardId: number }>;
    searchMetadata: SearchMetadata;
  }> {
    const startTime = Date.now();
    this.logger.debug('Searching epics across multiple boards', { params });

    if (!params.boardIds || params.boardIds.length === 0) {
      throw new Error('At least one board ID is required');
    }

    const allEpics: Array<Epic & { boardId: number }> = [];
    const maxPerBoard = Math.ceil((params.maxResults || 50) / params.boardIds.length);

    try {
      // Search in parallel across all boards for better performance
      const searchPromises = params.boardIds.map(async boardId => {
        try {
          const result = await this.epicSearchAgile({
            boardId,
            ...(params.query && { query: params.query }),
            ...(params.done !== undefined && { done: params.done }),
            maxResults: maxPerBoard
          });

          return result.values.map(epic => ({
            ...epic,
            boardId
          }));
        } catch (error) {
          this.logger.warn('Failed to search epics in board', {
            boardId,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      
      // Flatten and deduplicate results
      const epicMap = new Map<string, Epic & { boardId: number }>();
      results.flat().forEach(epic => {
        // Use epic key as unique identifier, prefer first occurrence
        if (!epicMap.has(epic.key)) {
          epicMap.set(epic.key, epic);
        }
      });

      allEpics.push(...epicMap.values());

      // Sort by epic key for consistent ordering
      allEpics.sort((a, b) => a.key.localeCompare(b.key));

      // Apply final limit
      const limitedEpics = allEpics.slice(0, params.maxResults || 50);

      const searchTime = Date.now() - startTime;
      const metadata: SearchMetadata = {
        searchTime,
        resultCount: limitedEpics.length,
        totalAvailable: allEpics.length,
        searchMode: 'cross-board-epic-search',
        optimizations: ['parallel-search', 'deduplication', 'result-limiting']
      };

      this.logger.info('Cross-board epic search completed', {
        boardCount: params.boardIds.length,
        totalEpics: allEpics.length,
        returnedEpics: limitedEpics.length,
        searchTime,
        hasQuery: !!params.query
      });

      return {
        epics: limitedEpics,
        searchMetadata: metadata
      };
    } catch (error) {
      this.logger.error('Cross-board epic search failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        boardIds: params.boardIds,
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Get epic issues (stories belonging to epic)
   * Enhanced method to get all issues in an epic
   */
  async getEpicIssues(params: {
    epicKey: string;
    boardId?: number;
    maxResults?: number;
    fields?: string[];
  }): Promise<{
    issues: any[];
    total: number;
    epicInfo: Epic | null;
  }> {
    this.logger.debug('Getting epic issues', { params });

    try {
      // Get epic details first
      const epicInfo = params.boardId ? 
        await this.getEpicDetails({ epicIdOrKey: params.epicKey, boardId: params.boardId }) :
        await this.getEpicDetails({ epicIdOrKey: params.epicKey });

      // Search for issues belonging to this epic
      // Using JQL to find issues with this epic
      const jql = `"Epic Link" = "${params.epicKey}"`;
      
      const searchResponse = await this.apiClient.request<any>(
        '/rest/api/2/search',
        {
          method: 'GET',
          queryParams: {
            jql,
            maxResults: params.maxResults || 100,
            fields: params.fields?.join(',') || 'key,summary,status,assignee,issuetype'
          }
        }
      );

      this.logger.info('Epic issues retrieved successfully', {
        epicKey: params.epicKey,
        issuesCount: searchResponse.data.issues.length,
        total: searchResponse.data.total
      });

      return {
        issues: searchResponse.data.issues,
        total: searchResponse.data.total,
        epicInfo
      };
    } catch (error) {
      this.logger.error('Failed to get epic issues', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        epicKey: params.epicKey,
        boardId: params.boardId
      });
      throw error;
    }
  }

  /**
   * Get epic statistics and metrics
   */
  async getEpicStats(params: {
    epicKey: string;
    boardId?: number;
  }): Promise<{
    epicKey: string;
    name: string;
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    todoIssues: number;
    storyPoints?: number;
    completionPercentage: number;
    estimatedCompletion?: string;
  }> {
    this.logger.debug('Getting epic statistics', { params });

    try {
      const epicIssues = await this.getEpicIssues({
        epicKey: params.epicKey,
        ...(params.boardId && { boardId: params.boardId }),
        maxResults: 1000,
        fields: ['status', 'customfield_10002'] // status + story points
      });

      const epic = epicIssues.epicInfo;
      if (!epic) {
        throw new Error(`Epic ${params.epicKey} not found`);
      }

      // Categorize issues by status
      let completedIssues = 0;
      let inProgressIssues = 0;
      let todoIssues = 0;
      let totalStoryPoints = 0;

      epicIssues.issues.forEach(issue => {
        const statusCategory = issue.fields.status.statusCategory?.key;
        
        switch (statusCategory) {
          case 'done':
            completedIssues++;
            break;
          case 'indeterminate':
            inProgressIssues++;
            break;
          default:
            todoIssues++;
        }

        // Add story points if available
        const storyPoints = issue.fields.customfield_10002;
        if (typeof storyPoints === 'number') {
          totalStoryPoints += storyPoints;
        }
      });

      const totalIssues = epicIssues.total;
      const completionPercentage = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

      const stats = {
        epicKey: params.epicKey,
        name: epic.name,
        totalIssues,
        completedIssues,
        inProgressIssues,
        todoIssues,
        ...(totalStoryPoints > 0 && { storyPoints: totalStoryPoints }),
        completionPercentage: Math.round(completionPercentage * 100) / 100
      };

      this.logger.info('Epic statistics calculated', {
        epicKey: params.epicKey,
        completion: `${stats.completionPercentage}%`,
        totalIssues: stats.totalIssues,
        storyPoints: stats.storyPoints
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get epic statistics', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        epicKey: params.epicKey,
        boardId: params.boardId
      });
      throw error;
    }
  }
}