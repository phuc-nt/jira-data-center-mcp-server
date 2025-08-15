/**
 * Project Management for Core Module
 * Handles all project-related operations using Data Center API v2/latest
 * HIGH COMPATIBILITY - Minimal changes from Cloud to DC
 */

import type { DataCenterAPIClient } from '../../api/datacenter-client.js';
import type { 
  Project, 
  ProjectListParams,
  ProjectListResponse,
  Version,
  PaginatedResponse
} from './types.js';
import { logger } from '../../utils/logger.js';

export class ProjectManager {
  private readonly logger = logger.child('ProjectManager');

  constructor(private apiClient: DataCenterAPIClient) {
    this.logger.debug('ProjectManager initialized');
  }

  /**
   * Get project details by ID or key
   * Tool: getProject
   * Endpoint: /rest/api/2/project/{projectIdOrKey}
   * Compatibility: HIGH - Version change only (v3 → v2)
   */
  async getProject(params: {
    projectIdOrKey: string;
    expand?: string[];
    properties?: string[];
  }): Promise<Project> {
    this.logger.debug('Getting project details', { params });

    if (!params.projectIdOrKey || params.projectIdOrKey.trim().length === 0) {
      throw new Error('Project ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.properties && params.properties.length > 0) {
      queryParams.properties = params.properties.join(',');
    }

    try {
      const response = await this.apiClient.request<Project>(
        `/rest/api/2/project/${encodeURIComponent(params.projectIdOrKey)}`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Project retrieved successfully', {
        projectId: response.data.id,
        projectKey: response.data.key,
        projectName: response.data.name,
        projectType: response.data.projectTypeKey,
        isSimplified: response.data.simplified
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectIdOrKey: params.projectIdOrKey
      });
      throw error;
    }
  }

  /**
   * List projects with filtering and pagination
   * Tool: listProjects
   * Endpoint: /rest/api/2/project
   * Compatibility: HIGH - Version change only (v3 → v2)
   */
  async listProjects(params: ProjectListParams = {}): Promise<ProjectListResponse> {
    this.logger.debug('Listing projects', { params });

    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.recent !== undefined) {
      queryParams.recent = params.recent;
    }

    if (params.properties && params.properties.length > 0) {
      queryParams.properties = params.properties.join(',');
    }

    if (params.typeKey) {
      queryParams.typeKey = params.typeKey;
    }

    if (params.categoryId !== undefined) {
      queryParams.categoryId = params.categoryId;
    }

    if (params.action) {
      queryParams.action = params.action;
    }

    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    if (params.maxResults !== undefined) {
      queryParams.maxResults = params.maxResults;
    }

