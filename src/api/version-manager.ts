/**
 * API Version Manager for Data Center
 * Handles API version detection, negotiation, and capability management
 */

import type { JiraDataCenterConfig } from '../config/datacenter-config.js';
import type { PATAuthenticator } from '../auth/pat-authenticator.js';
import { logger } from '../utils/logger.js';

/**
 * Supported API versions in Data Center
 */
export type APIVersion = 'latest' | '2';

/**
 * API version capabilities and feature support
 */
export interface VersionCapabilities {
  version: APIVersion;
  features: {
    coreAPI: boolean;
    agileAPI: boolean;
    searchAPI: boolean;
    userManagement: boolean;
    projectManagement: boolean;
    issueManagement: boolean;
    filterManagement: boolean;
    commentManagement: boolean;
    transitionManagement: boolean;
    assignmentManagement: boolean;
  };
  endpoints: {
    supported: string[];
    deprecated: string[];
    new?: string[];
  };
  limitations?: string[];
}

/**
 * Version detection result
 */
export interface VersionDetectionResult {
  detectedVersion: APIVersion;
  alternativeVersions: APIVersion[];
  confidence: 'high' | 'medium' | 'low';
  testResults: {
    endpoint: string;
    version: APIVersion;
    success: boolean;
    responseTime: number;
  }[];
}

/**
 * API Version Manager
 * Handles version detection and capability management for DC instances
 */
export class APIVersionManager {
  private readonly logger = logger.child('APIVersionManager');
  private detectedVersion?: APIVersion;
  private lastDetection?: Date;
  private readonly DETECTION_CACHE_DURATION = 3600000; // 1 hour

  constructor(
    private config: JiraDataCenterConfig,
    private authenticator: PATAuthenticator
  ) {
    this.logger.debug('APIVersionManager initialized', {
      configuredVersion: config.apiVersion,
      baseUrl: config.baseUrl
    });
  }

