import { describe, expect, it, beforeEach } from '@jest/globals';
import { ConfigManager, JiraDataCenterConfigSchema } from '../../config/datacenter-config.js';
import { testUtils, testData, mockNetworkConditions } from '../setup.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config = testUtils.createMockConfig();
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration without baseUrl', () => {
      const config = { ...testUtils.createMockConfig(), baseUrl: '' };
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Base URL must be a valid URL'))).toBe(true);
    });

    it('should reject configuration with invalid URL', () => {
      const config = { ...testUtils.createMockConfig(), baseUrl: 'not-a-url' };
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('must be a valid URL'))).toBe(true);
    });

    it('should reject configuration without PAT token', () => {
      const config = { ...testUtils.createMockConfig(), personalAccessToken: '' };
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Personal Access Token is required'))).toBe(true);
    });

    it('should reject PAT token that is too short', () => {
      const config = { ...testUtils.createMockConfig(), personalAccessToken: 'short' };
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('too short'))).toBe(true);
    });

    it('should validate timeout range', () => {
      const configLow = { ...testUtils.createMockConfig(), timeout: 500 };
      const resultLow = configManager.validateConfig(configLow);
      expect(resultLow.valid).toBe(false);

      const configHigh = { ...testUtils.createMockConfig(), timeout: 400000 };
      const resultHigh = configManager.validateConfig(configHigh);
      expect(resultHigh.valid).toBe(false);

      const configValid = { ...testUtils.createMockConfig(), timeout: 30000 };
      const resultValid = configManager.validateConfig(configValid);
      expect(resultValid.valid).toBe(true);
    });

    it('should validate context path format', () => {
      const configInvalid = { ...testUtils.createMockConfig(), contextPath: 'jira' };
      const resultInvalid = configManager.validateConfig(configInvalid);
      expect(resultInvalid.valid).toBe(false);

      const configValid = { ...testUtils.createMockConfig(), contextPath: '/jira' };
      const resultValid = configManager.validateConfig(configValid);
      expect(resultValid.valid).toBe(true);
    });

    it('should generate warnings for insecure settings', () => {
      const config = {
        ...testUtils.createMockConfig(),
        baseUrl: 'http://jira.company.com',
        validateSsl: false,
        timeout: 2000,
      };
      const result = configManager.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Using HTTP instead of HTTPS - consider security implications');
      expect(result.warnings).toContain('SSL validation disabled - not recommended for production');
      expect(result.warnings).toContain('Timeout is very low - may cause failures on slow networks');
    });
  });

  describe('normalizeBaseUrl', () => {
    it('should add https protocol if missing', () => {
      const result = configManager.normalizeBaseUrl('jira.company.com');
      expect(result).toBe('https://jira.company.com');
    });

    it('should preserve existing protocol', () => {
      const httpsResult = configManager.normalizeBaseUrl('https://jira.company.com');
      expect(httpsResult).toBe('https://jira.company.com');

      const httpResult = configManager.normalizeBaseUrl('http://jira.company.com');
      expect(httpResult).toBe('http://jira.company.com');
    });

    it('should remove trailing slashes', () => {
      const result = configManager.normalizeBaseUrl('https://jira.company.com/');
      expect(result).toBe('https://jira.company.com');

      const multipleSlashes = configManager.normalizeBaseUrl('https://jira.company.com///');
      expect(multipleSlashes).toBe('https://jira.company.com');
    });

    it('should trim whitespace', () => {
      const result = configManager.normalizeBaseUrl('  https://jira.company.com  ');
      expect(result).toBe('https://jira.company.com');
    });
  });

  describe('detectContextPath', () => {
    it('should detect context path from URL', () => {
      const result = configManager.detectContextPath('https://company.com/jira');
      expect(result).toBe('/jira');
    });

    it('should return undefined for root path', () => {
      const result = configManager.detectContextPath('https://jira.company.com');
      expect(result).toBeUndefined();

      const rootSlash = configManager.detectContextPath('https://jira.company.com/');
      expect(rootSlash).toBeUndefined();
    });

    it('should handle complex context paths', () => {
      const result = configManager.detectContextPath('https://company.com/custom-jira');
      expect(result).toBe('/custom-jira');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = configManager.detectContextPath('not-a-url');
      expect(result).toBeUndefined();
    });
  });

  describe('testConnectivity', () => {
    beforeEach(() => {
      testUtils.resetMocks();
    });

    it('should pass connectivity test with valid credentials', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Successfully connected as: Administrator');
    });

    it('should fail with 401 authentication error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(401, testData.dcResponses.error401);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Authentication failed: Invalid Personal Access Token');
    });

    it('should fail with 403 permission error', async () => {
      const mockResponse = testUtils.createMockFetchResponse(403, testData.dcResponses.error403);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Authentication succeeded but access denied: Check user permissions');
    });

    it('should fail with 404 endpoint not found', async () => {
      const mockResponse = testUtils.createMockFetchResponse(404, testData.dcResponses.error404);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API endpoint not found: Check base URL and context path');
    });

    it('should handle network timeout', async () => {
      mockNetworkConditions.timeout();

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('timeout') || error.includes('Unknown connection error'))).toBe(true);
    });

    it('should handle DNS resolution failure', async () => {
      mockNetworkConditions.dnsFailure();

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DNS resolution failed: Check base URL');
    });

    it('should handle connection refused', async () => {
      mockNetworkConditions.connectionRefused();

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Connection refused: Check if Jira Data Center is running');
    });

    it('should handle SSL certificate errors', async () => {
      mockNetworkConditions.sslError();

      const config = testUtils.createMockConfig();
      const result = await configManager.testConnectivity(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SSL certificate error: Check validateSsl setting');
    });

    it('should construct correct API URL with context path', async () => {
      const mockResponse = testUtils.createMockFetchResponse(200, testData.dcResponses.myself);
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const config = {
        ...testUtils.createMockConfig(),
        baseUrl: 'https://company.com',
        contextPath: '/jira',
      };

      await configManager.testConnectivity(config);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://company.com/jira/rest/api/latest/myself',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${config.personalAccessToken}`,
          }),
        })
      );
    });
  });

  describe('fromEnvironment', () => {
    it('should create config from environment variables', () => {
      const config = ConfigManager.fromEnvironment();

      expect(config.baseUrl).toBe(process.env.JIRA_DC_BASE_URL);
      expect(config.personalAccessToken).toBe(process.env.JIRA_DC_PAT);
      expect(config.apiVersion).toBe('latest');
      expect(config.timeout).toBe(5000);
    });

    it('should throw error for invalid environment configuration', () => {
      const originalBaseUrl = process.env.JIRA_DC_BASE_URL;
      process.env.JIRA_DC_BASE_URL = '';

      expect(() => ConfigManager.fromEnvironment()).toThrow('Invalid environment configuration');

      process.env.JIRA_DC_BASE_URL = originalBaseUrl;
    });
  });
});

