/**
 * Sprint Management for Agile Module
 * Handles all sprint-related operations using Agile API v1.0
 * HIGH COMPATIBILITY - No changes needed from Cloud to Data Center
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  Sprint, 
  SprintListParams, 
  SprintListResponse,
  IssueListParams,
  IssueListResponse,
  CreateSprintParams,
  UpdateSprintParams
} from './types.js';
import { logger } from '../../utils/logger.js';

export class SprintManager {
  private readonly logger = logger.child('SprintManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('SprintManager initialized');
  }

  /**
   * List sprints for board
   * Tool: listSprints
   * Endpoint: /rest/agile/1.0/board/{boardId}/sprint
   * Compatibility: HIGH - No changes from Cloud
   */
  async listSprints(params: SprintListParams): Promise<SprintListResponse> {
    this.logger.debug('Listing sprints', { params });

    const { boardId, ...queryParamsObj } = params;

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
    }

    const queryParams: Record<string, unknown> = {};
    if (queryParamsObj.state) queryParams.state = queryParamsObj.state;
    if (queryParamsObj.startAt !== undefined) queryParams.startAt = queryParamsObj.startAt;
    if (queryParamsObj.maxResults !== undefined) queryParams.maxResults = queryParamsObj.maxResults;

    try {
      const response = await this.apiClient.request<SprintListResponse>(
        `/rest/agile/1.0/board/${boardId}/sprint`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Sprints listed successfully', {
        boardId,
        total: response.data.total,
        returned: response.data.values.length,
        state: params.state
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to list sprints', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId,
        state: params.state
      });
      throw error;
    }
  }

  /**
   * Get sprint details by ID
   * Tool: getSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}
   * Compatibility: HIGH - No changes from Cloud
   */
  async getSprint(sprintId: number): Promise<Sprint> {
    this.logger.debug('Getting sprint details', { sprintId });

    if (!sprintId || sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    try {
      const response = await this.apiClient.request<Sprint>(
        `/rest/agile/1.0/sprint/${sprintId}`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Sprint retrieved successfully', {
        sprintId,
        sprintName: response.data.name,
        sprintState: response.data.state
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId
      });
      throw error;
    }
  }

  /**
   * Get issues in sprint
   * Tool: getSprintIssues
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async getSprintIssues(params: IssueListParams & { sprintId: number }): Promise<IssueListResponse> {
    this.logger.debug('Getting sprint issues', { params });

    const { sprintId, ...queryParamsObj } = params;

    if (!sprintId || sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    const queryParams: Record<string, unknown> = {};
    if (queryParamsObj.jql) queryParams.jql = queryParamsObj.jql;
    if (queryParamsObj.validateQuery !== undefined) queryParams.validateQuery = queryParamsObj.validateQuery;
    if (queryParamsObj.fields) queryParams.fields = queryParamsObj.fields.join(',');
    if (queryParamsObj.expand) queryParams.expand = queryParamsObj.expand.join(',');
    if (queryParamsObj.startAt !== undefined) queryParams.startAt = queryParamsObj.startAt;
    if (queryParamsObj.maxResults !== undefined) queryParams.maxResults = queryParamsObj.maxResults;

    try {
      const response = await this.apiClient.request<IssueListResponse>(
        `/rest/agile/1.0/sprint/${sprintId}/issue`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Sprint issues retrieved successfully', {
        sprintId,
        total: response.data.total,
        returned: response.data.issues.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get sprint issues', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId,
        jql: params.jql
      });
      throw error;
    }
  }

  /**
   * Create new sprint
   * Tool: createSprint
   * Endpoint: /rest/agile/1.0/sprint
   * Compatibility: HIGH - No changes from Cloud
   */
  async createSprint(params: CreateSprintParams): Promise<Sprint> {
    this.logger.debug('Creating sprint', { params: { ...params, boardId: params.boardId } });

    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Sprint name is required');
    }

    if (!params.boardId || params.boardId <= 0) {
      throw new Error('Valid board ID is required');
    }

    const requestBody: Record<string, unknown> = {
      name: params.name.trim(),
      originBoardId: params.boardId
    };

    if (params.goal) requestBody.goal = params.goal.trim();
    if (params.startDate) requestBody.startDate = params.startDate;
    if (params.endDate) requestBody.endDate = params.endDate;

    try {
      const response = await this.apiClient.request<Sprint>(
        '/rest/agile/1.0/sprint',
        {
          method: 'POST',
          body: requestBody
        }
      );

      this.logger.info('Sprint created successfully', {
        sprintId: response.data.id,
        sprintName: response.data.name,
        boardId: params.boardId
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintName: params.name,
        boardId: params.boardId
      });
      throw error;
    }
  }

  /**
   * Start sprint
   * Tool: startSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}
   * Compatibility: HIGH - No changes from Cloud
   */
  async startSprint(params: {
    sprintId: number;
    startDate: string;
    endDate: string;
    goal?: string;
  }): Promise<Sprint> {
    this.logger.debug('Starting sprint', { params });

    if (!params.sprintId || params.sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    if (!params.startDate || !params.endDate) {
      throw new Error('Start date and end date are required');
    }

    // Validate dates
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format provided');
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const requestBody: UpdateSprintParams = {
      id: params.sprintId,
      state: 'active',
      startDate: params.startDate,
      endDate: params.endDate
    };

    if (params.goal) {
      requestBody.goal = params.goal.trim();
    }

    try {
      const response = await this.apiClient.request<Sprint>(
        `/rest/agile/1.0/sprint/${params.sprintId}`,
        {
          method: 'PUT',
          body: requestBody
        }
      );

      this.logger.info('Sprint started successfully', {
        sprintId: params.sprintId,
        sprintName: response.data.name,
        startDate: params.startDate,
        endDate: params.endDate
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to start sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId: params.sprintId
      });
      throw error;
    }
  }

  /**
   * Close sprint
   * Tool: closeSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}
   * Compatibility: HIGH - No changes from Cloud
   */
  async closeSprint(sprintId: number): Promise<Sprint> {
    this.logger.debug('Closing sprint', { sprintId });

    if (!sprintId || sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    // Get current sprint to validate it can be closed
    const currentSprint = await this.getSprint(sprintId);
    
    if (currentSprint.state !== 'active') {
      throw new Error(`Sprint cannot be closed. Current state: ${currentSprint.state}`);
    }

    const requestBody: UpdateSprintParams = {
      id: sprintId,
      state: 'closed',
      completeDate: new Date().toISOString()
    };

    try {
      const response = await this.apiClient.request<Sprint>(
        `/rest/agile/1.0/sprint/${sprintId}`,
        {
          method: 'PUT',
          body: requestBody
        }
      );

      this.logger.info('Sprint closed successfully', {
        sprintId,
        sprintName: response.data.name,
        completeDate: response.data.completeDate
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to close sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId
      });
      throw error;
    }
  }

  /**
   * Update sprint details (utility method)
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}
   * Compatibility: HIGH - No changes from Cloud
   */
  async updateSprint(params: UpdateSprintParams): Promise<Sprint> {
    this.logger.debug('Updating sprint', { params });

    if (!params.id || params.id <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    // Remove id from request body (it's in the URL)
    const { id, ...requestBody } = params;

    try {
      const response = await this.apiClient.request<Sprint>(
        `/rest/agile/1.0/sprint/${id}`,
        {
          method: 'PUT',
          body: requestBody
        }
      );

      this.logger.info('Sprint updated successfully', {
        sprintId: id,
        sprintName: response.data.name,
        updatedFields: Object.keys(requestBody)
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to update sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId: id
      });
      throw error;
    }
  }

  /**
   * Delete sprint (utility method)
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}
   * Compatibility: HIGH - No changes from Cloud
   * Note: Only future sprints can be deleted
   */
  async deleteSprint(sprintId: number): Promise<void> {
    this.logger.debug('Deleting sprint', { sprintId });

    if (!sprintId || sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    // Validate sprint can be deleted
    const sprint = await this.getSprint(sprintId);
    
    if (sprint.state !== 'future') {
      throw new Error(`Sprint cannot be deleted. Only future sprints can be deleted. Current state: ${sprint.state}`);
    }

    try {
      await this.apiClient.request(
        `/rest/agile/1.0/sprint/${sprintId}`,
        {
          method: 'DELETE'
        }
      );

      this.logger.info('Sprint deleted successfully', {
        sprintId,
        sprintName: sprint.name
      });
    } catch (error) {
      this.logger.error('Failed to delete sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId
      });
      throw error;
    }
  }

  /**
   * Get sprint velocity and metrics (utility method)
   */
  async getSprintMetrics(sprintId: number): Promise<{
    sprintId: number;
    name: string;
    state: string;
    duration?: number; // in days
    issuesCount?: number;
    completedIssuesCount?: number;
    startDate?: string;
    endDate?: string;
    completeDate?: string;
  }> {
    const sprint = await this.getSprint(sprintId);
    
    let duration: number | undefined;
    if (sprint.startDate && sprint.endDate) {
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    let issuesCount: number | undefined;
    let completedIssuesCount: number | undefined;

    try {
      const issues = await this.getSprintIssues({ 
        sprintId, 
        maxResults: 1000 // Get all issues for accurate count
      });
      
      issuesCount = issues.total;
      completedIssuesCount = issues.issues.filter(issue => 
        issue.fields.status.statusCategory.key === 'done'
      ).length;
    } catch (error) {
      this.logger.warn('Could not retrieve sprint issues for metrics', {
        sprintId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return {
      sprintId: sprint.id,
      name: sprint.name,
      state: sprint.state,
      duration,
      issuesCount,
      completedIssuesCount,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      completeDate: sprint.completeDate
    };
  }

  /**
   * Validate sprint state transition
   */
  validateStateTransition(currentState: string, newState: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'future': ['active'],
      'active': ['closed'],
      'closed': [] // Cannot transition from closed
    };

    return validTransitions[currentState]?.includes(newState) ?? false;
  }
}