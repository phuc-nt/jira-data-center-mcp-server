#!/usr/bin/env node

/**
 * MCP Jira Data Center Agile Module Server
 * Provides 10 Agile tools for Board, Sprint, and Issue Operations management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AgileModule } from './index.js';
import { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { logger } from '../../utils/logger.js';

const serverLogger = logger.child('AgileMCPServer');

/**
 * Agile Module MCP Server Class
 * Provides 10 Agile tools: Board Management (4), Sprint Management (6)
 */
class AgileMCPServer {
  private server: Server;
  private agileModule: AgileModule;
  private config: JiraDataCenterConfig;
  private authenticator: PATAuthenticator;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-jira-dc-agile',
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

    // Initialize Agile module
    this.agileModule = new AgileModule(this.config, this.authenticator);

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
   * Setup MCP tool handlers for Agile module tools (10 tools)
   */
  private setupToolHandlers() {
    // List all Agile module tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Board Management Tools (4 tools)
          {
            name: 'listBoards',
            description: 'List boards',
            inputSchema: {
              type: 'object',
              properties: {
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                type: { type: 'string' },
                name: { type: 'string' },
                projectKeyOrId: { type: 'string' },
              },
            },
          },
          {
            name: 'getBoard',
            description: 'Get board details',
            inputSchema: {
              type: 'object',
              properties: {
                boardId: { type: 'number' },
              },
              required: ['boardId'],
            },
          },
          {
            name: 'getBoardConfiguration',
            description: 'Get board configuration',
            inputSchema: {
              type: 'object',
              properties: {
                boardId: { type: 'number' },
              },
              required: ['boardId'],
            },
          },
          {
            name: 'listBacklogIssues',
            description: 'List backlog issues',
            inputSchema: {
              type: 'object',
              properties: {
                boardId: { type: 'number' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                jql: { type: 'string' },
                validateQuery: { type: 'boolean' },
                fields: { type: 'array', items: { type: 'string' } },
              },
              required: ['boardId'],
            },
          },
          // Sprint Management Tools (6 tools)
          {
            name: 'listSprints',
            description: 'List sprints',
            inputSchema: {
              type: 'object',
              properties: {
                boardId: { type: 'number' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                state: { type: 'string' },
              },
              required: ['boardId'],
            },
          },
          {
            name: 'getSprint',
            description: 'Get sprint details',
            inputSchema: {
              type: 'object',
              properties: {
                sprintId: { type: 'number' },
              },
              required: ['sprintId'],
            },
          },
          {
            name: 'getSprintIssues',
            description: 'Get sprint issues',
            inputSchema: {
              type: 'object',
              properties: {
                sprintId: { type: 'number' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                jql: { type: 'string' },
                validateQuery: { type: 'boolean' },
                fields: { type: 'array', items: { type: 'string' } },
              },
              required: ['sprintId'],
            },
          },
          {
            name: 'createSprint',
            description: 'Create new sprint',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                originBoardId: { type: 'number' },
                goal: { type: 'string' },
              },
              required: ['name', 'originBoardId'],
            },
          },
          {
            name: 'startSprint',
            description: 'Start sprint',
            inputSchema: {
              type: 'object',
              properties: {
                sprintId: { type: 'number' },
                name: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                goal: { type: 'string' },
              },
              required: ['sprintId'],
            },
          },
          {
            name: 'closeSprint',
            description: 'Close sprint',
            inputSchema: {
              type: 'object',
              properties: {
                sprintId: { type: 'number' },
              },
              required: ['sprintId'],
            },
          },
          // Issue Operations Tools (2 tools)
          {
            name: 'addIssueToSprint',
            description: 'Add issue to sprint',
            inputSchema: {
              type: 'object',
              properties: {
                sprintId: { type: 'number' },
                issueIdOrKey: { type: 'string' },
              },
              required: ['sprintId', 'issueIdOrKey'],
            },
          },
          {
            name: 'addIssuesToBacklog',
            description: 'Add issues to backlog',
            inputSchema: {
              type: 'object',
              properties: {
                issues: { type: 'array', items: { type: 'string' } },
              },
              required: ['issues'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      serverLogger.info('Agile tool called', { name, args });

      try {
        let result;

        // Route to Agile module methods
        switch (name) {
          // Board Management Tools
          case 'listBoards':
            result = await this.agileModule.listBoards(args);
            break;
          case 'getBoard':
            result = await this.agileModule.getBoard(args.boardId);
            break;
          case 'getBoardConfiguration':
            result = await this.agileModule.getBoardConfiguration(args.boardId);
            break;
          case 'listBacklogIssues':
            result = await this.agileModule.listBacklogIssues(args);
            break;
          // Sprint Management Tools
          case 'listSprints':
            result = await this.agileModule.listSprints(args);
            break;
          case 'getSprint':
            result = await this.agileModule.getSprint(args.sprintId);
            break;
          case 'getSprintIssues':
            result = await this.agileModule.getSprintIssues(args);
            break;
          case 'createSprint':
            // Map originBoardId to boardId for the agile module
            const createSprintParams = { ...args, boardId: args.originBoardId };
            delete createSprintParams.originBoardId;
            result = await this.agileModule.createSprint(createSprintParams);
            break;
          case 'startSprint':
            result = await this.agileModule.startSprint(args);
            break;
          case 'closeSprint':
            result = await this.agileModule.closeSprint(args.sprintId);
            break;
          // Issue Operations Tools
          case 'addIssueToSprint':
            result = await this.agileModule.addIssueToSprint(args);
            break;
          case 'addIssuesToBacklog':
            result = await this.agileModule.addIssuesToBacklog(args);
            break;
          default:
            throw new Error(`Unknown Agile tool: ${name}`);
        }

        serverLogger.info('Agile tool completed successfully', { name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        serverLogger.error('Agile tool execution failed', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error executing Agile tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Initialize the Agile module
   */
  async initialize(): Promise<void> {
    serverLogger.info('Initializing MCP Agile Module Server');
    
    try {
      await this.agileModule.initialize();
      serverLogger.info('Agile Module MCP Server initialized successfully', {
        totalTools: 10,
        categories: ['Board Management (4)', 'Sprint Management (6)']
      });
    } catch (error) {
      serverLogger.error('Agile Module MCP Server initialization failed', {
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

    serverLogger.info('MCP Agile Module Server started successfully', {
      name: 'mcp-jira-dc-agile',
      version: '1.0.0-DC',
      totalTools: 10,
      compatibility: 'HIGH - No changes from Cloud API'
    });
  }

  /**
   * Get server health status
   */
  getHealthStatus() {
    return {
      server: 'mcp-jira-dc-agile',
      version: '1.0.0-DC',
      status: 'operational',
      totalTools: 10,
      module: this.agileModule.getHealthStatus(),
      capabilities: this.agileModule.getCapabilities()
    };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const server = new AgileMCPServer();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      serverLogger.info('Received SIGINT, shutting down Agile server gracefully');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      serverLogger.info('Received SIGTERM, shutting down Agile server gracefully');
      process.exit(0);
    });

    await server.run();
  } catch (error) {
    serverLogger.error('Agile MCP Server startup failed', {
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

export { AgileMCPServer };