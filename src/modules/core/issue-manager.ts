/**
 * Issue Management for Core Module
 * Handles all issue CRUD operations using Data Center API v2/latest
 * MODERATE COMPATIBILITY - Content format changes and user resolution adaptations
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  Issue,
  CreateIssueParams,
  UpdateIssueParams,
  AssignIssueParams,
  AddCommentParams,
  Comment,
  CommentListResponse,
  ContentBlock
} from './types.js';
import { logger } from '../../utils/logger.js';

export class IssueManager {
  private readonly logger = logger.child('IssueManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('IssueManager initialized');
  }

  /**
   * Create new issue
   * Tool: createIssue
   * Endpoint: /rest/api/2/issue
   * Compatibility: MODERATE - Wiki Markup support for DC, content format conversion
   */
  async createIssue(params: CreateIssueParams): Promise<Issue> {
    this.logger.debug('Creating new issue', { 
      params: {
        project: params.fields.project.key,
        summary: params.fields.summary,
        issueType: params.fields.issuetype.id
      }
    });

    // Validate required fields
    if (!params.fields.project?.key) {
      throw new Error('Project key is required');
    }

    if (!params.fields.summary || params.fields.summary.trim().length === 0) {
      throw new Error('Issue summary is required');
    }

    if (!params.fields.issuetype?.id) {
      throw new Error('Issue type ID is required');
    }

    // Convert content format for DC if needed
    const processedFields = await this.processIssueFields(params.fields);

    const requestBody: CreateIssueParams = {
      fields: processedFields,
      update: params.update,
      historyMetadata: params.historyMetadata,
      properties: params.properties
    };

    try {
      const response = await this.apiClient.request<Issue>(
        '/rest/api/2/issue',
        {
          method: 'POST',
          body: requestBody
        }
      );

      this.logger.info('Issue created successfully', {
        issueId: response.data.id,
        issueKey: response.data.key,
        projectKey: params.fields.project.key,
        issueType: params.fields.issuetype.id
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to create issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectKey: params.fields.project.key,
        summary: params.fields.summary,
        issueType: params.fields.issuetype.id
      });
      throw error;
    }
  }

  /**
   * Update existing issue
   * Tool: updateIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}
   * Compatibility: MODERATE - Wiki Markup format, user resolution
   */
  async updateIssue(params: {
    issueIdOrKey: string;
    update: UpdateIssueParams;
    notifyUsers?: boolean;
    overrideScreenSecurity?: boolean;
    overrideEditableFlag?: boolean;
  }): Promise<void> {
    this.logger.debug('Updating issue', { 
      issueIdOrKey: params.issueIdOrKey,
      hasFields: !!params.update.fields,
      hasUpdate: !!params.update.update
    });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    // Process fields for DC format
    let processedFields;
    if (params.update.fields) {
      processedFields = await this.processIssueFields(params.update.fields);
    }

    const requestBody: UpdateIssueParams = {
      fields: processedFields,
      update: params.update.update,
      historyMetadata: params.update.historyMetadata,
      properties: params.update.properties
    };

    const queryParams: Record<string, unknown> = {};
    if (params.notifyUsers !== undefined) {
      queryParams.notifyUsers = params.notifyUsers;
    }
    if (params.overrideScreenSecurity !== undefined) {
      queryParams.overrideScreenSecurity = params.overrideScreenSecurity;
    }
    if (params.overrideEditableFlag !== undefined) {
      queryParams.overrideEditableFlag = params.overrideEditableFlag;
    }

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}`,
        {
          method: 'PUT',
          body: requestBody,
          queryParams
        }
      );

      this.logger.info('Issue updated successfully', {
        issueIdOrKey: params.issueIdOrKey,
        fieldsUpdated: processedFields ? Object.keys(processedFields) : [],
        notifyUsers: params.notifyUsers
      });
    } catch (error) {
      this.logger.error('Failed to update issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Delete issue
   * Tool: deleteIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}
   * Compatibility: HIGH - Version change only
   */
  async deleteIssue(params: {
    issueIdOrKey: string;
    deleteSubtasks?: boolean;
  }): Promise<void> {
    this.logger.debug('Deleting issue', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    if (params.deleteSubtasks !== undefined) {
      queryParams.deleteSubtasks = params.deleteSubtasks;
    }

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}`,
        {
          method: 'DELETE',
          queryParams
        }
      );

      this.logger.info('Issue deleted successfully', {
        issueIdOrKey: params.issueIdOrKey,
        deleteSubtasks: params.deleteSubtasks
      });
    } catch (error) {
      this.logger.error('Failed to delete issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Assign issue to user
   * Tool: assignIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/assignee
   * Compatibility: MODERATE - Username fallback for DC
   */
  async assignIssue(params: {
    issueIdOrKey: string;
    assignee: AssignIssueParams;
  }): Promise<void> {
    this.logger.debug('Assigning issue', { 
      issueIdOrKey: params.issueIdOrKey,
      assignee: params.assignee
    });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    if (!params.assignee.accountId && !params.assignee.name) {
      throw new Error('Either accountId or username (name) must be provided for assignee');
    }

    // DC supports both accountId and name (username) for backward compatibility
    const requestBody: AssignIssueParams = {};
    
    if (params.assignee.accountId) {
      requestBody.accountId = params.assignee.accountId;
    }
    
    // Include name for DC compatibility
    if (params.assignee.name) {
      requestBody.name = params.assignee.name;
    }

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/assignee`,
        {
          method: 'PUT',
          body: requestBody
        }
      );

      this.logger.info('Issue assigned successfully', {
        issueIdOrKey: params.issueIdOrKey,
        assigneeAccountId: params.assignee.accountId,
        assigneeName: params.assignee.name
      });
    } catch (error) {
      this.logger.error('Failed to assign issue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey,
        assignee: params.assignee
      });
      throw error;
    }
  }

  /**
   * Add comment to issue
   * Tool: addIssueComment
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/comment
   * Compatibility: HIGH - Wiki Markup native in DC
   */
  async addIssueComment(params: {
    issueIdOrKey: string;
    comment: AddCommentParams;
    expand?: string[];
  }): Promise<Comment> {
    this.logger.debug('Adding comment to issue', { 
      issueIdOrKey: params.issueIdOrKey,
      hasVisibility: !!params.comment.visibility
    });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    if (!params.comment.body) {
      throw new Error('Comment body is required');
    }

    // Convert content format for DC if needed
    const processedBody = await this.processContentFormat(params.comment.body);

    const requestBody: AddCommentParams = {
      body: processedBody,
      visibility: params.comment.visibility,
      properties: params.comment.properties
    };

    const queryParams: Record<string, unknown> = {};
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    try {
      const response = await this.apiClient.request<Comment>(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/comment`,
        {
          method: 'POST',
          body: requestBody,
          queryParams
        }
      );

      this.logger.info('Comment added successfully', {
        issueIdOrKey: params.issueIdOrKey,
        commentId: response.data.id,
        author: response.data.author.displayName,
        hasVisibility: !!params.comment.visibility
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to add comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Get issue comments
   * Tool: getIssueComments
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/comment
   * Compatibility: HIGH - Version change only
   */
  async getIssueComments(params: {
    issueIdOrKey: string;
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    expand?: string[];
  }): Promise<CommentListResponse> {
    this.logger.debug('Getting issue comments', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    if (params.maxResults !== undefined) {
      queryParams.maxResults = params.maxResults;
    }

    if (params.orderBy) {
      queryParams.orderBy = params.orderBy;
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    try {
      const response = await this.apiClient.request<CommentListResponse>(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/comment`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Issue comments retrieved successfully', {
        issueIdOrKey: params.issueIdOrKey,
        total: response.data.total,
        returned: response.data.comments.length,
        startAt: response.data.startAt
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get issue comments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Process issue fields for DC format compatibility
   * Handles content format conversion and user resolution
   */
  private async processIssueFields(fields: any): Promise<any> {
    const processedFields = { ...fields };

    // Convert description format if needed
    if (processedFields.description) {
      processedFields.description = await this.processContentFormat(processedFields.description);
    }

    // Convert environment format if needed
    if (processedFields.environment) {
      processedFields.environment = await this.processContentFormat(processedFields.environment);
    }

    // Process assignee for DC compatibility
    if (processedFields.assignee) {
      processedFields.assignee = await this.processUserField(processedFields.assignee);
    }

    // Process reporter for DC compatibility
    if (processedFields.reporter) {
      processedFields.reporter = await this.processUserField(processedFields.reporter);
    }

    return processedFields;
  }

  /**
   * Process content format for DC compatibility
   * DC prefers Wiki Markup, but can handle plain text
   */
  private async processContentFormat(content: string | ContentBlock): Promise<string> {
    if (typeof content === 'string') {
      return content; // Already in string format, good for DC
    }

    // Convert ADF to Wiki Markup or plain text for DC
    // This would use the content converter from the API client
    try {
      return await this.apiClient.convertContent(content, { 
        targetFormat: 'wikimarkup',
        fallbackToPlaintext: true 
      });
    } catch (error) {
      this.logger.warn('Failed to convert content format, using plain text fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to extracting text from ADF
      return this.extractTextFromADF(content);
    }
  }

  /**
   * Process user field for DC compatibility
   * Ensures both accountId and name (username) are included where possible
   */
  private async processUserField(userField: any): Promise<any> {
    if (!userField) return userField;

    const processedUser = { ...userField };

    // If only accountId provided, try to resolve username for DC compatibility
    if (processedUser.accountId && !processedUser.name) {
      try {
        // This would use the user resolution from the API client
        const resolvedUser = await this.apiClient.resolveUser({ 
          accountId: processedUser.accountId 
        });
        if (resolvedUser?.name) {
          processedUser.name = resolvedUser.name;
        }
      } catch (error) {
        this.logger.debug('Could not resolve username for accountId', {
          accountId: processedUser.accountId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return processedUser;
  }

  /**
   * Extract plain text from ADF content block
   * Simple fallback for content conversion
   */
  private extractTextFromADF(content: ContentBlock): string {
    const extractText = (nodes: any[]): string => {
      return nodes.map(node => {
        if (node.text) {
          return node.text;
        }
        if (node.content) {
          return extractText(node.content);
        }
        return '';
      }).join('');
    };

    if (content.content) {
      return extractText(content.content);
    }

    return '';
  }
}