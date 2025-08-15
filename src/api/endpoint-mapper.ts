/**
 * Endpoint Mapper for Cloud → Data Center API adaptation
 * Maps Jira Cloud API v3 endpoints to Data Center API v2/latest equivalents
 */

import type { JiraDataCenterConfig } from '../config/datacenter-config.js';
import { logger } from '../utils/logger.js';

/**
 * API endpoint mapping configuration
 */
export interface EndpointMapping {
  cloudPath: string;
  dcPath: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  deprecationWarning?: string;
  minDCVersion?: string;
}

/**
 * API version capabilities
 */
export interface APICapabilities {
  version: 'latest' | '2';
  supportedFeatures: string[];
  deprecatedEndpoints: string[];
  newEndpoints?: string[];
}

/**
 * Endpoint mapping result
 */
export interface MappingResult {
  dcEndpoint: string;
  transformedParams?: Record<string, unknown>;
  warnings?: string[];
  deprecated?: boolean;
  supported: boolean;
}

/**
 * Endpoint Mapper class
 * Handles Cloud API v3 → DC API v2/latest endpoint mapping
 */
export class EndpointMapper {
  private readonly logger = logger.child('EndpointMapper');
  private readonly apiVersion: 'latest' | '2';
  
  /**
   * Static endpoint mappings from Cloud to Data Center
   */
  private readonly staticMappings: Record<string, EndpointMapping> = {
    // Core API version changes (most common)
    '/rest/api/3/myself': {
      cloudPath: '/rest/api/3/myself',
      dcPath: '/rest/api/{version}/myself'
    },
    
    // User management mappings
    '/rest/api/3/users': {
      cloudPath: '/rest/api/3/users',
      dcPath: '/rest/api/{version}/user/search',
      queryParams: {
        'accountId': 'accountId',
        'username': 'username',
        'query': 'query'
      }
    },
    '/rest/api/3/user': {
      cloudPath: '/rest/api/3/user',
      dcPath: '/rest/api/{version}/user',
      queryParams: {
        'accountId': 'accountId',
        'username': 'username'
      }
    },
    
    // Project management mappings
    '/rest/api/3/project': {
      cloudPath: '/rest/api/3/project',
      dcPath: '/rest/api/{version}/project'
    },
    '/rest/api/3/project/{projectIdOrKey}': {
      cloudPath: '/rest/api/3/project/{projectIdOrKey}',
      dcPath: '/rest/api/{version}/project/{projectIdOrKey}'
    },
    '/rest/api/3/project/{projectIdOrKey}/versions': {
      cloudPath: '/rest/api/3/project/{projectIdOrKey}/versions',
      dcPath: '/rest/api/{version}/project/{projectIdOrKey}/versions'
    },
    
    // Issue management mappings
    '/rest/api/3/issue': {
      cloudPath: '/rest/api/3/issue',
      dcPath: '/rest/api/{version}/issue'
    },
    '/rest/api/3/issue/{issueIdOrKey}': {
      cloudPath: '/rest/api/3/issue/{issueIdOrKey}',
      dcPath: '/rest/api/{version}/issue/{issueIdOrKey}'
    },
    '/rest/api/3/issue/{issueIdOrKey}/assignee': {
      cloudPath: '/rest/api/3/issue/{issueIdOrKey}/assignee',
      dcPath: '/rest/api/{version}/issue/{issueIdOrKey}/assignee'
    },
    '/rest/api/3/issue/{issueIdOrKey}/transitions': {
      cloudPath: '/rest/api/3/issue/{issueIdOrKey}/transitions',
      dcPath: '/rest/api/{version}/issue/{issueIdOrKey}/transitions'
    },
    '/rest/api/3/issue/{issueIdOrKey}/comment': {
      cloudPath: '/rest/api/3/issue/{issueIdOrKey}/comment',
      dcPath: '/rest/api/{version}/issue/{issueIdOrKey}/comment'
    },
    
    // Search mappings
    '/rest/api/3/search': {
      cloudPath: '/rest/api/3/search',
      dcPath: '/rest/api/{version}/search'
    },
    '/rest/api/3/issue/{issueIdOrKey}/assignable/search': {
      cloudPath: '/rest/api/3/issue/{issueIdOrKey}/assignable/search',
      dcPath: '/rest/api/{version}/user/assignable/multiProjectSearch',
      queryParams: {
        'issueKey': 'issueKey',
        'query': 'username'
      }
    },
    
    // Filter mappings  
    '/rest/api/3/filter': {
      cloudPath: '/rest/api/3/filter',
      dcPath: '/rest/api/{version}/filter'
    },
    '/rest/api/3/filter/{id}': {
      cloudPath: '/rest/api/3/filter/{id}',
      dcPath: '/rest/api/{version}/filter/{id}'
    },
    
    // Version mappings with path changes
    '/rest/api/3/project/{projectIdOrKey}/version': {
      cloudPath: '/rest/api/3/project/{projectIdOrKey}/version',
      dcPath: '/rest/api/{version}/project/{projectIdOrKey}/versions',
      deprecationWarning: 'Cloud endpoint /version mapped to DC /versions'
    },
    
    // Agile API mappings (HIGH COMPATIBILITY - no changes needed)
    '/rest/agile/1.0/board': {
      cloudPath: '/rest/agile/1.0/board', 
      dcPath: '/rest/agile/1.0/board'
    },
    '/rest/agile/1.0/board/{boardId}': {
      cloudPath: '/rest/agile/1.0/board/{boardId}',
      dcPath: '/rest/agile/1.0/board/{boardId}'
    },
    '/rest/agile/1.0/board/{boardId}/sprint': {
      cloudPath: '/rest/agile/1.0/board/{boardId}/sprint',
      dcPath: '/rest/agile/1.0/board/{boardId}/sprint'
    },
    '/rest/agile/1.0/sprint': {
      cloudPath: '/rest/agile/1.0/sprint',
      dcPath: '/rest/agile/1.0/sprint'
    },
    '/rest/agile/1.0/sprint/{sprintId}': {
      cloudPath: '/rest/agile/1.0/sprint/{sprintId}',
      dcPath: '/rest/agile/1.0/sprint/{sprintId}'
    },
    '/rest/agile/1.0/sprint/{sprintId}/issue': {
      cloudPath: '/rest/agile/1.0/sprint/{sprintId}/issue',
      dcPath: '/rest/agile/1.0/sprint/{sprintId}/issue'
    },
    '/rest/agile/1.0/board/{boardId}/backlog': {
      cloudPath: '/rest/agile/1.0/board/{boardId}/backlog',
      dcPath: '/rest/agile/1.0/board/{boardId}/backlog'
    },
    '/rest/agile/1.0/board/{boardId}/configuration': {
      cloudPath: '/rest/agile/1.0/board/{boardId}/configuration',
      dcPath: '/rest/agile/1.0/board/{boardId}/configuration'
    },
    '/rest/agile/1.0/issue/{issueIdOrKey}/estimate': {
      cloudPath: '/rest/agile/1.0/issue/{issueIdOrKey}/estimate',
      dcPath: '/rest/agile/1.0/issue/{issueIdOrKey}/estimate'
    },
    '/rest/agile/1.0/epic/{epicIdOrKey}/issue': {
      cloudPath: '/rest/agile/1.0/epic/{epicIdOrKey}/issue',
      dcPath: '/rest/agile/1.0/epic/{epicIdOrKey}/issue'
    }
  };

