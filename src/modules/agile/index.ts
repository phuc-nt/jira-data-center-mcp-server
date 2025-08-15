/**
 * Agile Module for MCP Jira Data Center Server
 * Provides Agile/Scrum functionality using Jira Agile API v1.0
 * HIGH COMPATIBILITY - Agile API unchanged between Cloud and Data Center
 */

import type { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import type { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { DataCenterAPIClient } from '../../api/datacenter-client.js';
import { logger } from '../../utils/logger.js';

// Re-export types for external use
export type { Board, Sprint, Issue, BacklogConfig } from './types.js';

// Import individual tool implementations
import { BoardManager } from './board-manager.js';
import { SprintManager } from './sprint-manager.js';
import { IssueOperations } from './issue-operations.js';

/**
 * Agile Module - Complete Agile API implementation
 * Handles all board, sprint, and agile issue operations
 */
export class AgileModule {
  private readonly logger = logger.child('AgileModule');
  private readonly apiClient: DataCenterAPIClient;
  private readonly boardManager: BoardManager;
  private readonly sprintManager: SprintManager;
  private readonly issueOperations: IssueOperations;

  constructor(
    config: JiraDataCenterConfig,
    authenticator: PATAuthenticator
  ) {
    this.apiClient = new DataCenterAPIClient(config, authenticator);
    this.boardManager = new BoardManager(this.apiClient);
    this.sprintManager = new SprintManager(this.apiClient);
    this.issueOperations = new IssueOperations(this.apiClient);

    this.logger.info('Agile Module initialized', {
      apiVersion: '1.0',
      compatibility: 'HIGH - No changes needed từ Cloud'
    });
  }

  /**
   * Initialize the Agile module
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Agile Module');
    
    try {
      // Initialize API client
      await this.apiClient.initialize();
      
      this.logger.info('Agile Module initialization completed');
    } catch (error) {
      this.logger.error('Agile Module initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ========== BOARD MANAGEMENT TOOLS ==========

  /**
   * List all boards
   * Tool: listBoards
   * Endpoint: /rest/agile/1.0/board (NO CHANGES from Cloud)
   */
  async listBoards(params: {
    projectKeyOrId?: string;
    type?: 'scrum' | 'kanban';
    name?: string;
    startAt?: number;
    maxResults?: number;
  } = {}) {
    return this.boardManager.listBoards(params);
  }

  /**
   * Get board details
   * Tool: getBoard  
   * Endpoint: /rest/agile/1.0/board/{boardId} (NO CHANGES from Cloud)
   */
  async getBoard(boardId: number) {
    return this.boardManager.getBoard(boardId);
  }

  /**
   * Get board configuration
   * Tool: getBoardConfiguration
   * Endpoint: /rest/agile/1.0/board/{boardId}/configuration (NO CHANGES from Cloud)
   */
  async getBoardConfiguration(boardId: number) {
    return this.boardManager.getBoardConfiguration(boardId);
  }

  /**
   * List backlog issues for board
   * Tool: listBacklogIssues
   * Endpoint: /rest/agile/1.0/board/{boardId}/backlog (NO CHANGES from Cloud)
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
    return this.boardManager.listBacklogIssues(params);
  }

  // ========== SPRINT MANAGEMENT TOOLS ==========

  /**
   * List sprints for board
   * Tool: listSprints
   * Endpoint: /rest/agile/1.0/board/{boardId}/sprint (NO CHANGES from Cloud)
   */
  async listSprints(params: {
    boardId: number;
    state?: 'future' | 'active' | 'closed';
    startAt?: number;
    maxResults?: number;
  }) {
    return this.sprintManager.listSprints(params);
  }

  /**
   * Get sprint details
   * Tool: getSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId} (NO CHANGES from Cloud)
   */
  async getSprint(sprintId: number) {
    return this.sprintManager.getSprint(sprintId);
  }

  /**
   * Get issues in sprint
   * Tool: getSprintIssues
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}/issue (NO CHANGES from Cloud)
   */
  async getSprintIssues(params: {
    sprintId: number;
    jql?: string;
    validateQuery?: boolean;
    fields?: string[];
    expand?: string[];
    startAt?: number;
    maxResults?: number;
  }) {
    return this.sprintManager.getSprintIssues(params);
  }

  /**
   * Create new sprint
   * Tool: createSprint
   * Endpoint: /rest/agile/1.0/sprint (NO CHANGES from Cloud)
   */
  async createSprint(params: {
    name: string;
    goal?: string;
    boardId: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.sprintManager.createSprint(params);
  }

  /**
   * Start sprint
   * Tool: startSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId} (NO CHANGES from Cloud)
   */
  async startSprint(params: {
    sprintId: number;
    startDate: string;
    endDate: string;
    goal?: string;
  }) {
    return this.sprintManager.startSprint(params);
  }

  /**
   * Close sprint
   * Tool: closeSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId} (NO CHANGES from Cloud)
   */
  async closeSprint(sprintId: number) {
    return this.sprintManager.closeSprint(sprintId);
  }

  // ========== ISSUE OPERATIONS TOOLS ==========

  /**
   * Add issue to sprint
   * Tool: addIssueToSprint
   * Endpoint: /rest/agile/1.0/sprint/{sprintId}/issue (NO CHANGES from Cloud)
   */
  async addIssueToSprint(params: {
    sprintId: number;
    issueIdOrKey: string;
  }) {
    return this.issueOperations.addIssueToSprint(params);
  }

  /**
   * Add issues to backlog
   * Tool: addIssuesToBacklog
   * Endpoint: /rest/agile/1.0/backlog/issue (NO CHANGES from Cloud)
   */
  async addIssuesToBacklog(params: {
    issues: string[];
  }) {
    return this.issueOperations.addIssuesToBacklog(params);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get module health status
   */
  getHealthStatus() {
    return {
      module: 'agile',
      apiVersion: '1.0',
      compatibility: 'HIGH',
      clientStats: this.apiClient.getClientStats(),
      errorMetrics: this.apiClient.getErrorMetrics()
    };
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return {
      boardManagement: {
        tools: ['listBoards', 'getBoard', 'getBoardConfiguration', 'listBacklogIssues'],
        compatibility: 'FULL - No changes from Cloud'
      },
      sprintManagement: {
        tools: ['listSprints', 'getSprint', 'getSprintIssues', 'createSprint', 'startSprint', 'closeSprint'],
        compatibility: 'FULL - No changes from Cloud'
      },
      issueOperations: {
        tools: ['addIssueToSprint', 'addIssuesToBacklog'],
        compatibility: 'FULL - No changes from Cloud'
      },
      totalTools: 10,
      dcEnhancements: [
        'Direct network access performance',
        'Enterprise authentication via PAT',
        'Better error handling and retry logic'
      ]
    };
  }
}