  /**
   * Detect the best supported API version for the DC instance
   */
  async detectSupportedVersion(): Promise<VersionDetectionResult> {
    this.logger.info('Detecting supported API version', {
      baseUrl: this.config.baseUrl
    });

    const startTime = Date.now();
    const testResults: VersionDetectionResult['testResults'] = [];

    // Test endpoints for version detection
    const testEndpoints = [
      { path: '/rest/api/latest/myself', version: 'latest' as APIVersion },
      { path: '/rest/api/2/myself', version: '2' as APIVersion }
    ];

    for (const test of testEndpoints) {
      const testStart = Date.now();
      try {
        const success = await this.testEndpoint(test.path);
        const responseTime = Date.now() - testStart;
        
        testResults.push({
          endpoint: test.path,
          version: test.version,
          success,
          responseTime
        });

        this.logger.debug('Version test completed', {
          endpoint: test.path,
          version: test.version,
          success,
          responseTime
        });
      } catch (error) {
        const responseTime = Date.now() - testStart;
        testResults.push({
          endpoint: test.path,
          version: test.version,
          success: false,
          responseTime
        });

        this.logger.warn('Version test failed', {
          endpoint: test.path,
          version: test.version,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Analyze results to determine best version
    const result = this.analyzeTestResults(testResults);
    
    // Cache detection result
    this.detectedVersion = result.detectedVersion;
    this.lastDetection = new Date();

    const totalTime = Date.now() - startTime;
    this.logger.info('API version detection completed', {
      detectedVersion: result.detectedVersion,
      confidence: result.confidence,
      totalTime
    });

    return result;
  }

  /**
   * Test an endpoint for availability
   */
  private async testEndpoint(endpoint: string): Promise<boolean> {
    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const contextPath = this.config.contextPath || '';
    const url = `${baseUrl}${contextPath}${endpoint}`;

    try {
      const authHeaders = this.authenticator.getAuthHeaders();
      const headers = {
        'Authorization': authHeaders['Authorization'],
        'Accept': authHeaders['Accept'],
        'User-Agent': authHeaders['User-Agent']
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      this.logger.debug('Endpoint test failed', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Analyze test results to determine optimal API version
   */
  private analyzeTestResults(results: VersionDetectionResult['testResults']): VersionDetectionResult {
    const successfulVersions = results
      .filter(r => r.success)
      .map(r => r.version);

    // Determine best version based on success and preference
    let detectedVersion: APIVersion;
    let confidence: 'high' | 'medium' | 'low';
    let alternativeVersions: APIVersion[];

    if (successfulVersions.includes('latest')) {
      // Prefer 'latest' if available
      detectedVersion = 'latest';
      confidence = 'high';
      alternativeVersions = successfulVersions.filter(v => v !== 'latest');
    } else if (successfulVersions.includes('2')) {
      // Fallback to 'v2'
      detectedVersion = '2';
      confidence = successfulVersions.length === 1 ? 'high' : 'medium';
      alternativeVersions = [];
    } else {
      // No version working, use configured version as fallback
      detectedVersion = this.config.apiVersion;
      confidence = 'low';
      alternativeVersions = [];
    }

    return {
      detectedVersion,
      alternativeVersions,
      confidence,
      testResults: results
    };
  }

  /**
   * Get capabilities for specified API version
   */
  getVersionCapabilities(version: APIVersion): VersionCapabilities {
    switch (version) {
      case 'latest':
        return {
          version: 'latest',
          features: {
            coreAPI: true,
            agileAPI: true,
            searchAPI: true,
            userManagement: true,
            projectManagement: true,
            issueManagement: true,
            filterManagement: true,
            commentManagement: true,
            transitionManagement: true,
            assignmentManagement: true
          },
          endpoints: {
            supported: [
              '/rest/api/latest/*',
              '/rest/agile/1.0/*'
            ],
            deprecated: [],
            new: [
              '/rest/api/latest/issue/{key}/assignable/multiProjectSearch'
            ]
          }
        };

      case '2':
        return {
          version: '2',
          features: {
            coreAPI: true,
            agileAPI: true,
            searchAPI: true,
            userManagement: true,
            projectManagement: true,
            issueManagement: true,
            filterManagement: true,
            commentManagement: true,
            transitionManagement: true,
            assignmentManagement: true
          },
          endpoints: {
            supported: [
              '/rest/api/2/*',
              '/rest/agile/1.0/*'
            ],
            deprecated: [
              '/rest/api/2/user/search',
              '/rest/api/2/project/{key}/versions'
            ]
          },
          limitations: [
            'Some newer features may not be available',
            'Deprecated endpoints may be removed in future versions'
          ]
        };

      default:
        throw new Error(`Unsupported API version: ${version}`);
    }
  }

  /**
   * Validate version compatibility for required features
   */
  validateVersionCompatibility(requiredFeatures: string[]): {
    compatible: boolean;
    missingFeatures: string[];
    recommendations: string[];
  } {
    const capabilities = this.getVersionCapabilities(this.getCurrentVersion());
    const missingFeatures: string[] = [];
    const recommendations: string[] = [];

    for (const feature of requiredFeatures) {
      const featureKey = feature as keyof VersionCapabilities['features'];
      if (capabilities.features[featureKey] === false) {
        missingFeatures.push(feature);
      }
    }

    if (missingFeatures.length > 0) {
      recommendations.push('Consider upgrading to a newer Data Center version');
      recommendations.push('Check alternative endpoints or approaches');
    }

    return {
      compatible: missingFeatures.length === 0,
      missingFeatures,
      recommendations
    };
  }

  /**
   * Negotiate the best API version for the current DC instance
   */
  async negotiateBestVersion(): Promise<APIVersion> {
    // Use cached detection if recent
    if (this.detectedVersion && this.isDetectionFresh()) {
      this.logger.debug('Using cached version detection', {
        version: this.detectedVersion
      });
      return this.detectedVersion;
    }

    // Perform fresh detection
    const detection = await this.detectSupportedVersion();
    return detection.detectedVersion;
  }

  /**
   * Check if version detection is still fresh
   */
  private isDetectionFresh(): boolean {
    if (!this.lastDetection) return false;
    
    const age = Date.now() - this.lastDetection.getTime();
    return age < this.DETECTION_CACHE_DURATION;
  }

  /**
   * Get current API version (detected or configured)
   */
  getCurrentVersion(): APIVersion {
    return this.detectedVersion || this.config.apiVersion;
  }

  /**
   * Update API version configuration
   */
  updateVersion(version: APIVersion): void {
    this.detectedVersion = version;
    this.config.apiVersion = version;
    this.lastDetection = new Date(); // Set detection time to mark as fresh
    
    this.logger.info('API version updated', {
      newVersion: version
    });
  }

  /**
   * Get version-specific endpoint recommendations
   */
  getEndpointRecommendations(cloudEndpoint: string): {
    recommended: string;
    alternatives: string[];
    warnings: string[];
  } {
    const version = this.getCurrentVersion();
    const capabilities = this.getVersionCapabilities(version);

    // Basic v3 → version mapping
    const recommended = cloudEndpoint.replace('/rest/api/3/', `/rest/api/${version}/`);
    
    const alternatives: string[] = [];
    const warnings: string[] = [];

    // Add version-specific warnings
    if (version === '2') {
      warnings.push('Using API v2 - some newer features may not be available');
    }

    // Check for deprecated endpoints
    const isDeprecated = capabilities.endpoints.deprecated.some(dep => 
      recommended.startsWith(dep.replace('*', ''))
    );

    if (isDeprecated) {
      warnings.push('This endpoint is deprecated in the current API version');
    }

    return {
      recommended,
      alternatives,
      warnings
    };
  }

  /**
   * Clear version detection cache
   */
  clearCache(): void {
    delete this.detectedVersion;
    delete this.lastDetection;
    
    this.logger.debug('Version detection cache cleared');
  }

  /**
   * Get version detection summary
   */
  getDetectionSummary(): {
    currentVersion: APIVersion;
    detectionAge?: number;
    capabilities: VersionCapabilities;
    cacheValid: boolean;
  } {
    const currentVersion = this.getCurrentVersion();
    const capabilities = this.getVersionCapabilities(currentVersion);
    
    const result: {
      currentVersion: APIVersion;
      detectionAge?: number;
      capabilities: VersionCapabilities;
      cacheValid: boolean;
    } = {
      currentVersion,
      capabilities,
      cacheValid: this.isDetectionFresh()
    };

    if (this.lastDetection) {
      result.detectionAge = Date.now() - this.lastDetection.getTime();
    }

    return result;
  }
}