  /**
   * Unsupported endpoints in Data Center
   */
  private readonly unsupportedEndpoints: string[] = [
    '/rest/api/3/dashboard',        // Dashboard management not in DC
    '/rest/api/3/webhook',          // Webhook management different in DC
    '/rest/api/3/app',              // App management Cloud-specific
    '/rest/api/3/configuration',    // Configuration API different
    '/rest/api/3/announcement',     // Announcement API not in DC
    '/rest/api/3/avatar',           // Avatar API different in DC
    '/rest/api/3/jql/autocomplete'  // JQL autocomplete different implementation
  ];

  constructor(public config: JiraDataCenterConfig) {
    this.apiVersion = config.apiVersion;
    this.logger.debug('EndpointMapper initialized', {
      apiVersion: this.apiVersion,
      baseUrl: config.baseUrl
    });
  }

  /**
   * Map Cloud endpoint to Data Center equivalent
   */
  mapEndpoint(
    cloudEndpoint: string,
    pathParams?: Record<string, string>,
    queryParams?: Record<string, unknown>
  ): MappingResult {
    this.logger.debug('Mapping endpoint', {
      cloudEndpoint,
      pathParams,
      queryParams
    });

    // Check if endpoint is unsupported
    if (this.isUnsupportedEndpoint(cloudEndpoint)) {
      return {
        dcEndpoint: '',
        supported: false,
        warnings: [`Endpoint ${cloudEndpoint} is not supported in Data Center`]
      };
    }

    // Try exact mapping first
    const exactMapping = this.staticMappings[cloudEndpoint];
    if (exactMapping) {
      return this.applyMapping(exactMapping, pathParams, queryParams);
    }

    // Try pattern matching for parameterized endpoints
    const patternMapping = this.findPatternMapping(cloudEndpoint);
    if (patternMapping) {
      return this.applyMapping(patternMapping, pathParams, queryParams, cloudEndpoint);
    }

    // Try generic API version transformation
    const genericMapping = this.tryGenericMapping(cloudEndpoint);
    if (genericMapping) {
      return {
        dcEndpoint: genericMapping,
        supported: true,
        warnings: [`Generic mapping applied for ${cloudEndpoint}`]
      };
    }

    // Endpoint not found
    return {
      dcEndpoint: '',
      supported: false,
      warnings: [`No mapping found for endpoint: ${cloudEndpoint}`]
    };
  }

