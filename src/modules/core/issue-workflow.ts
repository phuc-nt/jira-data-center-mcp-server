/**
 * Issue Workflow Management for Core Module
 * Handles issue transitions and workflow operations using Data Center API v2/latest
 * HIGH COMPATIBILITY - Version change only from Cloud to DC
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  Transition,
  TransitionsResponse,
  TransitionIssueParams
} from './types.js';
import { logger } from '../../utils/logger.js';

export class IssueWorkflowManager {
  private readonly logger = logger.child('IssueWorkflowManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('IssueWorkflowManager initialized');
  }

  /**
   * Get available transitions for an issue
   * Tool: getIssueTransitions
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/transitions
   * Compatibility: HIGH - Version change only (v3 → v2)
   */
  async getIssueTransitions(params: {
    issueIdOrKey: string;
    transitionId?: string;
    expand?: string[];
    skipRemoteOnlyCondition?: boolean;
  }): Promise<TransitionsResponse> {
    this.logger.debug('Getting issue transitions', { params });

    if (!params.issueIdOrKey || params.issueIdOrKey.trim().length === 0) {
      throw new Error('Issue ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.transitionId) {
      queryParams.transitionId = params.transitionId;
    }

    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.skipRemoteOnlyCondition !== undefined) {
      queryParams.skipRemoteOnlyCondition = params.skipRemoteOnlyCondition;
    }

    try {
      const response = await this.apiClient.request<TransitionsResponse>(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/transitions`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Issue transitions retrieved successfully', {
        issueIdOrKey: params.issueIdOrKey,
        transitionsCount: response.data.transitions.length,
        availableTransitions: response.data.transitions.map(t => ({
          id: t.id,
          name: t.name,
          toStatus: t.to.name
        }))
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get issue transitions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Transition issue to new status
   * Tool: transitionIssue
   * Endpoint: /rest/api/2/issue/{issueIdOrKey}/transitions
   * Compatibility: HIGH - Version change only (v3 → v2)
   */
  async transitionIssue(params: {
    issueIdOrKey: string;
    transition: TransitionIssueParams;
    expand?: string[];
  }): Promise<void> {
    this.logger.debug('Transitioning issue (DC format)', { 
      issueIdOrKey: params.issueIdOrKey,
      transitionId: params.transition.transition.id,
      hasFields: !!params.transition.fields,
      hasUpdate: !!params.transition.update
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

    if (!params.transition.transition?.id) {
      const error = {
        status: 400,
        message: 'Transition ID is required',
        errorMessages: ['Missing required parameter: transition.transition.id'],
        errors: {}
      };
      this.logger.error('Missing transition ID', error);
      throw new Error(`HTTP 400: ${JSON.stringify(error, null, 2)}`);
    }

    // FOR DC: Ensure transition ID is string format
    const transitionId = params.transition.transition.id.toString();

    // Validate transition is available
    await this.validateTransition(params.issueIdOrKey, transitionId);

    // Process fields for DC format if needed
    let processedFields;
    if (params.transition.fields) {
      processedFields = await this.processTransitionFields(params.transition.fields);
    }

    // FOR DC: Use proper request body format with string transition ID
    const requestBody: TransitionIssueParams = {
      transition: {
        id: transitionId // Ensure string format for DC
      },
      fields: processedFields,
      update: params.transition.update,
      historyMetadata: params.transition.historyMetadata,
      properties: params.transition.properties
    };

    const queryParams: Record<string, unknown> = {};
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    try {
      await this.apiClient.request(
        `/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/transitions`,
        {
          method: 'POST',
          body: requestBody,
          queryParams
        }
      );

      this.logger.info('Issue transitioned successfully (DC format)', {
        issueIdOrKey: params.issueIdOrKey,
        transitionId: transitionId,
        fieldsUpdated: processedFields ? Object.keys(processedFields) : [],
        dcFormat: 'Used string transition ID for DC compatibility'
      });
    } catch (error: any) {
      // Enhanced error handling for DC transitions
      const errorDetails = {
        endpoint: `/rest/api/2/issue/${params.issueIdOrKey}/transitions`,
        requestBody,
        queryParams,
        originalError: error instanceof Error ? error.message : 'Unknown error',
        dcGuidance: 'Jira DC requires string transition ID and proper field validation'
      };

      this.logger.error('Failed to transition issue - DC API issue', errorDetails);

      const dcError = {
        status: 400,
        message: 'Cannot transition issue in Jira Data Center',
        errorMessages: [
          `Failed to transition issue '${params.issueIdOrKey}' using transition ID '${transitionId}'`,
          'Verify the transition is available for the current issue status',
          'Check if your PAT token has \"Transition issues\" permission',
          'Ensure required fields are provided for the transition'
        ],
        errors: {
          transition: `Transition '${transitionId}' may not be available for current status`,
          permission: 'May lack \"Transition issues\" permission',
          requiredFields: 'Some transitions require additional fields (resolution, comment, etc.)'
        },
        troubleshooting: {
          permissions: 'Ensure PAT has \"Transition issues\" permission',
          transitionValidation: 'Use getIssueTransitions to check available transitions first',
          requiredFields: 'Check transition.fields for required fields when getting transitions',
          fieldValidation: 'Ensure all required fields are provided with valid values',
          dcFormat: 'DC API requires: { \"transition\": { \"id\": \"21\" } } with string ID'
        },
        dcSolution: 'Use transitionIssue({ issueIdOrKey: \"ISSUE-123\", transition: { transition: { id: \"21\" }, fields: { resolution: { name: \"Fixed\" } } } })'
      };
      throw new Error(`HTTP 400: ${JSON.stringify(dcError, null, 2)}`);
    }
  }

  /**
   * Get specific transition details
   * Utility method for transition validation and metadata
   */
  async getTransition(params: {
    issueIdOrKey: string;
    transitionId: string;
  }): Promise<Transition | null> {
    this.logger.debug('Getting specific transition', { params });

    try {
      const response = await this.getIssueTransitions({
        issueIdOrKey: params.issueIdOrKey,
        transitionId: params.transitionId,
        expand: ['fields', 'screenIds']
      });

      const transition = response.transitions.find(t => t.id === params.transitionId);
      
      if (transition) {
        this.logger.debug('Transition found', {
          transitionId: transition.id,
          transitionName: transition.name,
          toStatus: transition.to.name,
          hasScreen: transition.hasScreen
        });
      }

      return transition || null;
    } catch (error) {
      this.logger.error('Failed to get specific transition', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey,
        transitionId: params.transitionId
      });
      return null;
    }
  }

  /**
   * Validate if transition is available for issue
   * Prevents invalid transition attempts
   */
  async validateTransition(issueIdOrKey: string, transitionId: string): Promise<boolean> {
    this.logger.debug('Validating transition availability', { issueIdOrKey, transitionId });

    try {
      const transitions = await this.getIssueTransitions({ issueIdOrKey });
      const isAvailable = transitions.transitions.some(t => t.id === transitionId);

      if (!isAvailable) {
        const availableIds = transitions.transitions.map(t => t.id);
        throw new Error(
          `Transition ${transitionId} is not available for issue ${issueIdOrKey}. ` +
          `Available transitions: ${availableIds.join(', ')}`
        );
      }

      this.logger.debug('Transition validated successfully', {
        issueIdOrKey,
        transitionId,
        isAvailable
      });

      return true;
    } catch (error) {
      this.logger.error('Transition validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey,
        transitionId
      });
      throw error;
    }
  }

  /**
   * Get workflow steps and available actions
   * Utility method for workflow analysis
   */
  async getWorkflowSteps(issueIdOrKey: string): Promise<{
    currentStatus: string;
    availableTransitions: Array<{
      id: string;
      name: string;
      toStatus: string;
      hasScreen: boolean;
      requiredFields: string[];
    }>;
  }> {
    this.logger.debug('Getting workflow steps', { issueIdOrKey });

    try {
      const response = await this.getIssueTransitions({
        issueIdOrKey,
        expand: ['fields']
      });

      const transitions = response.transitions.map(transition => ({
        id: transition.id,
        name: transition.name,
        toStatus: transition.to.name,
        hasScreen: transition.hasScreen || false,
        requiredFields: transition.fields ? 
          Object.entries(transition.fields)
            .filter(([_, field]) => field.required)
            .map(([fieldId, _]) => fieldId) : []
      }));

      // Get current status from first transition's context
      const currentStatus = transitions.length > 0 ? 
        'Unknown' : // Would need to get issue details for accurate current status
        'Unknown';

      return {
        currentStatus,
        availableTransitions: transitions
      };
    } catch (error) {
      this.logger.error('Failed to get workflow steps', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey
      });
      throw error;
    }
  }

  /**
   * Execute transition with field validation
   * Enhanced method with pre-transition validation
   */
  async executeTransitionSafely(params: {
    issueIdOrKey: string;
    transitionId: string;
    fields?: Record<string, unknown>;
    validateFields?: boolean;
  }): Promise<{
    success: boolean;
    transitionExecuted: boolean;
    validationErrors?: string[];
  }> {
    this.logger.debug('Executing transition safely', { params });

    try {
      // Get transition details for validation
      const transition = await this.getTransition({
        issueIdOrKey: params.issueIdOrKey,
        transitionId: params.transitionId
      });

      if (!transition) {
        return {
          success: false,
          transitionExecuted: false,
          validationErrors: [`Transition ${params.transitionId} not found or not available`]
        };
      }

      // Validate required fields if requested
      const validationErrors: string[] = [];
      if (params.validateFields && transition.fields) {
        for (const [fieldId, fieldMeta] of Object.entries(transition.fields)) {
          if (fieldMeta.required && (!params.fields || !params.fields[fieldId])) {
            validationErrors.push(`Required field '${fieldMeta.name}' (${fieldId}) is missing`);
          }
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          transitionExecuted: false,
          validationErrors
        };
      }

      // Execute transition
      await this.transitionIssue({
        issueIdOrKey: params.issueIdOrKey,
        transition: {
          transition: { id: params.transitionId },
          fields: params.fields
        }
      });

      return {
        success: true,
        transitionExecuted: true
      };
    } catch (error) {
      this.logger.error('Safe transition execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        issueIdOrKey: params.issueIdOrKey,
        transitionId: params.transitionId
      });

      return {
        success: false,
        transitionExecuted: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Process transition fields for DC format compatibility
   * Handles content format conversion and user resolution
   */
  private async processTransitionFields(fields: Record<string, unknown>): Promise<Record<string, unknown>> {
    const processedFields = { ...fields };

    // Process comment field if present
    if (processedFields.comment && typeof processedFields.comment === 'object') {
      const commentObj = processedFields.comment as any;
      if (commentObj.body) {
        commentObj.body = await this.processContentFormat(commentObj.body);
      }
    }

    // Process assignee field if present
    if (processedFields.assignee) {
      processedFields.assignee = await this.processUserField(processedFields.assignee);
    }

    return processedFields;
  }

  /**
   * Process content format for DC compatibility
   */
  private async processContentFormat(content: any): Promise<string> {
    if (typeof content === 'string') {
      return content;
    }

    try {
      return await this.apiClient.convertContent(content, { 
        targetFormat: 'wikimarkup',
        fallbackToPlaintext: true 
      });
    } catch (error) {
      this.logger.warn('Failed to convert content format in transition', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return String(content);
    }
  }

  /**
   * Process user field for DC compatibility
   */
  private async processUserField(userField: any): Promise<any> {
    if (!userField) return userField;

    const processedUser = { ...userField };

    if (processedUser.accountId && !processedUser.name) {
      try {
        const resolvedUser = await this.apiClient.resolveUser({ 
          accountId: processedUser.accountId 
        });
        if (resolvedUser?.name) {
          processedUser.name = resolvedUser.name;
        }
      } catch (error) {
        this.logger.debug('Could not resolve username for transition', {
          accountId: processedUser.accountId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return processedUser;
  }
}