describe('JiraDataCenterConfigSchema', () => {
  it('should validate proxy configuration', () => {
    const configWithProxy = {
      ...testUtils.createMockConfig(),
      proxy: {
        host: 'proxy.company.com',
        port: 8080,
        protocol: 'http' as const,
        auth: {
          username: 'proxyuser',
          password: 'proxypass',
        },
      },
    };

    const result = JiraDataCenterConfigSchema.safeParse(configWithProxy);
    expect(result.success).toBe(true);
  });

  it('should reject invalid proxy port', () => {
    const configWithInvalidProxy = {
      ...testUtils.createMockConfig(),
      proxy: {
        host: 'proxy.company.com',
        port: 70000, // Invalid port
        protocol: 'http' as const,
      },
    };

    const result = JiraDataCenterConfigSchema.safeParse(configWithInvalidProxy);
    expect(result.success).toBe(false);
  });

  it('should use default values', () => {
    const minimalConfig = {
      baseUrl: 'https://jira.company.com',
      personalAccessToken: 'valid-token-1234567890abcdef',
    };

    const result = JiraDataCenterConfigSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.apiVersion).toBe('latest');
      expect(result.data.timeout).toBe(30000);
      expect(result.data.maxRetries).toBe(3);
      expect(result.data.validateSsl).toBe(true);
    }
  });
});