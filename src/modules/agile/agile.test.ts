/**
 * Test suite for Agile Module
 * Comprehensive testing for all 10 Agile tools
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgileModule } from './index.js';
import { BoardManager } from './board-manager.js';
import { SprintManager } from './sprint-manager.js';
import { IssueOperations } from './issue-operations.js';
import type { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import type { PATAuthenticator } from '../../auth/pat-authenticator.js';

// Mock implementations
const mockConfig: JiraDataCenterConfig = {
  baseUrl: 'https://jira.example.com',
  personalAccessToken: 'mock-pat-token',
  contextPath: '',
  apiVersion: '2'
};

const mockAuthenticator = {
  authenticate: jest.fn(),
  validateToken: jest.fn()
} as unknown as PATAuthenticator;

// Mock API responses
const mockBoardResponse = {
  data: {
    id: 1,
    name: 'Test Board',
    type: 'scrum',
    location: {
      type: 'project',
      key: 'TEST',
      id: '10000'
    }
  },
  status: 200,
  headers: {}
};

const mockSprintResponse = {
  data: {
    id: 1,
    name: 'Sprint 1',
    state: 'active',
    startDate: '2025-08-15T00:00:00.000Z',
    endDate: '2025-08-29T00:00:00.000Z',
    originBoardId: 1
  },
  status: 200,
  headers: {}
};

const mockBoardListResponse = {
  data: {
    maxResults: 50,
    startAt: 0,
    total: 1,
    isLast: true,
    values: [mockBoardResponse.data]
  },
  status: 200,
  headers: {}
};

const mockSprintListResponse = {
  data: {
    maxResults: 50,
    startAt: 0,
    total: 1,
    isLast: true,
    values: [mockSprintResponse.data]
  },
  status: 200,
  headers: {}
};

describe('AgileModule', () => {
  let agileModule: AgileModule;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      request: jest.fn(),
      initialize: jest.fn(),
      getClientStats: jest.fn(),
      getErrorMetrics: jest.fn()
    };

    agileModule = new AgileModule(mockConfig, mockAuthenticator);
    // Replace internal API client with mock
    (agileModule as any).apiClient = mockApiClient;
    (agileModule as any).boardManager = new BoardManager(mockApiClient);
    (agileModule as any).sprintManager = new SprintManager(mockApiClient);
    (agileModule as any).issueOperations = new IssueOperations(mockApiClient);
  });

  describe('Module Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agileModule.initialize()).resolves.not.toThrow();
      expect(mockApiClient.initialize).toHaveBeenCalled();
    });

    it('should provide module capabilities', () => {
      const capabilities = agileModule.getCapabilities();
      
      expect(capabilities.totalTools).toBe(10);
      expect(capabilities.boardManagement.tools).toHaveLength(4);
      expect(capabilities.sprintManagement.tools).toHaveLength(6);
      expect(capabilities.issueOperations.tools).toHaveLength(2);
    });

    it('should provide health status', () => {
      const health = agileModule.getHealthStatus();
      
      expect(health.module).toBe('agile');
      expect(health.apiVersion).toBe('1.0');
      expect(health.compatibility).toBe('HIGH');
    });
  });

  describe('Board Management Tools', () => {
    it('should list boards successfully', async () => {
      mockApiClient.request.mockResolvedValue(mockBoardListResponse);

      const result = await agileModule.listBoards({
        projectKeyOrId: 'TEST',
        type: 'scrum'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/board',
        {
          method: 'GET',
          queryParams: {
            projectKeyOrId: 'TEST',
            type: 'scrum'
          }
        }
      );
      expect(result.values).toHaveLength(1);
      expect(result.values[0].name).toBe('Test Board');
    });

    it('should get board details', async () => {
      mockApiClient.request.mockResolvedValue(mockBoardResponse);

      const result = await agileModule.getBoard(1);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/1',
        { method: 'GET' }
      );
      expect(result.name).toBe('Test Board');
      expect(result.type).toBe('scrum');
    });

    it('should get board configuration', async () => {
      const mockConfigResponse = {
        data: {
          id: 1,
          name: 'Test Board Config',
          type: 'scrum',
          columnConfig: {
            columns: [
              { name: 'To Do', statuses: [] },
              { name: 'In Progress', statuses: [] },
              { name: 'Done', statuses: [] }
            ]
          }
        },
        status: 200,
        headers: {}
      };
      mockApiClient.request.mockResolvedValue(mockConfigResponse);

      const result = await agileModule.getBoardConfiguration(1);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/1/configuration',
        { method: 'GET' }
      );
      expect(result.columnConfig.columns).toHaveLength(3);
    });

    it('should list backlog issues', async () => {
      const mockIssuesResponse = {
        data: {
          maxResults: 50,
          startAt: 0,
          total: 2,
          issues: [
            { id: '1', key: 'TEST-1', fields: { summary: 'Issue 1' } },
            { id: '2', key: 'TEST-2', fields: { summary: 'Issue 2' } }
          ]
        },
        status: 200,
        headers: {}
      };
      mockApiClient.request.mockResolvedValue(mockIssuesResponse);

      const result = await agileModule.listBacklogIssues({
        boardId: 1,
        maxResults: 50
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/1/backlog',
        {
          method: 'GET',
          queryParams: { maxResults: 50 }
        }
      );
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('Sprint Management Tools', () => {
    it('should list sprints', async () => {
      mockApiClient.request.mockResolvedValue(mockSprintListResponse);

      const result = await agileModule.listSprints({
        boardId: 1,
        state: 'active'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/1/sprint',
        {
          method: 'GET',
          queryParams: { state: 'active' }
        }
      );
      expect(result.values).toHaveLength(1);
      expect(result.values[0].state).toBe('active');
    });

    it('should get sprint details', async () => {
      mockApiClient.request.mockResolvedValue(mockSprintResponse);

      const result = await agileModule.getSprint(1);

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/1',
        { method: 'GET' }
      );
      expect(result.name).toBe('Sprint 1');
      expect(result.state).toBe('active');
    });

    it('should get sprint issues', async () => {
      const mockSprintIssuesResponse = {
        data: {
          maxResults: 50,
          startAt: 0,
          total: 3,
          issues: [
            { id: '1', key: 'TEST-1', fields: { summary: 'Issue 1' } },
            { id: '2', key: 'TEST-2', fields: { summary: 'Issue 2' } },
            { id: '3', key: 'TEST-3', fields: { summary: 'Issue 3' } }
          ]
        },
        status: 200,
        headers: {}
      };
      mockApiClient.request.mockResolvedValue(mockSprintIssuesResponse);

      const result = await agileModule.getSprintIssues({
        sprintId: 1,
        fields: ['summary', 'status']
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/1/issue',
        {
          method: 'GET',
          queryParams: { fields: 'summary,status' }
        }
      );
      expect(result.issues).toHaveLength(3);
    });

    it('should create sprint', async () => {
      mockApiClient.request.mockResolvedValue(mockSprintResponse);

      const result = await agileModule.createSprint({
        name: 'New Sprint',
        boardId: 1,
        goal: 'Sprint goal'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint',
        {
          method: 'POST',
          body: {
            name: 'New Sprint',
            originBoardId: 1,
            goal: 'Sprint goal'
          }
        }
      );
      expect(result.name).toBe('Sprint 1');
    });

    it('should start sprint', async () => {
      mockApiClient.request.mockResolvedValue(mockSprintResponse);

      const result = await agileModule.startSprint({
        sprintId: 1,
        startDate: '2025-08-15T00:00:00.000Z',
        endDate: '2025-08-29T00:00:00.000Z',
        goal: 'Updated goal'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/1',
        {
          method: 'PUT',
          body: {
            id: 1,
            state: 'active',
            startDate: '2025-08-15T00:00:00.000Z',
            endDate: '2025-08-29T00:00:00.000Z',
            goal: 'Updated goal'
          }
        }
      );
      expect(result.state).toBe('active');
    });

    it('should close sprint', async () => {
      const mockClosedSprintResponse = {
        data: {
          ...mockSprintResponse.data,
          state: 'closed',
          completeDate: '2025-08-29T00:00:00.000Z'
        },
        status: 200,
        headers: {}
      };
      
      // Mock getSprint call for validation
      mockApiClient.request
        .mockResolvedValueOnce(mockSprintResponse) // getSprint call
        .mockResolvedValueOnce(mockClosedSprintResponse); // closeSprint call

      const result = await agileModule.closeSprint(1);

      expect(mockApiClient.request).toHaveBeenCalledTimes(2);
      expect(result.state).toBe('closed');
    });
  });

  describe('Issue Operations Tools', () => {
    it('should add issue to sprint', async () => {
      mockApiClient.request.mockResolvedValue({ data: null, status: 204, headers: {} });

      await agileModule.addIssueToSprint({
        sprintId: 1,
        issueIdOrKey: 'TEST-1'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/1/issue',
        {
          method: 'POST',
          body: { issues: ['TEST-1'] }
        }
      );
    });

    it('should add issues to backlog', async () => {
      mockApiClient.request.mockResolvedValue({ data: null, status: 204, headers: {} });

      await agileModule.addIssuesToBacklog({
        issues: ['TEST-1', 'TEST-2']
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/backlog/issue',
        {
          method: 'POST',
          body: { issueIdOrKeys: ['TEST-1', 'TEST-2'] }
        }
      );
    });

    it('should handle ranking when adding to backlog', async () => {
      mockApiClient.request.mockResolvedValue({ data: null, status: 204, headers: {} });

      await (agileModule as any).issueOperations.addIssuesToBacklog({
        issues: ['TEST-1'],
        rankBeforeIssue: 'TEST-2'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/rest/agile/1.0/backlog/issue',
        {
          method: 'POST',
          body: {
            issueIdOrKeys: ['TEST-1'],
            rankBeforeIssue: 'TEST-2'
          }
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApiClient.request.mockRejectedValue(error);

      await expect(agileModule.listBoards()).rejects.toThrow('API Error');
    });

    it('should validate sprint ID parameters', async () => {
      await expect(agileModule.getSprint(0)).rejects.toThrow('Invalid sprint ID');
      await expect(agileModule.getSprint(-1)).rejects.toThrow('Invalid sprint ID');
    });

    it('should validate board ID parameters', async () => {
      await expect(agileModule.getBoard(0)).rejects.toThrow('Invalid board ID');
      await expect(agileModule.getBoard(-1)).rejects.toThrow('Invalid board ID');
    });

    it('should validate issue parameters', async () => {
      await expect(agileModule.addIssueToSprint({
        sprintId: 1,
        issueIdOrKey: ''
      })).rejects.toThrow('Issue ID or key is required');

      await expect(agileModule.addIssuesToBacklog({
        issues: []
      })).rejects.toThrow('At least one issue ID or key is required');
    });
  });

  describe('Compatibility Verification', () => {
    it('should use correct API endpoints for high compatibility', () => {
      const capabilities = agileModule.getCapabilities();
      
      // Verify all tools report full compatibility
      expect(capabilities.boardManagement.compatibility).toContain('FULL');
      expect(capabilities.sprintManagement.compatibility).toContain('FULL');
      expect(capabilities.issueOperations.compatibility).toContain('FULL');
    });

    it('should handle DC-specific enhancements', () => {
      const capabilities = agileModule.getCapabilities();
      
      expect(capabilities.dcEnhancements).toContain('Direct network access performance');
      expect(capabilities.dcEnhancements).toContain('Enterprise authentication via PAT');
      expect(capabilities.dcEnhancements).toContain('Better error handling and retry logic');
    });
  });
});