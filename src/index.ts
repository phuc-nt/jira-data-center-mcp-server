#!/usr/bin/env node

/**
 * MCP Jira Data Center Server v1.0.0-DC
 * Main entry point for production deployment
 * Integrates all 3 modules (Core, Agile, Search) with MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CoreModule } from './modules/core/index.js';
import { AgileModule } from './modules/agile/index.js';
import { SearchModule } from './modules/search/index.js';
import { JiraDataCenterConfig } from './config/datacenter-config.js';
import { PATAuthenticator } from './auth/pat-authenticator.js';
import { logger } from './utils/logger.js';

const serverLogger = logger.child('MCPServer');

/**
 * Main MCP Server Class integrating all Jira DC modules
 */
class JiraDataCenterMCPServer {
  private server: Server;
  private coreModule: CoreModule;
  private agileModule: AgileModule; 
  private searchModule: SearchModule;
  private config: JiraDataCenterConfig;
  private authenticator: PATAuthenticator;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-jira-data-center-server',
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

    // Initialize modules  
    this.coreModule = new CoreModule(this.config, this.authenticator);
    this.agileModule = new AgileModule(this.config, this.authenticator);
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
      apiVersion: (process.env.JIRA_API_VERSION as '2' | 'latest') || '2',
      timeout: parseInt(process.env.JIRA_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.JIRA_MAX_RETRIES || '3'),
      validateSsl: process.env.JIRA_VALIDATE_SSL !== 'false',
    };
  }

  /**
   * Setup MCP tool handlers for all 40 tools
   */
  private setupToolHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Core Module Tools (14 tools)
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
          
          // Agile Module Tools (12 tools)
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
                boardId: { type: 'number' },
                issues: { type: 'array', items: { type: 'string' } },
              },
              required: ['boardId', 'issues'],
            },
          },
          
          // Search Module Tools (14 tools)
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
      
      serverLogger.info('Tool called', { name, args });

      try {
        let result: any;

        // Route to appropriate module based on tool name
        switch (name) {
          // Core Module Tools
          case 'getUser':
            result = await this.coreModule.getUser(args);
            break;
          case 'listUsers':
            result = await this.coreModule.listUsers(args);
            break;
          case 'getAssignableUsers':
            result = await this.coreModule.getAssignableUsers(args);
            break;
          case 'getProject':
            result = await this.coreModule.getProject(args);
            break;
          case 'listProjects':
            result = await this.coreModule.listProjects(args);
            break;
          case 'listProjectVersions':
            result = await this.coreModule.listProjectVersions(args);
            break;
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
          case 'getIssueComments':
            result = await this.coreModule.getIssueComments(args);
            break;
          case 'getIssueTransitions':
            result = await this.coreModule.getIssueTransitions(args);
            break;
          case 'transitionIssue':
            result = await this.coreModule.transitionIssue(args);
            break;

          // Agile Module Tools
          case 'listBoards':
            result = await this.agileModule.listBoards(args);
            break;
          case 'getBoard':
            result = await this.agileModule.getBoard(args);
            break;
          case 'getBoardConfiguration':
            result = await this.agileModule.getBoardConfiguration(args);
            break;
          case 'listBacklogIssues':
            result = await this.agileModule.listBacklogIssues(args);
            break;
          case 'listSprints':
            result = await this.agileModule.listSprints(args);
            break;
          case 'getSprint':
            result = await this.agileModule.getSprint(args);
            break;
          case 'getSprintIssues':
            result = await this.agileModule.getSprintIssues(args);
            break;
          case 'createSprint':
            result = await this.agileModule.createSprint(args);
            break;
          case 'startSprint':
            result = await this.agileModule.startSprint(args);
            break;
          case 'closeSprint':
            result = await this.agileModule.closeSprint(args);
            break;
          case 'addIssueToSprint':
            result = await this.agileModule.addIssueToSprint(args);
            break;
          case 'addIssuesToBacklog':
            result = await this.agileModule.addIssuesToBacklog(args);
            break;

          // Search Module Tools
          case 'enhancedSearchIssues':
            result = await this.searchModule.enhancedSearchIssues(args);
            break;
          case 'enhancedGetIssue':
            result = await this.searchModule.enhancedGetIssue(args);
            break;
          case 'epicSearchAgile':
            result = await this.searchModule.epicSearchAgile(args);
            break;
          case 'universalSearchUsers':
            result = await this.searchModule.universalSearchUsers(args);
            break;
          case 'listFilters':
            result = await this.searchModule.listFilters(args);
            break;
          case 'getFilter':
            result = await this.searchModule.getFilter(args);
            break;
          case 'multiEntitySearch':
            result = await this.searchModule.multiEntitySearch(args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        serverLogger.info('Tool completed successfully', { name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        serverLogger.error('Tool execution failed', { name, error: error instanceof Error ? error.message : 'Unknown error' });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Initialize all modules
   */
  async initialize(): Promise<void> {
    serverLogger.info('Initializing MCP Jira Data Center Server v1.0.0-DC');
    
    try {
      // Initialize all modules in parallel
      await Promise.all([
        this.coreModule.initialize(),
        this.agileModule.initialize(), 
        this.searchModule.initialize(),
      ]);

      serverLogger.info('All modules initialized successfully', {
        coreTools: 14,
        agileTools: 12, 
        searchTools: 14,
        totalTools: 40
      });
    } catch (error) {
      serverLogger.error('Module initialization failed', { error: error instanceof Error ? error.message : 'Unknown error' });
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
    
    serverLogger.info('MCP Jira Data Center Server started successfully', {
      version: '1.0.0-DC',
      totalTools: 40,
      modules: ['core', 'agile', 'search']
    });
  }

  /**
   * Get server health status
   */
  getHealthStatus() {
    return {
      server: 'mcp-jira-data-center-server',
      version: '1.0.0-DC',
      status: 'operational',
      totalTools: 40,
      modules: {
        core: this.coreModule.getHealthStatus(),
        agile: this.agileModule.getHealthStatus(), 
        search: this.searchModule.getHealthStatus()
      },
      configuration: {
        baseUrl: this.config.baseUrl,
        apiVersion: this.config.apiVersion,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      }
    };
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const server = new JiraDataCenterMCPServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      serverLogger.info('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      serverLogger.info('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });

    await server.run();
  } catch (error) {
    serverLogger.error('Server startup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
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

export { JiraDataCenterMCPServer };