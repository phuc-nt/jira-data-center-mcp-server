import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { APIVersionManager } from '../../api/version-manager.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { testUtils, testData } from '../setup.js';

describe('APIVersionManager', () => {
  let versionManager: APIVersionManager;
  let config: ReturnType<typeof testUtils.createMockConfig>;
  let mockAuthenticator: PATAuthenticator;

  beforeEach(() => {
    config = testUtils.createMockConfig();
    mockAuthenticator = new PATAuthenticator(config);
    versionManager = new APIVersionManager(config, mockAuthenticator);
    testUtils.resetMocks();
  });

  describe('constructor', () => {
    it('should initialize with config and authenticator', () => {
      expect(versionManager).toBeInstanceOf(APIVersionManager);
    });
  });

  describe('detectSupportedVersion', () => {
    it('should detect latest version when available', async () => {
      // Mock successful responses for both versions
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself)) // latest
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself)); // v2

      const result = await versionManager.detectSupportedVersion();

      expect(result.detectedVersion).toBe('latest');
      expect(result.confidence).toBe('high');
      expect(result.testResults).toHaveLength(2);
      expect(result.testResults[0].success).toBe(true);
      expect(result.testResults[1].success).toBe(true);
    });

    it('should fallback to v2 when latest is not available', async () => {
      // Mock failure for latest, success for v2
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(404, {})) // latest fails
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself)); // v2 works

      const result = await versionManager.detectSupportedVersion();

      expect(result.detectedVersion).toBe('2');
      expect(result.confidence).toBe('high');
      expect(result.testResults[0].success).toBe(false);
      expect(result.testResults[1].success).toBe(true);
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failures for both versions
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await versionManager.detectSupportedVersion();

      expect(result.detectedVersion).toBe('latest'); // Falls back to configured version
      expect(result.confidence).toBe('low');
      expect(result.testResults[0].success).toBe(false);
      expect(result.testResults[1].success).toBe(false);
    });

    it('should include response times in test results', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself));

      const result = await versionManager.detectSupportedVersion();

      expect(result.testResults[0].responseTime).toBeGreaterThanOrEqual(0);
      expect(result.testResults[1].responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle timeout correctly', async () => {
      // Mock slow response that should timeout
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockImplementation(() => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 6000);
        }));

      const result = await versionManager.detectSupportedVersion();

      expect(result.testResults[0].success).toBe(false);
    });
  });

  describe('getVersionCapabilities', () => {
    it('should return capabilities for latest version', () => {
      const capabilities = versionManager.getVersionCapabilities('latest');

      expect(capabilities.version).toBe('latest');
      expect(capabilities.features.coreAPI).toBe(true);
      expect(capabilities.features.agileAPI).toBe(true);
      expect(capabilities.endpoints.supported).toContain('/rest/api/latest/*');
      expect(capabilities.endpoints.supported).toContain('/rest/agile/1.0/*');
    });

    it('should return capabilities for v2', () => {
      const capabilities = versionManager.getVersionCapabilities('2');

      expect(capabilities.version).toBe('2');
      expect(capabilities.features.coreAPI).toBe(true);
      expect(capabilities.features.agileAPI).toBe(true);
      expect(capabilities.endpoints.supported).toContain('/rest/api/2/*');
      expect(capabilities.limitations).toBeDefined();
    });

    it('should throw error for unsupported version', () => {
      expect(() => {
        versionManager.getVersionCapabilities('unsupported' as any);
      }).toThrow('Unsupported API version: unsupported');
    });
  });

  describe('validateVersionCompatibility', () => {
    it('should validate compatible features', () => {
      const result = versionManager.validateVersionCompatibility([
        'coreAPI',
        'agileAPI',
        'userManagement'
      ]);

      expect(result.compatible).toBe(true);
      expect(result.missingFeatures).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    it('should detect missing features', () => {
      // Mock a version with limited features
      const mockCapabilities = {
        version: '2' as const,
        features: {
          coreAPI: true,
          agileAPI: false, // Missing feature
          searchAPI: true,
          userManagement: true,
          projectManagement: true,
          issueManagement: true,
          filterManagement: true,
          commentManagement: true,
          transitionManagement: true,
          assignmentManagement: true
        },
        endpoints: { supported: [], deprecated: [] }
      };

      jest.spyOn(versionManager, 'getVersionCapabilities').mockReturnValue(mockCapabilities);

      const result = versionManager.validateVersionCompatibility([
        'coreAPI',
        'agileAPI' // This will be missing
      ]);

      expect(result.compatible).toBe(false);
      expect(result.missingFeatures).toContain('agileAPI');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('negotiateBestVersion', () => {
    it('should return cached version if fresh', async () => {
      // Reset mocks first
      testUtils.resetMocks();
      
      // Set a detected version
      versionManager.updateVersion('2');

      const result = await versionManager.negotiateBestVersion();

      expect(result).toBe('2');
      // Should not have made network calls
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should perform fresh detection if cache is stale', async () => {
      // Clear cache to force fresh detection
      versionManager.clearCache();

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself));

      const result = await versionManager.negotiateBestVersion();

      expect(result).toBe('latest');
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return detected version when available', () => {
      versionManager.updateVersion('2');

      const version = versionManager.getCurrentVersion();

      expect(version).toBe('2');
    });

    it('should return configured version when no detection performed', () => {
      const version = versionManager.getCurrentVersion();

      expect(version).toBe(config.apiVersion);
    });
  });

  describe('updateVersion', () => {
    it('should update version and configuration', () => {
      versionManager.updateVersion('2');

      expect(versionManager.getCurrentVersion()).toBe('2');
      expect(config.apiVersion).toBe('2');
    });
  });

  describe('getEndpointRecommendations', () => {
    it('should provide recommendations for Cloud endpoints', () => {
      const result = versionManager.getEndpointRecommendations('/rest/api/3/myself');

      expect(result.recommended).toBe('/rest/api/latest/myself');
      expect(Array.isArray(result.alternatives)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include warnings for v2 API', () => {
      versionManager.updateVersion('2');

      const result = versionManager.getEndpointRecommendations('/rest/api/3/myself');

      expect(result.recommended).toBe('/rest/api/2/myself');
      expect(result.warnings).toContain('Using API v2 - some newer features may not be available');
    });
  });

  describe('clearCache', () => {
    it('should clear detection cache', () => {
      versionManager.updateVersion('2');
      
      versionManager.clearCache();

      // Should return configured version after cache clear
      expect(versionManager.getCurrentVersion()).toBe(config.apiVersion);
    });
  });

  describe('getDetectionSummary', () => {
    it('should provide comprehensive detection summary', () => {
      versionManager.updateVersion('2');

      const summary = versionManager.getDetectionSummary();

      expect(summary.currentVersion).toBe('2');
      expect(summary.capabilities).toBeDefined();
      expect(summary.capabilities.version).toBe('2');
      expect(typeof summary.cacheValid).toBe('boolean');
    });

    it('should include detection age when available', async () => {
      // Perform actual detection to set detection time
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself));

      await versionManager.detectSupportedVersion();

      const summary = versionManager.getDetectionSummary();

      expect(summary.detectionAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('context path handling', () => {
    it('should include context path in test URLs', async () => {
      const contextConfig = { ...config, contextPath: '/jira' };
      const contextVersionManager = new APIVersionManager(contextConfig, mockAuthenticator);

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself))
        .mockResolvedValueOnce(testUtils.createMockFetchResponse(200, testData.dcResponses.myself));

      await contextVersionManager.detectSupportedVersion();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/jira/rest/api/latest/myself'),
        expect.any(Object)
      );
    });
  });
});