# MCP Jira Data Center Server v1.0.0-DC - Project Overview

## Purpose
MCP (Model Context Protocol) server specifically designed for Jira Data Center/Server instances. Enables AI assistants to interact with Jira Data Center using Personal Access Token (PAT) authentication. This is a production-ready implementation with full MCP integration and 40 operational tools across 3 specialized modules.

## Key Features
- **PAT-only authentication**: Simplified and secure authentication using Personal Access Tokens
- **Data Center optimized**: Specifically adapted for Jira Data Center/Server vs Cloud APIs
- **Modular architecture**: 3 specialized modules (Core, Agile, Search) with 40 total tools
- **Full MCP integration**: Complete MCP protocol implementation with proper tool definitions
- **Enterprise-grade**: Error handling, logging, audit compliance, security masking
- **Production ready**: Compiled TypeScript with dist/index.js entry point

## Project Status
- **Version**: v1.0.0-DC (Production Deployed)
- **Total Tools**: 40/40 operational (100% success rate)
- **Modules**: 
  - Agile Module: 12 tools (HIGH COMPATIBILITY)
  - Core Module: 14 tools (MODERATE COMPATIBILITY) 
  - Search Module: 14 tools (HIGH COMPATIBILITY)

## Technical Architecture
- **Runtime**: Node.js >=18.0.0 with compiled JavaScript output
- **API Version**: Jira Data Center API v2/latest + Agile API v1.0
- **Authentication**: Personal Access Token (PAT) only
- **Build System**: TypeScript compilation with enhanced build script
- **Testing**: Jest with comprehensive test suite (169+ tests)
- **MCP Integration**: Full protocol implementation with proper tool routing