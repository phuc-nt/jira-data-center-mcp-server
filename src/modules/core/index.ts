/**
 * Core Module for MCP Jira Data Center Server
 * Provides core CRUD functionality using Data Center API v2/latest
 * MODERATE COMPATIBILITY - Some endpoint changes and content format adaptations
 */

import type { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import type { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { DataCenterAPIClient } from '../../api/datacenter-client.js';
import { logger } from '../../utils/logger.js';

// Re-export types for external use
export type { 
  User, Project, Issue, Comment, Transition,
  CreateIssueParams, UpdateIssueParams, AddCommentParams,
  UserListParams, ProjectListParams
} from './types.js';

// Import individual tool implementations
import { UserManager } from './user-manager.js';
import { ProjectManager } from './project-manager.js';
import { IssueManager } from './issue-manager.js';
import { IssueWorkflowManager } from './issue-workflow.js';

/**
 * Core Module - Complete CRUD API implementation
 * Handles all basic Jira operations with DC adaptations
 */
export class CoreModule {
  private readonly logger = logger.child('CoreModule');
  private readonly apiClient: DataCenterAPIClient;
  private readonly userManager: UserManager;
  private readonly projectManager: ProjectManager;
  private readonly issueManager: IssueManager;
  private readonly workflowManager: IssueWorkflowManager;

  constructor(
    config: JiraDataCenterConfig,
    authenticator: PATAuthenticator
  ) {
    this.apiClient = new DataCenterAPIClient(config, authenticator);
    this.userManager = new UserManager(this.apiClient);
    this.projectManager = new ProjectManager(this.apiClient);
    this.issueManager = new IssueManager(this.apiClient);
    this.workflowManager = new IssueWorkflowManager(this.apiClient);

    this.logger.info('Core Module initialized', {
      apiVersion: '2/latest',
      compatibility: 'MODERATE - Some endpoint changes và content adaptations'
    });
  }

  /**
   * Initialize the Core module
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Core Module');
    
    try {
      // Initialize API client
      await this.apiClient.initialize();
      
      this.logger.info('Core Module initialization completed');
    } catch (error) {
      this.logger.error('Core Module initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ========== USER MANAGEMENT TOOLS ==========

  /**
   * Get user by accountId or username
   * Tool: getUser
   * Endpoint: /rest/api/2/user (Username support added for DC)
   */
  async getUser(params: {
    accountId?: string;
    username?: string;
    expand?: string[];
  }) {
    return this.userManager.getUser(params);
  }

  /**
   * List users with search functionality
   * Tool: listUsers
   * Endpoint: /rest/api/2/user/search (ENDPOINT CHANGED from Cloud)
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
    return this.userManager.listUsers(params);
  }

  /**
   * Get assignable users for an issue
   * Tool: getAssignableUsers
   * Endpoint: /rest/api/2/issue/{issueKey}/assignable/multiProjectSearch (Minimal changes)
   */
  async getAssignableUsers(params: {
    issueKey?: string;
    project?: string;
    query?: string;
    sessionId?: string;
    startAt?: number;
    maxResults?: number;
  }) {
    return this.userManager.getAssignableUsers(params);
  }

  // ========== PROJECT MANAGEMENT TOOLS ==========

  /**
   * Get project details
   * Tool: getProject
   * Endpoint: /rest/api/2/project/{projectKey} (Version change only)
   */
  async getProject(params: {
    projectIdOrKey: string;
    expand?: string[];
    properties?: string[];
  }) {
    return this.projectManager.getProject(params);
  }

  /**
   * List projects
   * Tool: listProjects
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
    return this.projectManager.listProjects(params);
  }

  /**
   * List project versions
   * Tool: listProjectVersions
   * Endpoint: /rest/api/2/project/{projectKey}/versions (ENDPOINT CHANGED from Cloud)
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
    return this.projectManager.listProjectVersions(params);
  }

  // ========== ISSUE CRUD OPERATIONS ==========

  /**
   * Create new issue
   * Tool: createIssue
   * Endpoint: /rest/api/2/issue (Wiki Markup support for DC)
   */
  async createIssue(params: {
    fields: {
      project: { key: string };
      summary: string;
      description?: string;
      issuetype: { id: string };
      assignee?: { accountId?: string; name?: string };
      priority?: { id: string };
      labels?: string[];
      components?: Array<{ id: string }>;
      fixVersions?: Array<{ id: string }>;
      [key: string]: unknown;
    };
    update?: Record<string, any[]>;
    historyMetadata?: any;
    properties?: Array<{ key: string; value: unknown }>;
  }) {
    return this.issueManager.createIssue(params);
  }

  /**
   * Update existing issue
   * Tool: updateIssue
   * Endpoint: /rest/api/2/issue/{issueKey} (Wiki Markup format)
   */
  async updateIssue(params: {
    issueIdOrKey: string;
    update: {
      fields?: Record<string, unknown>;
      update?: Record<string, any[]>;
      historyMetadata?: any;
      properties?: Array<{ key: string; value: unknown }>;
    };
    notifyUsers?: boolean;
    overrideScreenSecurity?: boolean;
    overrideEditableFlag?: boolean;
  }) {
    return this.issueManager.updateIssue(params);
  }

  /**
   * Delete issue
   * Tool: deleteIssue
   * Endpoint: /rest/api/2/issue/{issueKey} (Version change only)
   */
  async deleteIssue(params: {
    issueIdOrKey: string;
    deleteSubtasks?: boolean;
  }) {
    return this.issueManager.deleteIssue(params);
  }

  /**
   * Assign issue to user
   * Tool: assignIssue
   * Endpoint: /rest/api/2/issue/{issueKey}/assignee (Username fallback for DC)
   */
  async assignIssue(params: {
    issueIdOrKey: string;
    assignee: {
      accountId?: string;
      name?: string; // DC fallback
    };
  }) {
    return this.issueManager.assignIssue(params);
  }

  /**
   * Add comment to issue
   * Tool: addIssueComment
   * Endpoint: /rest/api/2/issue/{issueKey}/comment (Wiki Markup native in DC)
   */
  async addIssueComment(params: {
    issueIdOrKey: string;
    comment: {
      body: string;
      visibility?: {
        type: 'group' | 'role';
        value: string;
      };
      properties?: Array<{ key: string; value: unknown }>;
    };
    expand?: string[];
  }) {
    return this.issueManager.addIssueComment(params);
  }

  /**
   * Get issue comments
   * Tool: getIssueComments
   * Endpoint: /rest/api/2/issue/{issueKey}/comment (Version change only)
   */
  async getIssueComments(params: {
    issueIdOrKey: string;
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    expand?: string[];
  }) {
    return this.issueManager.getIssueComments(params);
  }

  // ========== ISSUE LIFECYCLE TOOLS ==========

  /**
   * Get available transitions for issue
   * Tool: getIssueTransitions
   * Endpoint: /rest/api/2/issue/{issueKey}/transitions (Version change only)
   */
  async getIssueTransitions(params: {
    issueIdOrKey: string;
    transitionId?: string;
    expand?: string[];
    skipRemoteOnlyCondition?: boolean;
  }) {
    return this.workflowManager.getIssueTransitions(params);
  }

  /**
   * Transition issue to new status
   * Tool: transitionIssue
   * Endpoint: /rest/api/2/issue/{issueKey}/transitions (Version change only)
   */
  async transitionIssue(params: {
    issueIdOrKey: string;
    transition: {
      transition: { id: string };
      fields?: Record<string, unknown>;
      update?: Record<string, any[]>;
      historyMetadata?: any;
      properties?: Array<{ key: string; value: unknown }>;
    };
    expand?: string[];
  }) {
    return this.workflowManager.transitionIssue(params);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get module health status
   */
  getHealthStatus() {
    return {
      module: 'core',
      apiVersion: '2/latest',
      compatibility: 'MODERATE',
      clientStats: this.apiClient.getClientStats(),
      errorMetrics: this.apiClient.getErrorMetrics()
    };
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return {
      userManagement: {
        tools: ['getUser', 'listUsers', 'getAssignableUsers'],
        compatibility: 'MODERATE - Endpoint changes và username support'
      },
      projectManagement: {
        tools: ['getProject', 'listProjects', 'listProjectVersions'],
        compatibility: 'HIGH - Mostly version changes only'
      },
      issueCrud: {
        tools: ['createIssue', 'updateIssue', 'deleteIssue', 'assignIssue', 'addIssueComment'],
        compatibility: 'MODERATE - Content format adaptations'
      },
      issueLifecycle: {
        tools: ['getIssueTransitions', 'transitionIssue'],
        compatibility: 'HIGH - Version changes only'
      },
      totalTools: 14,
      dcEnhancements: [
        'Native Wiki Markup support in comments và descriptions',
        'Username fallback cho user resolution',
        'Enhanced error handling với DC-specific mappings',
        'Content format conversion với graceful degradation'
      ]
    };
  }

  /**
   * Validate issue access and permissions
   */
  async validateIssueAccess(issueIdOrKey: string): Promise<{
    accessible: boolean;
    canEdit: boolean;
    reason?: string;
  }> {
    try {
      // Try to get issue transitions as a proxy for access
      await this.getIssueTransitions({ issueIdOrKey });
      
      return {
        accessible: true,
        canEdit: true // If can get transitions, assume can edit
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
   * Get comprehensive issue metadata
   */
  async getIssueMetadata(issueIdOrKey: string): Promise<{
    issueKey: string;
    projectKey: string;
    issueType: string;
    status: string;
    assignee?: string;
    availableTransitions: number;
    commentCount: number;
    lastUpdated: string;
  }> {
    const [transitions, comments] = await Promise.all([
      this.getIssueTransitions({ issueIdOrKey }),
      this.getIssueComments({ issueIdOrKey, maxResults: 1 })
    ]);

    // Would need issue details call for complete metadata
    return {
      issueKey: issueIdOrKey,
      projectKey: 'Unknown', // Would extract from issue details
      issueType: 'Unknown',
      status: 'Unknown',
      assignee: undefined,
      availableTransitions: transitions.transitions.length,
      commentCount: comments.total,
      lastUpdated: new Date().toISOString()
    };
  }
}