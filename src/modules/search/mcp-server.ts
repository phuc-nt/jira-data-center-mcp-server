#!/usr/bin/env node

/**
 * MCP Jira Data Center Search Module Server
 * Provides 14 Search tools for Enhanced Search, Epic Search, Universal User Search, and Consolidated tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SearchModule } from './index.js';
import { JiraDataCenterConfig } from '../../config/datacenter-config.js';
import { PATAuthenticator } from '../../auth/pat-authenticator.js';
import { logger } from '../../utils/logger.js';

const serverLogger = logger.child('SearchMCPServer');

/**
 * Search Module MCP Server Class
 * Provides 14 Search tools: Enhanced Search (2), Epic Search (1), Universal User Search (1), Consolidated Tools (10)
 */
class SearchMCPServer {
  private server: Server;
  private searchModule: SearchModule;
  private config: JiraDataCenterConfig;
  private authenticator: PATAuthenticator;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-jira-dc-search',
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

    // Initialize Search module
    this.searchModule = new SearchModule(this.config, this.authenticator);

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
   * Setup MCP tool handlers for Search module tools (14 tools)
   */
  private setupToolHandlers() {
    // List all Search module tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Enhanced Search Tools (2 tools)
          {
            name: 'enhancedSearchIssues',
            description: 'Enhanced search issues with DC optimizations',
            inputSchema: {
              type: 'object',
              properties: {
                jql: { type: 'string' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                fields: { type: 'array', items: { type: 'string' } },
                expand: { type: 'array', items: { type: 'string' } },
                validateQuery: { type: 'boolean' },
              },
            },
          },
          {
            name: 'enhancedGetIssue',
            description: 'Enhanced get issue with DC optimizations',
            inputSchema: {
              type: 'object',
              properties: {
                issueIdOrKey: { type: 'string' },
                fields: { type: 'array', items: { type: 'string' } },
                expand: { type: 'array', items: { type: 'string' } },
                properties: { type: 'array', items: { type: 'string' } },
                fieldsByKeys: { type: 'boolean' },
                updateHistory: { type: 'boolean' },
              },
              required: ['issueIdOrKey'],
            },
          },
          // Epic Search Tools (1 tool)
          {
            name: 'epicSearchAgile',
            description: 'Epic search with better DC support',
            inputSchema: {
              type: 'object',
              properties: {
                epicIdOrKey: { type: 'string' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
                done: { type: 'boolean' },
              },
              required: ['epicIdOrKey'],
            },
          },
          // Universal User Search Tools (1 tool)
          {
            name: 'universalSearchUsers',
            description: 'Universal user search with multiple strategies',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                accountId: { type: 'string' },
                username: { type: 'string' },
              },
            },
          },
          // Consolidated Tools from other modules (10 tools)
          {
            name: 'getUser',
            description: 'Get user (from search module)',
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
            description: 'List users (from search module)',
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
            name: 'listProjects',
            description: 'List projects (from search module)',
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
            description: 'List project versions (from search module)',
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
          {
            name: 'listFilters',
            description: 'List filters',
            inputSchema: {
              type: 'object',
              properties: {
                expand: { type: 'array', items: { type: 'string' } },
                favourite: { type: 'boolean' },
                includeFavourites: { type: 'boolean' },
                startAt: { type: 'number' },
                maxResults: { type: 'number' },
              },
            },
          },
          {
            name: 'getFilter',
            description: 'Get filter',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                expand: { type: 'array', items: { type: 'string' } },
                overrideSharePermissions: { type: 'boolean' },
              },
              required: ['id'],
            },
          },
          {
            name: 'listBoards',
            description: 'List boards (from search module)',
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
            name: 'listSprints',
            description: 'List sprints (from search module)',
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
            name: 'listBacklogIssues',
            description: 'List backlog issues (from search module)',
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
          {
            name: 'multiEntitySearch',
            description: 'Multi-entity search with unified interface',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                entities: { type: 'array', items: { type: 'string' } },
                limit: { type: 'number' },
                includeMetadata: { type: 'boolean' },
              },
              required: ['query', 'entities'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      serverLogger.info('Search tool called', { name, args });

      try {
        let result;

        // Route to Search module methods
        switch (name) {
          // Enhanced Search Tools
          case 'enhancedSearchIssues':
            result = await this.searchModule.enhancedSearchIssues(args);
            break;
          case 'enhancedGetIssue':
            result = await this.searchModule.enhancedGetIssue(args);
            break;
          // Epic Search Tools
          case 'epicSearchAgile':
            // Map epicIdOrKey to boardId (the epic search needs board context)
            result = await this.searchModule.epicSearchAgile({
              boardId: args.boardId || 1, // Default board if not provided
              ...args
            });
            break;
          // Universal User Search Tools
          case 'universalSearchUsers':
            result = await this.searchModule.universalSearchUsers(args);
            break;
          // Consolidated Tools
          case 'getUser':
            result = await this.searchModule.getUser(args);
            break;
          case 'listUsers':
            result = await this.searchModule.listUsers(args);
            break;
          case 'listProjects':
            result = await this.searchModule.listProjects(args);
            break;
          case 'listProjectVersions':
            result = await this.searchModule.listProjectVersions(args);
            break;
          case 'listFilters':
            result = await this.searchModule.listFilters(args);
            break;
          case 'getFilter':
            // Map id to filterId for the search module
            result = await this.searchModule.getFilter({
              filterId: args.id,
              expand: args.expand,
              overrideSharePermissions: args.overrideSharePermissions
            });
            break;
          case 'listBoards':
            result = await this.searchModule.listBoards(args);
            break;
          case 'listSprints':
            result = await this.searchModule.listSprints(args);
            break;
          case 'listBacklogIssues':
            result = await this.searchModule.listBacklogIssues(args);
            break;
          case 'multiEntitySearch':
            // Map limit to maxResults for consistency
            const multiSearchParams = {
              ...args,
              maxResults: args.limit
            };
            delete multiSearchParams.limit;
            result = await this.searchModule.multiEntitySearch(multiSearchParams);
            break;
          default:
            throw new Error(`Unknown Search tool: ${name}`);
        }

        serverLogger.info('Search tool completed successfully', { name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        serverLogger.error('Search tool execution failed', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error executing Search tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Initialize the Search module
   */
  async initialize(): Promise<void> {
    serverLogger.info('Initializing MCP Search Module Server');
    
    try {
      await this.searchModule.initialize();
      serverLogger.info('Search Module MCP Server initialized successfully', {
        totalTools: 14,
        categories: ['Enhanced Search (2)', 'Epic Search (1)', 'Universal User Search (1)', 'Consolidated Tools (10)']
      });
    } catch (error) {
      serverLogger.error('Search Module MCP Server initialization failed', {
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

    serverLogger.info('MCP Search Module Server started successfully', {
      name: 'mcp-jira-dc-search',
      version: '1.0.0-DC',
      totalTools: 14,
      compatibility: 'HIGH - DC enhanced with better performance'
    });
  }

  /**
   * Get server health status
   */
  getHealthStatus() {
    return {
      server: 'mcp-jira-dc-search',
      version: '1.0.0-DC',
      status: 'operational',
      totalTools: 14,
      module: this.searchModule.getHealthStatus(),
      capabilities: this.searchModule.getCapabilities()
    };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const server = new SearchMCPServer();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      serverLogger.info('Received SIGINT, shutting down Search server gracefully');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      serverLogger.info('Received SIGTERM, shutting down Search server gracefully');
      process.exit(0);
    });

    await server.run();
  } catch (error) {
    serverLogger.error('Search MCP Server startup failed', {
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

export { SearchMCPServer };