/**
 * Board Management for Agile Module
 * Handles all board-related operations using Agile API v1.0
 * HIGH COMPATIBILITY - No changes needed from Cloud to Data Center
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  Board, 
  BoardConfiguration, 
  BoardListParams, 
  BoardListResponse,
  IssueListParams,
  IssueListResponse 
} from './types.js';
import { logger } from '../../utils/logger.js';

export class BoardManager {
  private readonly logger = logger.child('BoardManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('BoardManager initialized');
  }

  /**
   * List all boards
   * Tool: listBoards
   * Endpoint: /rest/agile/1.0/board
   * Compatibility: HIGH - No changes from Cloud
   */
  async listBoards(params: BoardListParams = {}): Promise<BoardListResponse> {
    this.logger.debug('Listing boards', { params });

    const queryParams: Record<string, unknown> = {};
    
    if (params.projectKeyOrId) queryParams.projectKeyOrId = params.projectKeyOrId;
    if (params.type) queryParams.type = params.type;
    if (params.name) queryParams.name = params.name;
    if (params.startAt !== undefined) queryParams.startAt = params.startAt;
    if (params.maxResults !== undefined) queryParams.maxResults = params.maxResults;

    try {
      const response = await this.apiClient.request<BoardListResponse>(
        '/rest/agile/1.0/board',
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Boards listed successfully', {
        total: response.data.total,
        returned: response.data.values.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to list boards', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * Get board details by ID
   * Tool: getBoard
   * Endpoint: /rest/agile/1.0/board/{boardId}
   * Compatibility: HIGH - No changes from Cloud
   */
  async getBoard(boardId: number): Promise<Board> {
    this.logger.debug('Getting board details', { boardId });

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
    }

    try {
      const response = await this.apiClient.request<Board>(
        `/rest/agile/1.0/board/${boardId}`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Board retrieved successfully', {
        boardId,
        boardName: response.data.name,
        boardType: response.data.type
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get board', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId
      });
      throw error;
    }
  }

  /**
   * Get board configuration
   * Tool: getBoardConfiguration
   * Endpoint: /rest/agile/1.0/board/{boardId}/configuration
   * Compatibility: HIGH - No changes from Cloud
   */
  async getBoardConfiguration(boardId: number): Promise<BoardConfiguration> {
    this.logger.debug('Getting board configuration', { boardId });

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
    }

    try {
      const response = await this.apiClient.request<BoardConfiguration>(
        `/rest/agile/1.0/board/${boardId}/configuration`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Board configuration retrieved successfully', {
        boardId,
        configName: response.data.name,
        columnsCount: response.data.columnConfig.columns.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get board configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId
      });
      throw error;
    }
  }

  /**
   * List backlog issues for board
   * Tool: listBacklogIssues
   * Endpoint: /rest/agile/1.0/board/{boardId}/backlog
   * Compatibility: HIGH - No changes from Cloud
   */
  async listBacklogIssues(params: IssueListParams & { boardId: number }): Promise<IssueListResponse> {
    this.logger.debug('Listing backlog issues', { params });

    const { boardId, ...queryParamsObj } = params;

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
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
        `/rest/agile/1.0/board/${boardId}/backlog`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Backlog issues listed successfully', {
        boardId,
        total: response.data.total,
        returned: response.data.issues.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to list backlog issues', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId,
        jql: params.jql
      });
      throw error;
    }
  }

  /**
   * Get board projects (additional utility method)
   * Endpoint: /rest/agile/1.0/board/{boardId}/project
   * Compatibility: HIGH - No changes from Cloud
   */
  async getBoardProjects(boardId: number): Promise<unknown[]> {
    this.logger.debug('Getting board projects', { boardId });

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
    }

    try {
      const response = await this.apiClient.request<{ values: unknown[] }>(
        `/rest/agile/1.0/board/${boardId}/project`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Board projects retrieved successfully', {
        boardId,
        projectsCount: response.data.values.length
      });

      return response.data.values;
    } catch (error) {
      this.logger.error('Failed to get board projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId
      });
      throw error;
    }
  }

  /**
   * Get board epics (additional utility method)
   * Endpoint: /rest/agile/1.0/board/{boardId}/epic
   * Compatibility: HIGH - No changes from Cloud
   */
  async getBoardEpics(params: {
    boardId: number;
    startAt?: number;
    maxResults?: number;
    done?: boolean;
  }): Promise<unknown> {
    this.logger.debug('Getting board epics', { params });

    const { boardId, ...queryParamsObj } = params;

    if (!boardId || boardId <= 0) {
      throw new Error('Invalid board ID provided');
    }

    const queryParams: Record<string, unknown> = {};
    if (queryParamsObj.startAt !== undefined) queryParams.startAt = queryParamsObj.startAt;
    if (queryParamsObj.maxResults !== undefined) queryParams.maxResults = queryParamsObj.maxResults;
    if (queryParamsObj.done !== undefined) queryParams.done = queryParamsObj.done;

    try {
      const response = await this.apiClient.request(
        `/rest/agile/1.0/board/${boardId}/epic`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Board epics retrieved successfully', {
        boardId,
        status: response.status
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get board epics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        boardId
      });
      throw error;
    }
  }

  /**
   * Validate board access and permissions
   */
  async validateBoardAccess(boardId: number): Promise<{
    accessible: boolean;
    canEdit: boolean;
    reason?: string;
  }> {
    try {
      const board = await this.getBoard(boardId);
      
      return {
        accessible: true,
        canEdit: board.canEdit ?? false
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
   * Get board statistics (utility method)
   */
  async getBoardStats(boardId: number): Promise<{
    boardId: number;
    name: string;
    type: string;
    columnsCount: number;
    isPrivate: boolean;
    isFavourite: boolean;
  }> {
    const [board, config] = await Promise.all([
      this.getBoard(boardId),
      this.getBoardConfiguration(boardId)
    ]);

    return {
      boardId: board.id,
      name: board.name,
      type: board.type,
      columnsCount: config.columnConfig.columns.length,
      isPrivate: board.isPrivate ?? false,
      isFavourite: board.favourite ?? false
    };
  }
}