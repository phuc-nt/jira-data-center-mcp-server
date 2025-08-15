/**
 * Issue Operations for Agile Module
 * Handles agile-specific issue operations using Agile API v1.0
 * HIGH COMPATIBILITY - No changes needed from Cloud to Data Center
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { BacklogConfig } from './types.js';
import { logger } from '../../utils/logger.js';

export class IssueOperations {
  private readonly logger = logger.child('IssueOperations');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('IssueOperations initialized');
  }

  /**
   * Add issue to sprint
   * Tool: addIssueToSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async addIssueToSprint(params: {
    sprintId: number;
    issueIdOrKey: string;
  }): Promise<void> {
    this.logger.debug('Adding issue to sprint', { params });

    if (!params.sprintId || params.sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    const requestBody = {
      issues: [params.issueIdOrKey.trim()]
    };

    try {
      await this.apiClient.request(
        `/rest/agile/1.0/sprint/${params.sprintId}/issue`,
        {
          method: 'POST',
          body: requestBody
        }
      );

      this.logger.info('Issue added to sprint successfully', {
        sprintId: params.sprintId,
        issueKey: params.issueIdOrKey
      });
    } catch (error) {
      this.logger.error('Failed to add issue to sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId: params.sprintId,
        issueKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Add multiple issues to sprint
   * Utility method for batch operations
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async addIssuesToSprint(params: {
    sprintId: number;
    issueIdOrKeys: string[];
  }): Promise<void> {
    this.logger.debug('Adding multiple issues to sprint', { params });

    if (!params.sprintId || params.sprintId <= 0) {
      throw new Error('Invalid sprint ID provided');
    }

    if (!params.issueIdOrKeys || params.issueIdOrKeys.length === 0) {
      throw new Error('At least one issue ID or key is required');
    }

    // Filter out empty strings and trim
    const issues = params.issueIdOrKeys
      .map(issue => issue.trim())
      .filter(issue => issue.length > 0);

    if (issues.length === 0) {
      throw new Error('No valid issue IDs or keys provided');
    }

    const requestBody = {
      issues: issues
    };

    try {
      await this.apiClient.request(
        `/rest/agile/1.0/sprint/${params.sprintId}/issue`,
        {
          method: 'POST',
          body: requestBody
        }
      );

      this.logger.info('Issues added to sprint successfully', {
        sprintId: params.sprintId,
        issuesCount: issues.length,
        issues: issues
      });
    } catch (error) {
      this.logger.error('Failed to add issues to sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sprintId: params.sprintId,
        issuesCount: issues.length
      });
      throw error;
    }
  }

  /**
   * Add issues to backlog
   * Tool: addIssuesToBacklog
   * Endpoint: /rest/agile/1.0/backlog/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async addIssuesToBacklog(params: {
    issues: string[];
    rankBeforeIssue?: string;
    rankAfterIssue?: string;
    rankCustomFieldId?: number;
  }): Promise<void> {
    this.logger.debug('Adding issues to backlog', { params });

    if (!params.issues || params.issues.length === 0) {
      throw new Error('At least one issue ID or key is required');
    }

    // Filter out empty strings and trim
    const issues = params.issues
      .map(issue => issue.trim())
      .filter(issue => issue.length > 0);

    if (issues.length === 0) {
      throw new Error('No valid issue IDs or keys provided');
    }

    const requestBody: BacklogConfig = {
      issueIdOrKeys: issues
    };

    // Add ranking options if provided
    if (params.rankBeforeIssue) {
      requestBody.rankBeforeIssue = params.rankBeforeIssue.trim();
    }

    if (params.rankAfterIssue) {
      requestBody.rankAfterIssue = params.rankAfterIssue.trim();
    }

    if (params.rankCustomFieldId) {
      requestBody.rankCustomFieldId = params.rankCustomFieldId;
    }

    // Validate ranking parameters
    if (requestBody.rankBeforeIssue && requestBody.rankAfterIssue) {
      throw new Error('Cannot specify both rankBeforeIssue and rankAfterIssue');
    }

    try {
      await this.apiClient.request(
        '/rest/agile/1.0/backlog/issue',
        {
          method: 'POST',
          body: requestBody
        }
      );

      this.logger.info('Issues added to backlog successfully', {
        issuesCount: issues.length,
        issues: issues,
        hasRanking: !!(params.rankBeforeIssue || params.rankAfterIssue)
      });
    } catch (error) {
      this.logger.error('Failed to add issues to backlog', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issuesCount: issues.length
      });
      throw error;
    }
  }

  /**
   * Remove issue from sprint (utility method)
   * Move issue back to backlog
   * Endpoint: /rest/agile/1.0/backlog/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async removeIssueFromSprint(params: {
    issueIdOrKey: string;
    rankBeforeIssue?: string;
    rankAfterIssue?: string;
  }): Promise<void> {
    this.logger.debug('Removing issue from sprint (moving to backlog)', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    // Moving to backlog removes from sprint
    await this.addIssuesToBacklog({
      issues: [params.issueIdOrKey],
      rankBeforeIssue: params.rankBeforeIssue,
      rankAfterIssue: params.rankAfterIssue
    });

    this.logger.info('Issue removed from sprint successfully', {
      issueKey: params.issueIdOrKey
    });
  }

  /**
   * Rank issue in backlog (utility method)
   * Endpoint: /rest/agile/1.0/backlog/issue
   * Compatibility: HIGH - No changes from Cloud
   */
  async rankIssueInBacklog(params: {
    issueIdOrKey: string;
    rankBeforeIssue?: string;
    rankAfterIssue?: string;
    rankCustomFieldId?: number;
  }): Promise<void> {
    this.logger.debug('Ranking issue in backlog', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    if (!params.rankBeforeIssue && !params.rankAfterIssue) {
      throw new Error('Either rankBeforeIssue or rankAfterIssue must be specified for ranking');
    }

    await this.addIssuesToBacklog({
      issues: [params.issueIdOrKey],
      rankBeforeIssue: params.rankBeforeIssue,
      rankAfterIssue: params.rankAfterIssue,
      rankCustomFieldId: params.rankCustomFieldId
    });

    this.logger.info('Issue ranked in backlog successfully', {
      issueKey: params.issueIdOrKey,
      rankBefore: params.rankBeforeIssue,
      rankAfter: params.rankAfterIssue
    });
  }

  /**
   * Move issues between sprints (utility method)
   * First removes from current sprint, then adds to target sprint
   */
  async moveIssuesToSprint(params: {
    issueIdOrKeys: string[];
    targetSprintId: number;
    removeFromCurrentSprint?: boolean;
  }): Promise<void> {
    this.logger.debug('Moving issues to sprint', { params });

    if (!params.issueIdOrKeys || params.issueIdOrKeys.length === 0) {
      throw new Error('At least one issue ID or key is required');
    }

    if (!params.targetSprintId || params.targetSprintId <= 0) {
      throw new Error('Invalid target sprint ID provided');
    }

    const issues = params.issueIdOrKeys
      .map(issue => issue.trim())
      .filter(issue => issue.length > 0);

    if (issues.length === 0) {
      throw new Error('No valid issue IDs or keys provided');
    }

    try {
      // If requested, remove from current sprint first (move to backlog)
      if (params.removeFromCurrentSprint) {
        this.logger.debug('Removing issues from current sprint');
        await this.addIssuesToBacklog({ issues });
      }

      // Add to target sprint
      this.logger.debug('Adding issues to target sprint');
      await this.addIssuesToSprint({
        sprintId: params.targetSprintId,
        issueIdOrKeys: issues
      });

      this.logger.info('Issues moved to sprint successfully', {
        targetSprintId: params.targetSprintId,
        issuesCount: issues.length,
        removedFromCurrent: params.removeFromCurrentSprint
      });
    } catch (error) {
      this.logger.error('Failed to move issues to sprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        targetSprintId: params.targetSprintId,
        issuesCount: issues.length
      });
      throw error;
    }
  }

  /**
   * Validate issue operations access
   */
  async validateIssueAccess(issueIdOrKey: string): Promise<{
    accessible: boolean;
    canEdit: boolean;
    reason?: string;
  }> {
    this.logger.debug('Validating issue access', { issueIdOrKey });

    try {
      // Try to access issue through agile API
      const response = await this.apiClient.request(
        `/rest/api/2/issue/${issueIdOrKey.trim()}`,
        {
          method: 'GET',
          queryParams: {
            fields: 'id,key,project'
          }
        }
      );

      return {
        accessible: true,
        canEdit: true // Assume can edit if can access
      };
    } catch (error) {
      return {
        accessible: false,
        canEdit: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get issue agile metadata (utility method)
   */
  async getIssueAgileInfo(issueIdOrKey: string): Promise<{
    issueKey: string;
    currentSprint?: number;
    epic?: string;
    storyPoints?: number;
    rank?: string;
  }> {
    this.logger.debug('Getting issue agile information', { issueIdOrKey });

    try {
      const response = await this.apiClient.request(
        `/rest/api/2/issue/${issueIdOrKey.trim()}`,
        {
          method: 'GET',
          queryParams: {
            fields: 'key,customfield_10014,customfield_10016,customfield_10020', // Common agile fields
            expand: 'names'
          }
        }
      );

      const issue = response.data;
      
      return {
        issueKey: issue.key,
        currentSprint: issue.fields.customfield_10014?.[0]?.id, // Sprint field
        epic: issue.fields.customfield_10014?.name, // Epic link
        storyPoints: issue.fields.customfield_10016, // Story points
        rank: issue.fields.customfield_10020 // Rank field
      };
    } catch (error) {
      this.logger.error('Failed to get issue agile information', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueKey: issueIdOrKey
      });
      throw error;
    }
  }
}