import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { DataCenterAPIClient } from '../../api/datacenter-client.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { testUtils, testData } from '../setup.js';

describe('DataCenterAPIClient', () => {
  let apiClient: DataCenterAPIClient;
  let config: ReturnType<typeof testUtils.createMockConfig>;
  let mockAuthenticator: PATAuthenticator;

  const mockIssue = {
    key: 'TEST-123',
    id: '10001',
    fields: {
      summary: 'Test Issue',
      description: 'Test Description',
      issuetype: { name: 'Bug' },
      status: { name: 'Open' }
    }
  };

  const mockSearchResults = {
    issues: [mockIssue],
    total: 1,
    startAt: 0,
    maxResults: 50
  };

  const mockUser = {
    accountId: '5b10ac8d82e05b22cc7d4ef5',
    name: 'testuser',
    displayName: 'Test User',
    emailAddress: 'test@company.com',
    active: true
  };

  beforeEach(() => {
    config = testUtils.createMockConfig();
    mockAuthenticator = new PATAuthenticator(config);
    apiClient = new DataCenterAPIClient(config, mockAuthenticator);
    testUtils.resetMocks();
  });

  describe('constructor', () => {
    it('should initialize with all required components', () => {
      expect(apiClient).toBeInstanceOf(DataCenterAPIClient);
    });
  });

  describe('initialize', () => {
    it('should detect API version during initialization', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser)); // latest
      
      await apiClient.initialize();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/myself'),
        expect.any(Object)
      );
    });

    it('should handle version detection failure gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'));
      
      await expect(apiClient.initialize()).resolves.not.toThrow();
    });
  });

  describe('request method', () => {
    it('should map Cloud endpoint to DC endpoint', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      const response = await apiClient.request('/rest/api/3/myself');

      expect(response.mappingUsed).toBe(true);
      expect(response.endpoint).toContain('/rest/api/latest/myself');
      expect(response.data).toEqual(mockUser);
    });

    it('should handle unsupported endpoints', async () => {
      await expect(
        apiClient.request('/rest/api/3/webhook')
      ).rejects.toThrow('Endpoint not supported in Data Center');
    });

    it('should pass through query parameters', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockIssue));

      await apiClient.request('/rest/api/3/issue/TEST-123', {
        queryParams: { fields: 'summary,status', expand: 'transitions' }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=summary%2Cstatus'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('expand=transitions'),
        expect.any(Object)
      );
    });

    it('should handle POST requests with body', async () => {
      const issueData = {
        fields: {
          summary: 'New Issue',
          project: { key: 'TEST' },
          issuetype: { name: 'Bug' }
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(201, { key: 'TEST-124', id: '10002' }));

      const response = await apiClient.request('/rest/api/3/issue', {
        method: 'POST',
        body: issueData
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(issueData)
        })
      );
      expect(response.status).toBe(201);
    });

    it('should convert ADF content in request body', async () => {
      const adfContent = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello World' }
            ]
          }
        ]
      };

      const issueData = {
        fields: {
          summary: 'Test Issue',
          description: adfContent
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(201, { key: 'TEST-124' }));

      const response = await apiClient.request('/rest/api/3/issue', {
        method: 'POST',
        body: issueData,
        convertContent: true
      });

      expect(response.conversionApplied).toBe(true);
      expect(response.warnings).toContain('Content converted from ADF to Wiki Markup');
    });

    it('should include response metadata', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      const response = await apiClient.request('/rest/api/3/myself');

      expect(response).toMatchObject({
        data: mockUser,
        status: 200,
        mappingUsed: true,
        warnings: expect.any(Array),
        responseTime: expect.any(Number)
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user information', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      const response = await apiClient.getCurrentUser();

      expect(response.data).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/myself'),
        expect.any(Object)
      );
    });
  });

  describe('searchIssues', () => {
    it('should search issues with JQL', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockSearchResults));

      const searchParams = {
        jql: 'project = TEST',
        startAt: 0,
        maxResults: 50
      };

      const response = await apiClient.searchIssues(searchParams);

      expect(response.data).toEqual(mockSearchResults);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/search'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(searchParams)
        })
      );
    });
  });

  describe('getIssue', () => {
    it('should get issue by key', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockIssue));

      const response = await apiClient.getIssue('TEST-123');

      expect(response.data).toEqual(mockIssue);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123'),
        expect.any(Object)
      );
    });

    it('should include fields and expand parameters', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockIssue));

      await apiClient.getIssue('TEST-123', ['summary', 'status'], ['transitions']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=summary%2Cstatus'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('expand=transitions'),
        expect.any(Object)
      );
    });
  });

  describe('createIssue', () => {
    it('should create new issue', async () => {
      const issueData = {
        fields: {
          summary: 'New Issue',
          project: { key: 'TEST' },
          issuetype: { name: 'Bug' }
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(201, { key: 'TEST-124', id: '10002' }));

      const response = await apiClient.createIssue(issueData);

      expect(response.data).toEqual({ key: 'TEST-124', id: '10002' });
      expect(response.status).toBe(201);
    });
  });

  describe('updateIssue', () => {
    it('should update existing issue', async () => {
      const updateData = {
        fields: {
          summary: 'Updated Summary'
        }
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(204, null));

      const response = await apiClient.updateIssue('TEST-123', updateData);

      expect(response.status).toBe(204);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123'),
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });
  });

  describe('addComment', () => {
    it('should add comment to issue', async () => {
      const commentData = {
        body: 'This is a test comment'
      };

      const mockComment = {
        id: '10000',
        body: commentData.body,
        author: mockUser
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(201, mockComment));

      const response = await apiClient.addComment('TEST-123', commentData);

      expect(response.data).toEqual(mockComment);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123/comment'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('assignIssue', () => {
    it('should assign issue to user', async () => {
      // Mock user resolution
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser)) // User resolution
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(204, null));    // Assignment

      const response = await apiClient.assignIssue('TEST-123', 'testuser');

      expect(response.status).toBe(204);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123/assignee'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ accountId: mockUser.accountId })
        })
      );
    });

    it('should handle user resolution failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('User not found'));

      await expect(
        apiClient.assignIssue('TEST-123', 'nonexistent')
      ).rejects.toThrow('Failed to resolve user');
    });
  });

  describe('getIssueTransitions', () => {
    it('should get available transitions', async () => {
      const mockTransitions = {
        transitions: [
          { id: '11', name: 'In Progress' },
          { id: '21', name: 'Done' }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockTransitions));

      const response = await apiClient.getIssueTransitions('TEST-123');

      expect(response.data).toEqual(mockTransitions);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123/transitions'),
        expect.any(Object)
      );
    });
  });

  describe('transitionIssue', () => {
    it('should execute issue transition', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(204, null));

      const response = await apiClient.transitionIssue('TEST-123', '11');

      expect(response.status).toBe(204);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/issue/TEST-123/transitions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            transition: { id: '11' }
          })
        })
      );
    });

    it('should include fields and comment in transition', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(204, null));

      await apiClient.transitionIssue(
        'TEST-123', 
        '11', 
        { assignee: { accountId: 'user123' } },
        'Transitioning to In Progress'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            transition: { id: '11' },
            fields: { assignee: { accountId: 'user123' } },
            update: {
              comment: [{ add: { body: 'Transitioning to In Progress' } }]
            }
          })
        })
      );
    });
  });

  describe('getProjects', () => {
    it('should get all projects', async () => {
      const mockProjects = [
        { key: 'TEST', name: 'Test Project' },
        { key: 'DEMO', name: 'Demo Project' }
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockProjects));

      const response = await apiClient.getProjects();

      expect(response.data).toEqual(mockProjects);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/project'),
        expect.any(Object)
      );
    });
  });

  describe('getProject', () => {
    it('should get project by key', async () => {
      const mockProject = { key: 'TEST', name: 'Test Project' };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockProject));

      const response = await apiClient.getProject('TEST');

      expect(response.data).toEqual(mockProject);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/latest/project/TEST'),
        expect.any(Object)
      );
    });
  });

  describe('resolveUser', () => {
    it('should resolve user using UserResolver', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      const result = await apiClient.resolveUser('testuser');

      expect(result.success).toBe(true);
      expect(result.user?.accountId).toBe(mockUser.accountId);
      expect(result.user?.username).toBe(mockUser.name);
      expect(result.user?.displayName).toBe(mockUser.displayName);
    });
  });

  describe('detectContentFormat', () => {
    it('should detect ADF content format', () => {
      const adfContent = '{"type":"doc","version":1,"content":[]}';
      const result = apiClient.detectContentFormat(adfContent);

      expect(result.format).toBe('adf');
      expect(result.confidence).toBe('high');
    });

    it('should detect Wiki Markup format', () => {
      const wikiContent = 'h1. Heading\n*Bold text*\n_Italic text_';
      const result = apiClient.detectContentFormat(wikiContent);

      expect(result.format).toBe('wikimarkup');
    });
  });

  describe('convertContent', () => {
    it('should convert ADF to Wiki Markup', () => {
      const adfDoc = {
        type: 'doc' as const,
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello World' }
            ]
          }
        ]
      };

      const result = apiClient.convertContent(adfDoc);

      expect(result.format).toBe('wikimarkup');
      expect(result.content).toContain('Hello World');
    });
  });

  describe('getVersionInfo', () => {
    it('should return version information', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      const versionInfo = await apiClient.getVersionInfo();

      expect(versionInfo.current).toBeDefined();
      expect(versionInfo.capabilities).toBeDefined();
    });
  });

  describe('validateEndpoint', () => {
    it('should validate supported endpoint', () => {
      const result = apiClient.validateEndpoint('/rest/api/3/myself');

      expect(result.supported).toBe(true);
    });

    it('should reject unsupported endpoint', () => {
      const result = apiClient.validateEndpoint('/rest/api/3/webhook');

      expect(result.supported).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('getClientStats', () => {
    it('should return client statistics', () => {
      const stats = apiClient.getClientStats();

      expect(stats).toMatchObject({
        version: expect.any(String),
        userCacheStats: expect.any(Object),
        supportedEndpoints: expect.any(Number)
      });
    });
  });

  describe('clearCaches', () => {
    it('should clear all caches', () => {
      expect(() => apiClient.clearCaches()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(
        apiClient.request('/rest/api/3/myself')
      ).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(404, { message: 'Not found' }));

      await expect(
        apiClient.request('/rest/api/3/nonexistent')
      ).rejects.toThrow('404');
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementationOnce(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new DOMException('The operation was aborted.', 'AbortError')), 50)
          )
        );

      await expect(
        apiClient.request('/rest/api/3/myself', { timeout: 100 })
      ).rejects.toThrow();
    }, 10000); // 10 second timeout for this test
  });

  describe('content path handling', () => {
    it('should handle context path in URLs', async () => {
      const contextConfig = { ...config, contextPath: '/jira' };
      const contextClient = new DataCenterAPIClient(contextConfig, mockAuthenticator);

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUser));

      await contextClient.request('/rest/api/3/myself');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jira/rest/api/latest/myself'),
        expect.any(Object)
      );
    });
  });
});