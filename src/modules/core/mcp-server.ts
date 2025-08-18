#!/usr/bin/env node

/**
 * MCP Jira Data Center Core Module Server
 * Provides 14 Core tools for User, Project, Issue CRUD, and Lifecycle management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CoreModule } from './index.js';
import { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { logger } from '../../utils/logger.js';

const serverLogger = logger.child('CoreMCPServer');

/**
 * Core Module MCP Server Class
 * Provides 14 Core tools: User Management (3), Project Management (3), Issue CRUD (5), Issue Lifecycle (3)
 */
class CoreMCPServer {
  private server: Server;
  private coreModule: CoreModule;
  private config: JiraDataCenterConfig;
  private authenticator: PATAuthenticator;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-jira-dc-core',
        version: '1.0.0-DC',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize configuration
    this.config = this.loadConfiguration();
    this.authenticator = new PATAuthenticator(this.config);

    // Initialize Core module
    this.coreModule = new CoreModule(this.config, this.authenticator);

    this.setupToolHandlers();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): JiraDataCenterConfig {
    const baseUrl = process.env.JIRA_BASE_URL;
    const pat = process.env.JIRA_PAT;

    if (!baseUrl || !pat) {
      throw new Error('JIRA_BASE_URL and JIRA_PAT environment variables are required');
    }

    return {
      baseUrl,
      personalAccessToken: pat,
      contextPath: process.env.JIRA_CONTEXT_PATH || '',
      apiVersion: process.env.JIRA_API_VERSION || '2',
      timeout: parseInt(process.env.JIRA_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.JIRA_MAX_RETRIES || '3'),
      validateSsl: process.env.JIRA_VALIDATE_SSL !== 'false',
    };
  }

  /**
   * Setup MCP tool handlers for Core module tools (14 tools)
   */
  private setupToolHandlers() {
    // List all Core module tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // User Management Tools (3 tools)
          {
            name: 'getUser',
            description: 'Get user by accountId or username',
            inputSchema: {
              type: 'object',
              properties: {
                accountId: { type: 'string' },
                username: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          {
            name: 'listUsers',
            description: 'List users with search functionality',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                username: { type: 'string' },
                accountId: { type: 'string' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                includeActive: { type: 'boolean' },
                includeInactive: { type: 'boolean' },
              },
            },
          },
          {
            name: 'getAssignableUsers',
            description: 'Get assignable users for an issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: { type: 'string' },
                project: { type: 'string' },
                query: { type: 'string' },
                sessionId: { type: 'string' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
              },
            },
          },
          // Project Management Tools (3 tools)
          {
            name: 'getProject',
            description: 'Get project details',
            inputSchema: {
              type: 'object',
              properties: {
                projectIdOrKey: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
                properties: { type: 'array', items: { type: 'string' } },
              },
              required: ['projectIdOrKey'],
            },
          },
          {
            name: 'listProjects',
            description: 'List projects',
            inputSchema: {
              type: 'object',
              properties: {
                expand: { type: 'array', items: { type: 'string' } },
                recent: { type: 'number' },
                properties: { type: 'array', items: { type: 'string' } },
                typeKey: { type: 'string' },
                categoryId: { type: 'number' },
                action: { type: 'string', enum: ['view', 'browse', 'edit'] },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
              },
            },
          },
          {
            name: 'listProjectVersions',
            description: 'List project versions',
            inputSchema: {
              type: 'object',
              properties: {
                projectIdOrKey: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                orderBy: { type: 'string' },
                query: { type: 'string' },
                status: { type: 'string' },
              },
              required: ['projectIdOrKey'],
            },
          },
          // Issue CRUD Tools (5 tools)
          {
            name: 'createIssue',
            description: 'Create new issue',
            inputSchema: {
              type: 'object',
              properties: {
                fields: { type: 'object' },
                update: { type: 'object' },
                historyMetadata: { type: 'object' },
                properties: { type: 'array' },
              },
              required: ['fields'],
            },
          },
          {
            name: 'updateIssue',
            description: 'Update existing issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                update: { type: 'object' },
                notifyUsers: { type: 'boolean' },
                overrideScreenSecurity: { type: 'boolean' },
                overrideEditableFlag: { type: 'boolean' },
              },
              required: ['issueIdOrKey', 'update'],
            },
          },
          {
            name: 'deleteIssue',
            description: 'Delete issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                deleteSubtasks: { type: 'boolean' },
              },
              required: ['issueIdOrKey'],
            },
          },
          {
            name: 'assignIssue',
            description: 'Assign issue to user',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                assignee: { type: 'object' },
              },
              required: ['issueIdOrKey', 'assignee'],
            },
          },
          {
            name: 'addIssueComment',
            description: 'Add comment to issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                comment: { type: 'object' },
                expand: { type: 'array', items: { type: 'string' } },
              },
              required: ['issueIdOrKey', 'comment'],
            },
          },
          // Issue Lifecycle Tools (3 tools)
          {
            name: 'getIssueComments',
            description: 'Get issue comments',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                orderBy: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
              },
              required: ['issueIdOrKey'],
            },
          },
          {
            name: 'getIssueTransitions',
            description: 'Get available transitions for issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                transitionId: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
                skipRemoteOnlyCondition: { type: 'boolean' },
              },
              required: ['issueIdOrKey'],
            },
          },
          {
            name: 'transitionIssue',
            description: 'Transition issue to new status',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                transition: { type: 'object' },
                expand: { type: 'array', items: { type: 'string' } },
              },
              required: ['issueIdOrKey', 'transition'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      serverLogger.info('Core tool called', { name, args });

      try {
        let result;

        // Route to Core module methods
        switch (name) {
          // User Management Tools
          case 'getUser':
            result = await this.coreModule.getUser(args);
            break;
          case 'listUsers':
            result = await this.coreModule.listUsers(args);
            break;
          case 'getAssignableUsers':
            result = await this.coreModule.getAssignableUsers(args);
            break;
          // Project Management Tools
          case 'getProject':
            result = await this.coreModule.getProject(args);
            break;
          case 'listProjects':
            result = await this.coreModule.listProjects(args);
            break;
          case 'listProjectVersions':
            result = await this.coreModule.listProjectVersions(args);
            break;
          // Issue CRUD Tools
          case 'createIssue':
            result = await this.coreModule.createIssue(args);
            break;
          case 'updateIssue':
            result = await this.coreModule.updateIssue(args);
            break;
          case 'deleteIssue':
            result = await this.coreModule.deleteIssue(args);
            break;
          case 'assignIssue':
            result = await this.coreModule.assignIssue(args);
            break;
          case 'addIssueComment':
            result = await this.coreModule.addIssueComment(args);
            break;
          // Issue Lifecycle Tools
          case 'getIssueComments':
            result = await this.coreModule.getIssueComments(args);
            break;
          case 'getIssueTransitions':
            result = await this.coreModule.getIssueTransitions(args);
            break;
          case 'transitionIssue':
            result = await this.coreModule.transitionIssue(args);
            break;
          default:
            throw new Error(`Unknown Core tool: ${name}`);
        }

        serverLogger.info('Core tool completed successfully', { name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        serverLogger.error('Core tool execution failed', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error executing Core tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Initialize the Core module
   */
  async initialize(): Promise<void> {
    serverLogger.info('Initializing MCP Core Module Server');
    
    try {
      await this.coreModule.initialize();
      serverLogger.info('Core Module MCP Server initialized successfully', {
        totalTools: 14,
        categories: ['User Management (3)', 'Project Management (3)', 'Issue CRUD (5)', 'Issue Lifecycle (3)']
      });
    } catch (error) {
      serverLogger.error('Core Module MCP Server initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    serverLogger.info('MCP Core Module Server started successfully', {
      name: 'mcp-jira-dc-core',
      version: '1.0.0-DC',
      totalTools: 14,
      compatibility: 'MODERATE - DC endpoint adaptations'
    });
  }

  /**
   * Get server health status
   */
  getHealthStatus() {
    return {
      server: 'mcp-jira-dc-core',
      version: '1.0.0-DC',
      status: 'operational',
      totalTools: 14,
      module: this.coreModule.getHealthStatus(),
      capabilities: this.coreModule.getCapabilities()
    };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const server = new CoreMCPServer();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      serverLogger.info('Received SIGINT, shutting down Core server gracefully');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      serverLogger.info('Received SIGTERM, shutting down Core server gracefully');
      process.exit(0);
    });

    await server.run();
  } catch (error) {
    serverLogger.error('Core MCP Server startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CoreMCPServer };