  /**
   * Check if endpoint is explicitly unsupported
   */
  private isUnsupportedEndpoint(endpoint: string): boolean {
    return this.unsupportedEndpoints.some(unsupported => 
      endpoint.startsWith(unsupported)
    );
  }

  /**
   * Find pattern mapping for parameterized endpoints
   */
  private findPatternMapping(cloudEndpoint: string): EndpointMapping | null {
    for (const [pattern, mapping] of Object.entries(this.staticMappings)) {
      if (this.matchesPattern(cloudEndpoint, pattern)) {
        return mapping;
      }
    }
    return null;
  }

  /**
   * Check if endpoint matches a parameterized pattern
   */
  private matchesPattern(endpoint: string, pattern: string): boolean {
    // Convert pattern with {param} to regex
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '[^/]+')  // Replace {param} with [^/]+
      .replace(/\//g, '\\/');         // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  /**
   * Extract path parameters from actual endpoint using pattern
   */
  private extractPathParams(actualEndpoint: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Find all parameter names in pattern
    const paramMatches = pattern.match(/\{([^}]+)\}/g);
    if (!paramMatches) return params;
    
    const paramNames = paramMatches.map(match => match.slice(1, -1)); // Remove { }
    
    // Create regex to capture parameter values
    let regexPattern = pattern;
    paramNames.forEach(paramName => {
      regexPattern = regexPattern.replace(`{${paramName}}`, '([^/]+)');
    });
    regexPattern = regexPattern.replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = actualEndpoint.match(regex);
    
    if (match) {
      paramNames.forEach((paramName, index) => {
        const value = match[index + 1]; // +1 because match[0] is full match
        if (value) {
          params[paramName] = value;
        }
      });
    }
    
    return params;
  }

  /**
   * Apply mapping configuration to create DC endpoint
   */
  private applyMapping(
    mapping: EndpointMapping,
    pathParams?: Record<string, string>,
    queryParams?: Record<string, unknown>,
    originalEndpoint?: string
  ): MappingResult {
    let dcEndpoint = mapping.dcPath;
    const warnings: string[] = [];
    const transformedParams: Record<string, unknown> = {};

    // Replace API version placeholder
    dcEndpoint = dcEndpoint.replace('{version}', this.apiVersion);

    // Extract path parameters from original endpoint if needed
    if (originalEndpoint && !pathParams) {
      const extractedParams = this.extractPathParams(originalEndpoint, mapping.cloudPath);
      if (Object.keys(extractedParams).length > 0) {
        // Apply extracted parameters to DC endpoint
        for (const [param, value] of Object.entries(extractedParams)) {
          if (value) {
            dcEndpoint = dcEndpoint.replace(`{${param}}`, value);
          }
        }
      }
    }

    // Apply explicit path parameter transformations
    if (pathParams && mapping.pathParams) {
      for (const [cloudParam, dcParam] of Object.entries(mapping.pathParams)) {
        if (pathParams[cloudParam]) {
          dcEndpoint = dcEndpoint.replace(`{${dcParam}}`, pathParams[cloudParam]);
        }
      }
    } else if (pathParams) {
      // Apply path parameters directly if no explicit mapping
      for (const [param, value] of Object.entries(pathParams)) {
        dcEndpoint = dcEndpoint.replace(`{${param}}`, value);
      }
    }

    // Apply query parameter transformations
    if (queryParams && mapping.queryParams) {
      for (const [cloudParam, dcParam] of Object.entries(mapping.queryParams)) {
        if (queryParams[cloudParam] !== undefined) {
          transformedParams[dcParam] = queryParams[cloudParam];
        }
      }
    } else if (queryParams) {
      // Pass through query params if no explicit mapping
      Object.assign(transformedParams, queryParams);
    }

    // Add deprecation warning if applicable
    if (mapping.deprecationWarning) {
      warnings.push(mapping.deprecationWarning);
    }

    this.logger.debug('Mapping applied', {
      cloudPath: mapping.cloudPath,
      dcEndpoint,
      transformedParams,
      warnings
    });

    return {
      dcEndpoint,
      transformedParams,
      warnings,
      deprecated: !!mapping.deprecationWarning,
      supported: true
    };
  }

