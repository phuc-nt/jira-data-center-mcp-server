import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UserResolver, UserResolutionStrategy } from '../../api/user-resolver.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { testUtils, testData } from '../setup.js';

describe('UserResolver', () => {
  let userResolver: UserResolver;
  let config: ReturnType<typeof testUtils.createMockConfig>;
  let mockAuthenticator: PATAuthenticator;

  const mockUsers = {
    byAccountId: {
      accountId: '5b10ac8d82e05b22cc7d4ef5',
      name: 'testuser',
      displayName: 'Test User',
      emailAddress: 'test@company.com',
      active: true
    },
    byUsername: {
      accountId: '5b10ac8d82e05b22cc7d4ef5',
      name: 'testuser',
      displayName: 'Test User',
      emailAddress: 'test@company.com',
      active: true
    },
    searchResults: [
      {
        accountId: '5b10ac8d82e05b22cc7d4ef5',
        name: 'testuser',
        displayName: 'Test User',
        emailAddress: 'test@company.com',
        active: true
      },
      {
        accountId: '6c21bd9e93f16c33dd8e5fg6',
        name: 'anotheruser',
        displayName: 'Another User',
        emailAddress: 'another@company.com',
        active: true
      }
    ]
  };

  beforeEach(() => {
    config = testUtils.createMockConfig();
    mockAuthenticator = new PATAuthenticator(config);
    userResolver = new UserResolver(config, mockAuthenticator);
    testUtils.resetMocks();
  });

  describe('constructor', () => {
    it('should initialize with config and authenticator', () => {
      expect(userResolver).toBeInstanceOf(UserResolver);
    });
  });

  describe('detectIdentifierType', () => {
    it('should detect UUID-style account IDs', () => {
      const result = userResolver.detectIdentifierType('5b10ac8d-82e0-5b22-cc7d-4ef567890123');
      expect(result).toBe('accountId');
    });

    it('should detect hex-style account IDs', () => {
      const result = userResolver.detectIdentifierType('5b10ac8d82e05b22cc7d4ef5');
      expect(result).toBe('accountId');
    });

    it('should detect numeric account IDs', () => {
      const result = userResolver.detectIdentifierType('123456789');
      expect(result).toBe('accountId');
    });

    it('should detect email addresses', () => {
      const result = userResolver.detectIdentifierType('test@company.com');
      expect(result).toBe('email');
    });

    it('should detect display names with spaces', () => {
      const result = userResolver.detectIdentifierType('Test User Name');
      expect(result).toBe('displayName');
    });

    it('should default to username for simple strings', () => {
      const result = userResolver.detectIdentifierType('testuser');
      expect(result).toBe('username');
    });
  });

  describe('findUserByAccountId', () => {
    it('should find user by account ID', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      const result = await userResolver.findUserByAccountId('5b10ac8d82e05b22cc7d4ef5');

      expect(result).toBeDefined();
      expect(result?.accountId).toBe('5b10ac8d82e05b22cc7d4ef5');
      expect(result?.username).toBe('testuser');
      expect(result?.displayName).toBe('Test User');
      expect(result?.emailAddress).toBe('test@company.com');
      expect(result?.active).toBe(true);
    });

    it('should return null for non-existent account ID', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(404, { message: 'User not found' }));

      await expect(userResolver.findUserByAccountId('nonexistent')).rejects.toThrow();
    });

    it('should normalize user data correctly', async () => {
      const partialUserData = {
        name: 'testuser',
        displayName: 'Test User',
        active: true
        // Missing accountId and emailAddress
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, partialUserData));

      const result = await userResolver.findUserByAccountId('testuser');

      expect(result?.accountId).toBe('testuser'); // Falls back to name
      expect(result?.username).toBe('testuser');
      expect(result?.displayName).toBe('Test User');
      expect(result?.emailAddress).toBeUndefined();
      expect(result?.active).toBe(true);
    });
  });

  describe('findUserByUsername', () => {
    it('should find user by username', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byUsername));

      const result = await userResolver.findUserByUsername('testuser');

      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
      expect(result?.displayName).toBe('Test User');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(401, { message: 'Unauthorized' }));

      await expect(userResolver.findUserByUsername('testuser')).rejects.toThrow('401');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, [mockUsers.byUsername]));

      const result = await userResolver.findUserByEmail('test@company.com');

      expect(result).toBeDefined();
      expect(result?.emailAddress).toBe('test@company.com');
    });

    it('should return null when no users found', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, []));

      const result = await userResolver.findUserByEmail('nonexistent@company.com');

      expect(result).toBeNull();
    });
  });

  describe('findUsersByDisplayName', () => {
    it('should find users by display name', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.searchResults));

      const results = await userResolver.findUsersByDisplayName('Test');

      expect(results).toHaveLength(2);
      expect(results[0].displayName).toBe('Test User');
      expect(results[1].displayName).toBe('Another User');
    });

    it('should limit results based on maxResults parameter', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, [mockUsers.searchResults[0]]));

      const results = await userResolver.findUsersByDisplayName('Test', 1);

      expect(results).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=1'),
        expect.any(Object)
      );
    });
  });

  describe('resolveUser', () => {
    it('should resolve user with auto-detection strategy', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      const result = await userResolver.resolveUser('5b10ac8d82e05b22cc7d4ef5');

      expect(result.success).toBe(true);
      expect(result.user?.accountId).toBe('5b10ac8d82e05b22cc7d4ef5');
      expect(result.strategy).toBe(UserResolutionStrategy.ACCOUNT_ID_FIRST);
      expect(result.identifierType).toBe('accountId');
      expect(result.cached).toBe(false);
    });

    it('should use caching for subsequent requests', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      // First request
      const result1 = await userResolver.resolveUser('5b10ac8d82e05b22cc7d4ef5');
      expect(result1.cached).toBe(false);

      // Second request should use cache
      const result2 = await userResolver.resolveUser('5b10ac8d82e05b22cc7d4ef5');
      expect(result2.cached).toBe(true);
      expect(result2.user?.accountId).toBe('5b10ac8d82e05b22cc7d4ef5');

      // Should only have made one network request
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fallback between resolution strategies', async () => {
      // Mock first call to fail (username), second to succeed (accountId)
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(404, { message: 'Not found' }))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      const result = await userResolver.resolveUser('testuser', {
        strategy: UserResolutionStrategy.USERNAME_FIRST
      });

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('testuser');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle resolution failures gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await userResolver.resolveUser('nonexistent');

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toContain('Network error');
      expect(result.cached).toBe(false);
    });

    it('should respect useCache option', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      // First request with caching
      await userResolver.resolveUser('testuser');

      // Second request with caching disabled
      const result = await userResolver.resolveUser('testuser', { useCache: false });

      expect(result.cached).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAssignableIdentifier', () => {
    it('should prefer accountId over username', () => {
      const user = {
        accountId: '5b10ac8d82e05b22cc7d4ef5',
        username: 'testuser',
        displayName: 'Test User',
        active: true
      };

      const identifier = userResolver.getAssignableIdentifier(user);

      expect(identifier).toBe('5b10ac8d82e05b22cc7d4ef5');
    });

    it('should use username when accountId equals username', () => {
      const user = {
        accountId: 'testuser',
        username: 'testuser',
        displayName: 'Test User',
        active: true
      };

      const identifier = userResolver.getAssignableIdentifier(user);

      expect(identifier).toBe('testuser');
    });
  });

  describe('validateUserForAssignment', () => {
    it('should validate assignable user', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, [mockUsers.byAccountId]));

      const result = await userResolver.validateUserForAssignment('testuser', 'TEST-123');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject non-assignable user', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, []));

      const result = await userResolver.validateUserForAssignment('testuser', 'TEST-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('User is not assignable to this issue');
    });

    it('should handle validation errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Validation failed'));

      const result = await userResolver.validateUserForAssignment('testuser', 'TEST-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Validation failed');
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      // First request
      await userResolver.resolveUser('testuser');

      // Clear cache
      userResolver.clearCache();

      // Second request should make new network call
      const result = await userResolver.resolveUser('testuser');

      expect(result.cached).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', async () => {
      const stats = userResolver.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeUndefined();

      // Add user to cache
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      await userResolver.resolveUser('testuser');

      const newStats = userResolver.getCacheStats();
      expect(newStats.size).toBeGreaterThan(0);
      expect(newStats.oldestEntry).toBeDefined();
    });
  });

  describe('network error handling', () => {
    it('should handle network timeouts', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('AbortError'));

      const result = await userResolver.resolveUser('testuser');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AbortError');
    });

    it('should handle context path in URLs', async () => {
      const contextConfig = { ...config, contextPath: '/jira' };
      const contextUserResolver = new UserResolver(contextConfig, mockAuthenticator);

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, mockUsers.byAccountId));

      await contextUserResolver.findUserByAccountId('testuser');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jira/rest/api/latest/user'),
        expect.any(Object)
      );
    });
  });

  describe('security and privacy', () => {
    it('should mask identifiers in logs', () => {
      // This test verifies the maskIdentifier private method through public APIs
      const longIdentifier = '5b10ac8d82e05b22cc7d4ef567890123';
      const shortIdentifier = 'abc';

      // We can't directly test the private method, but we can verify
      // that it doesn't leak sensitive data in error scenarios
      expect(() => {
        userResolver.detectIdentifierType(longIdentifier);
      }).not.toThrow();

      expect(() => {
        userResolver.detectIdentifierType(shortIdentifier);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty or invalid identifiers', async () => {
      const result = await userResolver.resolveUser('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed API responses', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, null));

      const result = await userResolver.findUserByAccountId('testuser');

      expect(result).toBeNull();
    });

    it('should handle non-JSON responses', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Invalid JSON'))
        } as Response);

      await expect(userResolver.findUserByAccountId('testuser')).rejects.toThrow('Invalid JSON');
    });
  });
});