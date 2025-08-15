import { describe, expect, it, beforeEach } from '@jest/globals';
import { EndpointMapper } from '../../api/endpoint-mapper.js';
import { testUtils } from '../setup.js';

describe('EndpointMapper', () => {
  let mapper: EndpointMapper;
  let config: ReturnType<typeof testUtils.createMockConfig>;

  beforeEach(() => {
    config = testUtils.createMockConfig();
    mapper = new EndpointMapper(config);
  });

  describe('constructor', () => {
    it('should initialize with correct API version', () => {
      expect(mapper).toBeInstanceOf(EndpointMapper);
    });

    it('should accept different API versions', () => {
      const latestConfig = { ...config, apiVersion: 'latest' as const };
      const latestMapper = new EndpointMapper(latestConfig);
      expect(latestMapper).toBeInstanceOf(EndpointMapper);

      const v2Config = { ...config, apiVersion: '2' as const };
      const v2Mapper = new EndpointMapper(v2Config);
      expect(v2Mapper).toBeInstanceOf(EndpointMapper);
    });
  });

  describe('mapEndpoint', () => {
    describe('exact endpoint mappings', () => {
      it('should map core API myself endpoint', () => {
        const result = mapper.mapEndpoint('/rest/api/3/myself');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/myself');
        expect(result.warnings).toEqual([]);
      });

      it('should map user search endpoint with query param transformation', () => {
        const result = mapper.mapEndpoint(
          '/rest/api/3/users',
          undefined,
          { username: 'testuser', query: 'test' }
        );

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/user/search');
        expect(result.transformedParams).toEqual({
          username: 'testuser',
          query: 'test'
        });
      });

      it('should map project versions endpoint with deprecation warning', () => {
        const result = mapper.mapEndpoint('/rest/api/3/project/TEST/version');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/project/TEST/versions');
        expect(result.deprecated).toBe(true);
        expect(result.warnings).toContain('Cloud endpoint /version mapped to DC /versions');
      });

      it('should map agile API endpoints without changes', () => {
        const result = mapper.mapEndpoint('/rest/agile/1.0/board');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/agile/1.0/board');
        expect(result.warnings).toEqual([]);
      });
    });

    describe('parameterized endpoint mappings', () => {
      it('should map issue endpoint with path parameters', () => {
        const result = mapper.mapEndpoint('/rest/api/3/issue/TEST-123');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/issue/TEST-123');
      });

      it('should map project endpoint with path parameters', () => {
        const result = mapper.mapEndpoint('/rest/api/3/project/MYPROJ');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/project/MYPROJ');
      });

      it('should map sprint endpoint with board ID', () => {
        const result = mapper.mapEndpoint('/rest/agile/1.0/board/123/sprint');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/agile/1.0/board/123/sprint');
      });
    });

    describe('unsupported endpoints', () => {
      it('should reject dashboard endpoints', () => {
        const result = mapper.mapEndpoint('/rest/api/3/dashboard');

        expect(result.supported).toBe(false);
        expect(result.dcEndpoint).toBe('');
        expect(result.warnings).toContain('Endpoint /rest/api/3/dashboard is not supported in Data Center');
      });

      it('should reject webhook endpoints', () => {
        const result = mapper.mapEndpoint('/rest/api/3/webhook');

        expect(result.supported).toBe(false);
        expect(result.warnings).toContain('Endpoint /rest/api/3/webhook is not supported in Data Center');
      });
    });

    describe('generic mappings', () => {
      it('should apply generic v3 to version mapping for unmapped endpoints', () => {
        const result = mapper.mapEndpoint('/rest/api/3/unknown/endpoint');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/api/latest/unknown/endpoint');
        expect(result.warnings).toContain('Generic mapping applied for /rest/api/3/unknown/endpoint');
      });

      it('should pass through agile API endpoints unchanged', () => {
        const result = mapper.mapEndpoint('/rest/agile/1.0/unknown/endpoint');

        expect(result.supported).toBe(true);
        expect(result.dcEndpoint).toBe('/rest/agile/1.0/unknown/endpoint');
        expect(result.warnings).toContain('Generic mapping applied for /rest/agile/1.0/unknown/endpoint');
      });

      it('should reject unmappable endpoints', () => {
        const result = mapper.mapEndpoint('/rest/unknown/api');

        expect(result.supported).toBe(false);
        expect(result.warnings).toContain('No mapping found for endpoint: /rest/unknown/api');
      });
    });

    describe('API version handling', () => {
      it('should use configured API version in mappings', () => {
        const v2Config = { ...config, apiVersion: '2' as const };
        const v2Mapper = new EndpointMapper(v2Config);

        const result = v2Mapper.mapEndpoint('/rest/api/3/myself');

        expect(result.dcEndpoint).toBe('/rest/api/2/myself');
      });
    });
  });

  describe('validateEndpointSupport', () => {
    it('should validate supported endpoints', () => {
      const result = mapper.validateEndpointSupport('/rest/api/3/myself');

      expect(result.supported).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject unsupported endpoints with reason', () => {
      const result = mapper.validateEndpointSupport('/rest/api/3/dashboard');

      expect(result.supported).toBe(false);
      expect(result.reason).toContain('not supported');
    });
  });

  describe('getSupportedEndpoints', () => {
    it('should return list of supported endpoints', () => {
      const endpoints = mapper.getSupportedEndpoints();

      expect(endpoints).toContain('/rest/api/3/myself');
      expect(endpoints).toContain('/rest/agile/1.0/board');
      expect(endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('getAPICapabilities', () => {
    it('should return capabilities for current API version', () => {
      const capabilities = mapper.getAPICapabilities();

      expect(capabilities.version).toBe('latest');
      expect(capabilities.supportedFeatures).toContain('core_api');
      expect(capabilities.supportedFeatures).toContain('agile_api');
      expect(Array.isArray(capabilities.deprecatedEndpoints)).toBe(true);
    });
  });

  describe('transformPathParams', () => {
    it('should replace path parameters in endpoint', () => {
      const endpoint = '/rest/api/latest/issue/{issueIdOrKey}';
      const params = { issueIdOrKey: 'TEST-123' };

      const result = mapper.transformPathParams(endpoint, params);

      expect(result).toBe('/rest/api/latest/issue/TEST-123');
    });

    it('should handle multiple path parameters', () => {
      const endpoint = '/rest/api/latest/project/{projectId}/version/{versionId}';
      const params = { projectId: 'PROJ', versionId: '1001' };

      const result = mapper.transformPathParams(endpoint, params);

      expect(result).toBe('/rest/api/latest/project/PROJ/version/1001');
    });
  });

  describe('adaptQueryParams', () => {
    it('should adapt query parameters based on endpoint mapping', () => {
      const cloudParams = { username: 'testuser', query: 'search' };
      const dcEndpoint = '/rest/api/latest/user/search';

      const result = mapper.adaptQueryParams(cloudParams, dcEndpoint);

      expect(result).toEqual({
        username: 'testuser',
        query: 'search'
      });
    });

    it('should pass through parameters when no mapping exists', () => {
      const cloudParams = { param1: 'value1', param2: 'value2' };
      const dcEndpoint = '/rest/api/latest/unknown';

      const result = mapper.adaptQueryParams(cloudParams, dcEndpoint);

      expect(result).toEqual(cloudParams);
    });
  });

  describe('edge cases', () => {
    it('should handle empty endpoint gracefully', () => {
      const result = mapper.mapEndpoint('');

      expect(result.supported).toBe(false);
    });

    it('should handle null/undefined parameters', () => {
      const result = mapper.mapEndpoint('/rest/api/3/myself', undefined, undefined);

      expect(result.supported).toBe(true);
      expect(result.dcEndpoint).toBe('/rest/api/latest/myself');
    });

    it('should handle endpoints with trailing slashes', () => {
      const result = mapper.mapEndpoint('/rest/api/3/myself/');

      expect(result.supported).toBe(true); // Generic mapping should work
      expect(result.dcEndpoint).toBe('/rest/api/latest/myself/');
    });
  });
});