  /**
   * Try generic API version transformation as fallback
   */
  private tryGenericMapping(cloudEndpoint: string): string | null {
    // Simple v3 → version replacement for unmapped endpoints
    if (cloudEndpoint.startsWith('/rest/api/3/')) {
      return cloudEndpoint.replace('/rest/api/3/', `/rest/api/${this.apiVersion}/`);
    }
    
    // Agile API should work as-is
    if (cloudEndpoint.startsWith('/rest/agile/1.0/')) {
      return cloudEndpoint;
    }

    return null;
  }

  /**
   * Validate endpoint support for current DC version
   */
  validateEndpointSupport(endpoint: string): { supported: boolean; reason?: string } {
    const mappingResult = this.mapEndpoint(endpoint);
    
    if (!mappingResult.supported) {
      return {
        supported: false,
        reason: mappingResult.warnings?.[0] || 'Endpoint not supported'
      };
    }

    return { supported: true };
  }

  /**
   * Get all supported endpoints for current configuration
   */
  getSupportedEndpoints(): string[] {
    return Object.keys(this.staticMappings);
  }

  /**
   * Get API capabilities for current version
   */
  getAPICapabilities(): APICapabilities {
    const capabilities: APICapabilities = {
      version: this.apiVersion,
      supportedFeatures: [
        'core_api',
        'agile_api',
        'search_api',
        'user_management',
        'project_management',
        'issue_management'
      ],
      deprecatedEndpoints: []
    };

    // Add deprecated endpoints
    for (const mapping of Object.values(this.staticMappings)) {
      if (mapping.deprecationWarning) {
        capabilities.deprecatedEndpoints.push(mapping.cloudPath);
      }
    }

    return capabilities;
  }

  /**
   * Transform path parameters in endpoint URL
   */
  transformPathParams(endpoint: string, params: Record<string, string>): string {
    let transformedEndpoint = endpoint;
    
    for (const [key, value] of Object.entries(params)) {
      transformedEndpoint = transformedEndpoint.replace(`{${key}}`, value);
    }
    
    return transformedEndpoint;
  }

  /**
   * Adapt query parameters for DC endpoint
   */
  adaptQueryParams(
    cloudParams: Record<string, unknown>,
    dcEndpoint: string
  ): Record<string, unknown> {
    // Find mapping for the endpoint to apply query param transformations
    const mapping = Object.values(this.staticMappings).find(m => 
      dcEndpoint.includes(m.dcPath.replace('{version}', this.apiVersion))
    );

    if (mapping?.queryParams) {
      const adaptedParams: Record<string, unknown> = {};
      
      for (const [cloudParam, dcParam] of Object.entries(mapping.queryParams)) {
        if (cloudParams[cloudParam] !== undefined) {
          adaptedParams[dcParam] = cloudParams[cloudParam];
        }
      }
      
      // Include any params not explicitly mapped
      for (const [key, value] of Object.entries(cloudParams)) {
        if (!mapping.queryParams[key]) {
          adaptedParams[key] = value;
        }
      }
      
      return adaptedParams;
    }

    // No specific mapping, return params as-is
    return cloudParams;
  }
}