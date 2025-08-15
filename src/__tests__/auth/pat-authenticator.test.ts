import { describe, expect, it, beforeEach } from '@jest/globals';
import { PATAuthenticator, AuthError, AuthErrorType } from '../../auth/pat-authenticator.js';
import { testUtils, testData, mockNetworkConditions } from '../setup.js';

describe('PATAuthenticator', () => {
  let authenticator: PATAuthenticator;
  let config: ReturnType<typeof testUtils.createMockConfig>;

  beforeEach(() => {
    config = testUtils.createMockConfig();
    authenticator = new PATAuthenticator(config);
  });

  describe('constructor', () => {
    it('should create authenticator with valid config', () => {
      expect(authenticator).toBeInstanceOf(PATAuthenticator);
    });

    it('should reject empty PAT token', () => {
      const invalidConfig = { ...config, personalAccessToken: '' };
      expect(() => new PATAuthenticator(invalidConfig)).toThrow(AuthError);
      expect(() => new PATAuthenticator(invalidConfig)).toThrow('PAT token must be a non-empty string');
    });

    it('should reject short PAT token', () => {
      const invalidConfig = { ...config, personalAccessToken: 'short' };
      expect(() => new PATAuthenticator(invalidConfig)).toThrow(AuthError);
      expect(() => new PATAuthenticator(invalidConfig)).toThrow('too short');
    });

    it('should reject PAT token with invalid characters', () => {
      const invalidConfig = { ...config, personalAccessToken: 'invalid token with spaces' };
      expect(() => new PATAuthenticator(invalidConfig)).toThrow(AuthError);
      expect(() => new PATAuthenticator(invalidConfig)).toThrow('invalid characters');
    });

    it('should accept valid PAT token', () => {
      const validConfig = { ...config, personalAccessToken: testData.validPATToken };
      expect(() => new PATAuthenticator(validConfig)).not.toThrow();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return correct authentication headers', () => {
      const headers = authenticator.getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': `Bearer ${config.personalAccessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'mcp-jira-dc-server/1.0.0-DC',
        'X-Atlassian-Token': 'no-check',
      });
    });

    it('should include actual PAT token in Authorization header', () => {
      const customConfig = { ...config, personalAccessToken: 'custom-token-1234567890' };
      const customAuth = new PATAuthenticator(customConfig);
      const headers = customAuth.getAuthHeaders();

      expect(headers['Authorization']).toBe('Bearer custom-token-1234567890');
    });
  });

  describe('validateToken', () => {
    beforeEach(() => {
      testUtils.resetMocks();
    });

    it('should validate token successfully with DC response', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        accountId: '5b10ac8d82e05b22cc7d4ef5',
        username: 'admin',
        displayName: 'Administrator',
        emailAddress: 'admin@company.com',
        active: true,
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle user data with missing fields', async () => {
      const partialUserData = {
        name: 'testuser',
        displayName: 'Test User',
      };
      const mockResponse = testUtils.createMockFetchResponse(200, partialUserData);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(true);
      expect(result.user?.accountId).toBe('testuser'); // Falls back to name
      expect(result.user?.username).toBe('testuser');
      expect(result.user?.displayName).toBe('Test User');
      expect(result.user?.active).toBe(true); // Default value
    });

    it('should cache successful validation', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      // First call
      const result1 = await authenticator.validateToken();
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await authenticator.validateToken();
      expect(result2.success).toBe(true);

      // Should only have made one fetch call
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle 401 authentication error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(401, testData.dcResponses.error401);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Personal Access Token');
      expect(result.statusCode).toBe(401);
    });

    it('should handle 403 permission error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(403, testData.dcResponses.error403);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
      expect(result.statusCode).toBe(403);
    });

    it('should handle 404 endpoint not found', async () => {
      const mockResponse = testUtils.createMockFetchResponse(404, testData.dcResponses.error404);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('API endpoint not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle 429 rate limit error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(429, { message: 'Rate limited' });
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.statusCode).toBe(429);
    });

    it('should handle 500 server error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(500, { message: 'Internal Server Error' });
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await authenticator.validateToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Jira Data Center server error (500)');
      expect(result.statusCode).toBe(500);
    });

    it('should handle network timeout', async () => {
      mockNetworkConditions.timeout();

      await expect(authenticator.validateToken()).rejects.toThrow(AuthError);
      await expect(authenticator.validateToken()).rejects.toThrow(AuthError);
    });

    it('should handle DNS resolution failure', async () => {
      mockNetworkConditions.dnsFailure();

      await expect(authenticator.validateToken()).rejects.toThrow(AuthError);
      await expect(authenticator.validateToken()).rejects.toThrow('DNS resolution failed');
    });

    it('should handle connection refused', async () => {
      mockNetworkConditions.connectionRefused();

      await expect(authenticator.validateToken()).rejects.toThrow(AuthError);
      await expect(authenticator.validateToken()).rejects.toThrow('Connection refused');
    });

    it('should handle SSL certificate errors', async () => {
      mockNetworkConditions.sslError();

      await expect(authenticator.validateToken()).rejects.toThrow(AuthError);
      await expect(authenticator.validateToken()).rejects.toThrow('SSL certificate error');
    });

    it('should construct correct API URL', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await authenticator.validateToken();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-jira-dc.company.com/rest/api/latest/myself',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${config.personalAccessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'mcp-jira-dc-server/1.0.0-DC',
          }),
        })
      );
    });

    it('should respect timeout configuration', async () => {
      const shortTimeoutConfig = { ...config, timeout: 1000 };
      const shortTimeoutAuth = new PATAuthenticator(shortTimeoutConfig);

      // Mock a slow response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new DOMException('The operation was aborted.', 'AbortError')), 2000))
      );

      await expect(shortTimeoutAuth.validateToken()).rejects.toThrow(AuthError);
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      testUtils.resetMocks();
    });

    it('should clear cache when requested', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      // First call
      await authenticator.validateToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      authenticator.clearCache();

      // Second call should make new request
      await authenticator.validateToken();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should report cache validity correctly', async () => {
      expect(authenticator.isCacheValid()).toBe(false);

      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await authenticator.validateToken();
      expect(authenticator.isCacheValid()).toBe(true);

      authenticator.clearCache();
      expect(authenticator.isCacheValid()).toBe(false);
    });

    it('should return cached user when valid', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      expect(authenticator.getCachedUser()).toBeUndefined();

      await authenticator.validateToken();
      const cachedUser = authenticator.getCachedUser();
      
      expect(cachedUser).toBeDefined();
      expect(cachedUser?.displayName).toBe('Administrator');
    });
  });

  describe('security features', () => {
    it('should mask PAT token for logging', () => {
      const longTokenConfig = { ...config, personalAccessToken: 'very-long-token-1234567890abcdef' };
      const longTokenAuth = new PATAuthenticator(longTokenConfig);
      
      const masked = longTokenAuth.getTokenMask();
      expect(masked).toBe('very...cdef');
      expect(masked).not.toContain('long-token-1234567890ab');
    });

    it('should mask short tokens appropriately', () => {
      const shortTokenConfig = { ...config, personalAccessToken: 'short123-1234567890abcdef' };
      const shortTokenAuth = new PATAuthenticator(shortTokenConfig);
      
      const masked = shortTokenAuth.getTokenMask();
      expect(masked).toBe('shor...cdef');
    });

    it('should update config and clear cache', () => {
      const newConfig = { ...config, personalAccessToken: 'new-token-1234567890abcdef' };
      
      authenticator.updateConfig(newConfig);
      
      const headers = authenticator.getAuthHeaders();
      expect(headers['Authorization']).toBe('Bearer new-token-1234567890abcdef');
      expect(authenticator.isCacheValid()).toBe(false);
    });
  });

  describe('error types', () => {
    it('should create AuthError with correct properties', () => {
      const originalError = new Error('Network error');
      const authError = new AuthError(
        AuthErrorType.NETWORK_ERROR,
        'Test error message',
        500,
        originalError
      );

      expect(authError.name).toBe('AuthError');
      expect(authError.type).toBe(AuthErrorType.NETWORK_ERROR);
      expect(authError.message).toBe('Test error message');
      expect(authError.statusCode).toBe(500);
      expect(authError.originalError).toBe(originalError);
    });

    it('should handle AuthError inheritance correctly', () => {
      const authError = new AuthError(AuthErrorType.INVALID_TOKEN, 'Test message');
      
      expect(authError instanceof Error).toBe(true);
      expect(authError instanceof AuthError).toBe(true);
    });
  });
});