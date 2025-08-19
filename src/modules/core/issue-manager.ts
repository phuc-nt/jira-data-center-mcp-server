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
   * Compatibility: FIXED - Simplified fields format for DC, proper validation
   */
  async updateIssue(params: {
    issueIdOrKey: string;
    update: UpdateIssueParams;
    notifyUsers?: boolean;
    overrideScreenSecurity?: boolean;
    overrideEditableFlag?: boolean;
  }): Promise<void> {
    this.logger.debug('Updating issue (DC format)', { 
      issueIdOrKey: params.issueIdOrKey,
      hasFields: !!params.update.fields,
      hasUpdate: !!params.update.update
    });

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

    if (!params.update.fields && !params.update.update) {
      const error = {
        status: 400,
        message: 'Either fields or update operations must be provided',
        errorMessages: ['No fields or update operations specified'],
        errors: {}
      };
      this.logger.error('No update data provided', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    // FOR DC: Use simplified fields format
    const requestBody: any = {};
    
    if (params.update.fields) {
      // Simple fields object for DC (no complex processing)
      requestBody.fields = params.update.fields;
    }
    
    if (params.update.update) {
      // Update operations for complex changes
      requestBody.update = params.update.update;
    }

    const queryParams: Record<string, unknown> = {};
    if (params.notifyUsers !== undefined) {
      queryParams.notifyUsers = params.notifyUsers;
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

      this.logger.info('Issue updated successfully (DC format)', {
        issueIdOrKey: params.issueIdOrKey,
        fieldsUpdated: requestBody.fields ? Object.keys(requestBody.fields) : [],
        updateOperations: requestBody.update ? Object.keys(requestBody.update) : [],
        dcFormat: 'Used simplified fields format for DC compatibility'
      });
    } catch (error: any) {
      // Enhanced error handling for DC issue updates
      const errorDetails = {
        endpoint: `/rest/api/2/issue/${params.issueIdOrKey}`,
        requestBody,
        queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires simplified fields format and proper permissions'
      };

      this.logger.error('Failed to update issue - DC API issue', errorDetails);

      const dcError = {
        status: 400,
        message: 'Cannot update issue in Jira Data Center',
        errorMessages: [
          `Failed to update issue '${params.issueIdOrKey}'`,
          'Verify the issue exists and is editable',
          'Check if your PAT token has "Edit issues" permission',
          'Ensure field values are valid for the issue type and project'
        ],
        errors: {
          issue: `Issue '${params.issueIdOrKey}' may not exist or not editable`,
          permission: 'May lack "Edit issues" permission',
          fields: 'Field values may be invalid or restricted'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Edit issues" permission',
          issueAccess: 'Verify the issue exists and you have edit access',
          fieldValidation: 'Check if all field values are valid for the issue type',
          requiredFields: 'Some field updates may require additional required fields',
          dcFormat: 'DC API prefers simple fields format: { "fields": { "summary": "new value" } }'
        },
        dcSolution: 'Use updateIssue with simple fields: { issueIdOrKey: "ISSUE-123", update: { fields: { summary: "Updated summary" } } }'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
    }
  }

  /**
   * Delete issue
   * Tool: deleteIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}
   * Compatibility: FIXED - Admin permission required, proper error handling
   */
  async deleteIssue(params: {
    issueIdOrKey: string;
    deleteSubtasks?: boolean;
  }): Promise<void> {
    this.logger.debug('Deleting issue (admin operation)', { params });

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
    // Default deleteSubtasks to true for DC compatibility
    queryParams.deleteSubtasks = params.deleteSubtasks !== undefined ? params.deleteSubtasks : true;

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}`,
        {
          method: 'DELETE',
          queryParams
        }
      );

      this.logger.info('Issue deleted successfully (admin operation)', {
        issueIdOrKey: params.issueIdOrKey,
        deleteSubtasks: queryParams.deleteSubtasks,
        dcFormat: 'Admin-level operation completed'
      });
    } catch (error: any) {
      // Enhanced error handling for DC delete operations
      const errorDetails = {
        endpoint: `/rest/api/2/issue/${params.issueIdOrKey}`,
        queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires admin permissions for issue deletion'
      };

      this.logger.error('Failed to delete issue - DC permission issue', errorDetails);

      // Check if it's a permission error (403)
      if (error.message && (error.message.includes('403') || error.message.includes('Forbidden'))) {
        const dcError = {
          status: 403,
          message: 'Insufficient permissions to delete issue in Jira Data Center',
          errorMessages: [
            `Cannot delete issue '${params.issueIdOrKey}' - admin permissions required`,
            'Delete Issues permission is restricted to Project Administrators or Jira Administrators',
            'Your PAT token does not have sufficient privileges for this operation',
            'Contact your Jira administrator to request admin-level PAT token'
          ],
          errors: {
            permission: 'Delete Issues permission required (Admin-only operation)',
            patToken: 'Current PAT token lacks admin privileges',
            issue: `Issue '${params.issueIdOrKey}' deletion not permitted`
          },
          troubleshooting: {
            permissionRequired: 'Delete Issues permission (Admin-only)',
            patUpgrade: 'Request admin-level PAT token from Jira administrator',
            alternativeSolution: 'Ask project admin to delete the issue manually',
            projectRole: 'Ensure you have Project Administrator role',
            systemRole: 'May require Jira Administrator role for some projects'
          },
          dcSolution: 'Contact Jira admin to: 1) Grant Delete Issues permission, 2) Provide admin-level PAT token'
        };
        throw new Error(`HTTP 403: ${JSON.stringify(dcError, null, 2)}`);
      }

      // Other errors (404, 400, etc.)
      const dcError = {
        status: 400,
        message: 'Cannot delete issue in Jira Data Center',
        errorMessages: [
          `Failed to delete issue '${params.issueIdOrKey}'`,
          'Verify the issue exists and is deletable',
          'Check if the issue has dependencies (links, subtasks) preventing deletion',
          'Ensure you have admin-level permissions'
        ],
        errors: {
          issue: `Issue '${params.issueIdOrKey}' may not exist or not deletable`,
          dependencies: 'Issue may have blocking dependencies',
          permission: 'Admin permissions required for deletion'
        },
        troubleshooting: {
          issueExists: 'Verify the issue key/ID exists in your DC instance',
          dependencies: 'Check for issue links or subtasks preventing deletion',
          permissions: 'Ensure admin-level PAT token with Delete Issues permission',
          deleteSubtasks: 'Set deleteSubtasks=true to handle subtask dependencies'
        },
        dcSolution: 'Use admin PAT token and verify issue exists: deleteIssue({ issueIdOrKey: "ISSUE-123", deleteSubtasks: true })'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
    }
  }

  /**
   * Assign issue to user
   * Tool: assignIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/assignee
   * Compatibility: FIXED - Use name field only for DC (accountId not supported)
   */
  async assignIssue(params: {
    issueIdOrKey: string;
    assignee: AssignIssueParams;
  }): Promise<void> {
    this.logger.debug('Assigning issue (DC format)', { 
      issueIdOrKey: params.issueIdOrKey,
      assignee: params.assignee
    });

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

    if (!params.assignee.accountId && !params.assignee.name) {
      const error = {
        status: 400,
        message: 'Assignee information required',
        errorMessages: ['Either accountId or username (name) must be provided for assignee'],
        errors: {}
      };
      this.logger.error('Missing assignee information', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    // FOR DC: Use name field only (accountId not supported in most DC versions)
    const requestBody: any = {};
    
    if (params.assignee.name) {
      requestBody.name = params.assignee.name;
    } else if (params.assignee.accountId) {
      // Convert accountId to name if possible, but prefer name
      requestBody.name = params.assignee.accountId; // Fallback attempt
      this.logger.warn('Using accountId as name fallback for DC compatibility', {
        accountId: params.assignee.accountId
      });
    }

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/assignee`,
        {
          method: 'PUT',
          body: requestBody
        }
      );

      this.logger.info('Issue assigned successfully (DC format)', {
        issueIdOrKey: params.issueIdOrKey,
        assigneeName: requestBody.name,
        dcFormat: 'Used name field for DC compatibility'
      });
    } catch (error: any) {
      // Enhanced error handling for DC assignment
      const errorDetails = {
        endpoint: `/rest/api/2/issue/${params.issueIdOrKey}/assignee`,
        requestBody,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires name field (username) for issue assignment'
      };

      this.logger.error('Failed to assign issue - DC API issue', errorDetails);

      const dcError = {
        status: 400,
        message: 'Cannot assign issue in Jira Data Center',
        errorMessages: [
          `Failed to assign issue '${params.issueIdOrKey}' to user '${requestBody.name}'`,
          'Verify the username exists and is active in your Jira Data Center instance',
          'Check if your PAT token has "Assign issues" permission',
          'Ensure the user has appropriate permissions in the project'
        ],
        errors: {
          assignee: `User '${requestBody.name}' may not exist or not assignable`,
          permission: 'May lack "Assign issues" permission',
          issueKey: `Issue '${params.issueIdOrKey}' may not exist or not accessible`
        },
        troubleshooting: {
          permissions: 'Ensure PAT has "Assign issues" permission',
          userValidation: 'Verify the username exists in your DC instance',
          projectAccess: 'Check if user has access to the project',
          issueAccess: 'Verify the issue exists and is editable',
          dcFormat: 'DC API requires: { "name": "username" } format'
        },
        dcSolution: 'Use assignIssue({ issueIdOrKey: "ISSUE-123", assignee: { name: "username" } })'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
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