    try {
      // DC may return array directly or paginated response
      const response = await this.apiClient.request<Project[] | ProjectListResponse>(
        '/rest/api/2/project',
        {
          method: 'GET',
          queryParams
        }
      );

      let formattedResponse: ProjectListResponse;

      // Handle both response formats
      if (Array.isArray(response.data)) {
        // DC returns array directly for some cases
        const projects = response.data;
        const startAt = params.startAt || 0;
        const maxResults = params.maxResults || 50;
        
        formattedResponse = {
          self: '/rest/api/2/project',
          maxResults,
          startAt,
          total: projects.length,
          isLast: projects.length < maxResults,
          values: projects
        };
      } else {
        // Already in paginated format
        formattedResponse = response.data as ProjectListResponse;
      }

      this.logger.info('Projects listed successfully', {
        total: formattedResponse.total,
        returned: formattedResponse.values.length,
        startAt: formattedResponse.startAt,
        maxResults: formattedResponse.maxResults
      });

      return formattedResponse;
    } catch (error) {
      this.logger.error('Failed to list projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
        startAt: params.startAt,
        maxResults: params.maxResults,
        typeKey: params.typeKey
      });
      throw error;
    }
  }

  /**
   * List project versions
   * Tool: listProjectVersions
   * Endpoint: /rest/api/2/project/{projectIdOrKey}/versions
   * Compatibility: MODERATE - Endpoint changed from Cloud (/rest/api/3/project/{projectIdOrKey}/version)
   */
  async listProjectVersions(params: {
    projectIdOrKey: string;
    expand?: string[];
    startAt?: number;
    maxResults?: number;
    orderBy?: string;
    query?: string;
    status?: string;
  }): Promise<Version[]> {
    this.logger.debug('Listing project versions', { params });

    if (!params.projectIdOrKey || params.projectIdOrKey.trim().length === 0) {
      throw new Error('Project ID or key is required');
    }

    const queryParams: Record<string, unknown> = {};
    
    if (params.expand && params.expand.length > 0) {
      queryParams.expand = params.expand.join(',');
    }

    if (params.startAt !== undefined) {
      queryParams.startAt = params.startAt;
    }

    if (params.maxResults !== undefined) {
      queryParams.maxResults = params.maxResults;
    }

    if (params.orderBy) {
      queryParams.orderBy = params.orderBy;
    }

    if (params.query) {
      queryParams.query = params.query;
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    try {
      const response = await this.apiClient.request<Version[]>(
        `/rest/api/2/project/${encodeURIComponent(params.projectIdOrKey)}/versions`,
        {
          method: 'GET',
          queryParams
        }
      );

      this.logger.info('Project versions listed successfully', {
        projectIdOrKey: params.projectIdOrKey,
        versionsCount: response.data.length,
        query: params.query,
        status: params.status
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to list project versions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectIdOrKey: params.projectIdOrKey,
        query: params.query,
        status: params.status
      });
      throw error;
    }
  }

  /**
   * Get project components
   * Utility method for project component management
   */
  async getProjectComponents(projectIdOrKey: string): Promise<any[]> {
    this.logger.debug('Getting project components', { projectIdOrKey });

    if (!projectIdOrKey || projectIdOrKey.trim().length === 0) {
      throw new Error('Project ID or key is required');
    }

    try {
      const response = await this.apiClient.request<any[]>(
        `/rest/api/2/project/${encodeURIComponent(projectIdOrKey)}/components`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Project components retrieved successfully', {
        projectIdOrKey,
        componentsCount: response.data.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get project components', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectIdOrKey
      });
      throw error;
    }
  }

  /**
   * Get project roles
   * Utility method for project permission management
   */
  async getProjectRoles(projectIdOrKey: string): Promise<Record<string, string>> {
    this.logger.debug('Getting project roles', { projectIdOrKey });

    if (!projectIdOrKey || projectIdOrKey.trim().length === 0) {
      throw new Error('Project ID or key is required');
    }

    try {
      const response = await this.apiClient.request<Record<string, string>>(
        `/rest/api/2/project/${encodeURIComponent(projectIdOrKey)}/role`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Project roles retrieved successfully', {
        projectIdOrKey,
        rolesCount: Object.keys(response.data).length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get project roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectIdOrKey
      });
      throw error;
    }
  }

  /**
   * Get project issue types
   * Utility method for project configuration
   */
  async getProjectIssueTypes(projectIdOrKey: string): Promise<any[]> {
    this.logger.debug('Getting project issue types', { projectIdOrKey });

    if (!projectIdOrKey || projectIdOrKey.trim().length === 0) {
      throw new Error('Project ID or key is required');
    }

    try {
      const response = await this.apiClient.request<any[]>(
        `/rest/api/2/project/${encodeURIComponent(projectIdOrKey)}/issuetypes`,
        {
          method: 'GET'
        }
      );

      this.logger.info('Project issue types retrieved successfully', {
        projectIdOrKey,
        issueTypesCount: response.data.length
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get project issue types', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectIdOrKey
      });
      throw error;
    }
  }

  /**
   * Validate project access and permissions
   */
  async validateProjectAccess(projectIdOrKey: string): Promise<{
    accessible: boolean;
    canEdit: boolean;
    reason?: string;
  }> {
    this.logger.debug('Validating project access', { projectIdOrKey });

    try {
      const project = await this.getProject({ 
        projectIdOrKey,
        expand: ['permissions']
      });
      
      return {
        accessible: true,
        canEdit: project.permissions?.canEdit ?? false
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
   * Get project statistics and metadata
   */
  async getProjectStats(projectIdOrKey: string): Promise<{
    projectId: string;
    projectKey: string;
    name: string;
    projectType: string;
    lead?: string;
    isSimplified: boolean;
    componentCount: number;
    versionCount: number;
    issueTypeCount: number;
    totalIssueCount?: number;
    lastIssueUpdate?: string;
  }> {
    const [project, components, versions, issueTypes] = await Promise.all([
      this.getProject({ 
        projectIdOrKey,
        expand: ['insight', 'lead']
      }),
      this.getProjectComponents(projectIdOrKey).catch(() => []),
      this.listProjectVersions({ projectIdOrKey }).catch(() => []),
      this.getProjectIssueTypes(projectIdOrKey).catch(() => [])
    ]);

    return {
      projectId: project.id,
      projectKey: project.key,
      name: project.name,
      projectType: project.projectTypeKey || 'unknown',
      lead: project.lead?.displayName,
      isSimplified: project.simplified || false,
      componentCount: components.length,
      versionCount: versions.length,
      issueTypeCount: issueTypes.length,
      totalIssueCount: project.insight?.totalIssueCount,
      lastIssueUpdate: project.insight?.lastIssueUpdateTime
    };
  }
}