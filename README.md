# MCP Jira Data Center Server

> **AI meets Jira Data Center** - Connect AI assistants to your Jira Data Center/Server with full MCP integration and enterprise-grade security

<p align="center">
  <img src="assets/atlassian_logo_icon.png" alt="Jira Logo" width="120" />
</p>

[![Tools](https://img.shields.io/badge/Tools-38%20Operational-blue)](#features)
[![Architecture](https://img.shields.io/badge/Architecture-3%20Modules-orange)](#modular-architecture)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](#production-status)

## 🚀 What is this?

**MCP Jira Data Center Server** enables AI assistants like **Claude**, **Cline**, **Cursor**, and other MCP-compatible tools to interact with **Atlassian Jira Data Center/Server** using **Personal Access Token (PAT) authentication** - featuring **specialized DC optimizations**, enhanced compatibility, and enterprise-ready performance.

## ✨ Features

### 🔧 **38 Operational Tools Across 3 Specialized Modules:**

- **Core Module** (14): Essential CRUD operations, user management, project operations with DC optimizations
- **Agile Module** (10): Sprint & board management, workflow operations with HIGH compatibility  
- **Search Module** (14): Enhanced search with DC-specific optimizations, universal user search

### 🎯 **Key Capabilities:**

- ✅ **Data Center Optimized** - Specialized for Jira DC/Server API v2/latest + Agile v1.0
- ✅ **PAT Authentication** - Secure Personal Access Token authentication only
- ✅ **Enterprise Ready** - Full MCP integration with 100% operational success rate
- ✅ **DC Compatibility** - Wiki Markup support, username fallback, endpoint adaptation

## 🚀 Quick Start

### 📦 Install from Source

```bash
git clone https://github.com/phuc-nt/jira-data-center-mcp-server.git
cd jira-data-center-mcp-server
npm install
npm run build
```

**📖 [Complete Installation Guide](INSTALL.md)** - Follow the step-by-step setup guide

## Architecture

### Module Distribution (38 Total Tools - Production Ready)

| Module | Tools | Compatibility | Use Case |
|--------|-------|---------------|-----------|
| **Core** | 14 | MODERATE | Essential CRUD operations with DC adaptations |
| **Agile** | 10 | HIGH | Sprint & workflow management (unchanged API) |
| **Search** | 14 | HIGH | Enhanced search with DC-specific optimizations |

### Configuration Options

**4 Deployment Strategies:**
- **Unified Server** (38 tools): Single MCP server with all modules integrated
- **Individual Servers**: Modular deployment with dedicated MCP servers
  - **Core Server** (14 tools): Essential CRUD operations
  - **Agile Server** (10 tools): Sprint & board management  
  - **Search Server** (14 tools): Enhanced search capabilities

**📖 [Complete Configuration Guide](INSTALL.md)** - Detailed setup instructions with working configs

## 💡 Usage Examples

**Create Issues with Natural Language:**

```
Human: Create a new Epic called "User Authentication System" in the DEMO project

AI Assistant: I'll create that Epic for you using the createIssue tool:
□ Project: DEMO
□ Issue Type: Epic (auto-detected)
□ Summary: "User Authentication System" 
□ Wiki Markup format supported for Data Center
□ Creating issue now...

✅ Created Epic DEMO-142: "User Authentication System"
```

**Advanced Search & Analysis:**

```
Human: Find all high-priority bugs assigned to me that were created last week

AI Assistant: I'll search using enhanced DC-optimized search:
□ Use enhancedSearchIssues with JQL: "assignee in (currentUser()) AND priority = High AND issueType = Bug AND created >= -7d"
□ DC-specific user resolution with username fallback
□ Found 3 matching issues with detailed metadata
□ Analyzing priority, status, and resolution timeframes...

Found 3 high-priority bugs: DEMO-140, DEMO-138, DEMO-135 - details attached.
```

**Sprint Management & Agile Workflows:**

```
Human: Show me the current sprint status and add issue DEMO-123 to the active sprint

AI Assistant: I'll check your sprint status and add the issue:
□ Use listSprints to find active sprint for your board
□ Use getSprintIssues to see current sprint contents  
□ Use addIssueToSprint to add DEMO-123 (HIGH compatibility)
□ Provide sprint summary with updated issue count

Current Sprint "Sprint 24" has 12 issues, adding DEMO-123 now... ✅ Added successfully!
```

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development with strict mode
- **Node.js** - Runtime environment (18.x+)
- **MCP Protocol** - Model Context Protocol for AI integration
- **Jira Data Center APIs** - Native DC API v2/latest + Agile API v1.0
- **PAT Authentication** - Personal Access Token security model
- **Enterprise Architecture** - Error handling, logging, audit compliance

## 🏢 Data Center Enhancements

### API Compatibility Matrix

| Component | Cloud API | DC API | Compatibility | Enhancements |
|-----------|-----------|---------|---------------|--------------|
| **Core API** | v3 | v2/latest | MODERATE | Endpoint adaptation, content conversion |
| **Agile API** | v1.0 | v1.0 | HIGH | No changes needed |
| **Search** | v3 | v2/latest | HIGH | DC-specific optimizations |
| **Authentication** | OAuth2 | PAT | - | Simplified enterprise auth |

### DC-Specific Features

- ✅ **Native Wiki Markup** - Full support for Data Center wiki markup
- ✅ **Username Fallback** - Dual identifier support (accountId ↔ username)
- ✅ **Content Conversion** - ADF to Wiki Markup with graceful degradation
- ✅ **Enhanced Error Handling** - DC-specific error mapping with user-friendly suggestions
- ✅ **Endpoint Adaptation** - Automatic Cloud → DC endpoint translation
- ✅ **Version Negotiation** - Auto-detection with fallback mechanism

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**🎉 Connect your AI assistant to Jira Data Center with enterprise-grade security and full MCP integration!**