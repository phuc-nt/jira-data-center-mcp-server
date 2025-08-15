# MCP Jira Data Center Server Installation Guide

> **Production-Ready Jira Data Center Integration** - Connect AI assistants to Jira Data Center/Server with PAT authentication and full MCP integration

## System Requirements

- macOS 10.15+ or Windows 10+ or Linux
- Node.js 18+ (for running the MCP server)
- Jira Data Center/Server instance access with PAT support
- MCP-compatible client (Claude Desktop, Cline, Cursor, or other MCP clients)

## Installation Methods

### 🔧 Method 1: Installation from Source (Recommended)

**Clone and build from source for latest features:**

#### Prerequisites Check

Verify Git and Node.js are installed:

```bash
git --version
node --version
npm --version
```

#### Step 1: Clone Repository

```bash
git clone https://github.com/phuc-nt/jira-data-center-mcp-server.git
cd jira-data-center-mcp-server
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Build the Project

```bash
npm run build
```

This will:
- ✅ Compile TypeScript to JavaScript
- ✅ Create `dist/index.js` (main MCP server entry point)
- ✅ Verify all 40 tools are operational
- ✅ Test individual modules (Core, Agile, Search)

## Step 2: Get Jira Data Center Credentials

### Create Personal Access Token (PAT)

1. **Go to Your Jira Data Center Instance**:
   - Navigate to `https://your-jira-dc-instance.com`
   - Login with your administrative account

2. **Create Personal Access Token**:
   - Go to **Profile** → **Personal Access Tokens**
   - Click **"Create token"**
   - Provide a descriptive name (e.g., "MCP Server Integration")
   - Set appropriate expiration date
   - Copy and securely store the token

3. **Get Your DC Instance Information**:
   - Base URL: Your Jira DC instance URL (e.g., `https://jira.company.com`)
   - Context Path: Usually empty, or `/jira` if configured
   - API Version: `2` or `latest` (recommended: `2`)

### Required Permissions

Make sure your account has these Jira Data Center permissions:
- **Browse Projects**: View project and issue data
- **Create Issues**: Create new issues and stories
- **Edit Issues**: Update and modify existing issues
- **Manage Sprints**: Create and manage agile sprints (for Agile module)
- **Search Issues**: Advanced search functionality (for Search module)
- **User Management**: View and search users (for User tools)

## Step 3: Find Your Installation Path

For source installation, get your full project path:

```bash
pwd
# Copy this path - you'll need it for the configuration
```

**Example paths:**
- macOS: `/Users/yourname/jira-data-center-mcp-server`
- Linux: `/home/yourname/jira-data-center-mcp-server`
- Windows: `C:\\Users\\YourName\\jira-data-center-mcp-server`

## Step 4: Configure Your AI Client

### Configuration Format

**Important:** Use the following format for reliable MCP connections:

```json
{
  "mcpServers": {
    "server-name": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio", 
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": { /* environment variables */ }
    }
  }
}
```

**Key points:**
- Use `"command": "node"` with `"args": ["/path/to/dist/index.js"]` format
- Include `"type": "stdio"` and `"timeout": 60` for stability
- Set `"disabled": false` to ensure server is active

### Deployment Configurations

Choose the configuration that best fits your needs:

### 🚀 Option A: Production Deployment (Recommended)

**Full MCP integration with compiled JavaScript:**

```json
{
  "mcpServers": {
    "jira-datacenter": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": ["/Users/yourname/jira-data-center-mcp-server/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_PAT": "your-personal-access-token",
        "JIRA_CONTEXT_PATH": "",
        "JIRA_API_VERSION": "2",
        "JIRA_TIMEOUT": "30000",
        "JIRA_MAX_RETRIES": "3",
        "JIRA_VALIDATE_SSL": "true"
      }
    }
  }
}
```

### 🔧 Option B: Development Mode

**Direct TypeScript execution with TSX for development:**

```json
{
  "mcpServers": {
    "jira-datacenter-dev": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/Users/yourname/jira-data-center-mcp-server/src/index.ts"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_PAT": "your-personal-access-token",
        "JIRA_CONTEXT_PATH": "",
        "JIRA_API_VERSION": "2"
      }
    }
  }
}
```

### 🏢 Option C: Enterprise Configuration

**Production with enhanced security and monitoring:**

```json
{
  "mcpServers": {
    "jira-datacenter-enterprise": {
      "disabled": false,
      "timeout": 120,
      "type": "stdio",
      "command": "node",
      "args": ["/Users/yourname/jira-data-center-mcp-server/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.enterprise.com",
        "JIRA_PAT": "your-enterprise-pat-token",
        "JIRA_CONTEXT_PATH": "/jira",
        "JIRA_API_VERSION": "latest",
        "JIRA_TIMEOUT": "45000",
        "JIRA_MAX_RETRIES": "5",
        "JIRA_VALIDATE_SSL": "true",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Configuration Parameters Explained

**Required Environment Variables:**

- `JIRA_BASE_URL`: Your Jira DC instance URL (e.g., `https://jira.company.com`)
- `JIRA_PAT`: Your Personal Access Token from step 2

**Optional Environment Variables:**

- `JIRA_CONTEXT_PATH`: Context path if Jira is not at root (default: `""`)
- `JIRA_API_VERSION`: API version to use - `"2"` or `"latest"` (default: `"2"`)
- `JIRA_TIMEOUT`: Request timeout in milliseconds (default: `30000`)
- `JIRA_MAX_RETRIES`: Maximum retry attempts (default: `3`)
- `JIRA_VALIDATE_SSL`: Validate SSL certificates (default: `true`)

**⚠️ Important:** Replace `/Users/yourname/jira-data-center-mcp-server/dist/index.js` with **your actual path** from step 3.

### Supported MCP Clients

This server works with all major MCP clients:

- **✅ Claude Desktop** - Use the configuration above
- **✅ Cline** - Use the same configuration format
- **✅ Cursor** - Use the same configuration format  
- **✅ Other MCP clients** - Use the same configuration format

### Windows Configuration Example

**Windows PowerShell path format:**

```json
{
  "mcpServers": {
    "jira-datacenter": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": ["C:\\Users\\YourName\\jira-data-center-mcp-server\\dist\\index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_PAT": "your-personal-access-token"
      }
    }
  }
}
```

## Step 5: Verify Installation

### Test MCP Server Directly

**Test production build:**
```bash
cd jira-data-center-mcp-server

# Set environment variables
export JIRA_BASE_URL="https://jira.company.com"
export JIRA_PAT="your-personal-access-token"

# Test main server (will wait for MCP input)
node dist/index.js

# Test individual modules
npm run dev:core
npm run dev:agile
npm run dev:search
```

You should see output showing:
- ✅ All modules initialized successfully
- ✅ 40 tools operational (14 Core + 12 Agile + 14 Search)
- ✅ MCP server started successfully

### Test with Your AI Client

After restarting your AI client, test with questions like:

**Basic Operations:**
- "List all projects in my Jira Data Center"
- "Search for issues assigned to me that are in progress"
- "Create a new story in the DEMO project"
- "Get details about issue DEMO-123"

**Advanced Operations:**
- "Show me all high priority bugs created last week"
- "Create a new sprint for the current board"
- "Add issue DEMO-124 to the active sprint"
- "Search for all epics in project ABC"

**Data Center Specific:**
- "Find users with username containing 'john'"
- "Create an issue with wiki markup in the description"
- "List all project versions for project XYZ"

## 🔧 Advanced Configuration

### Module-Specific Testing

Test individual modules separately:

```bash
# Test Core Module (14 tools)
npm run dev:core

# Test Agile Module (12 tools)  
npm run dev:agile

# Test Search Module (14 tools)
npm run dev:search
```

### Build Verification

Verify your build is working correctly:

```bash
npm run build
```

Expected output:
```
🎉 BUILD PROCESS COMPLETED!
📊 Status: All 40 tools operational (12 Agile + 14 Core + 14 Search)
🚀 Production Ready: v1.0.0-DC with full MCP integration
📁 Build artifacts:
   - dist/index.js (Main MCP server entry point)
   - dist/modules/ (Individual module builds)
💡 Deploy with: npm run start:production
```

### Troubleshooting

**Common Issues:**

1. **Connection Refused:**
   - Verify JIRA_BASE_URL is correct
   - Check network connectivity to Jira DC instance
   - Ensure PAT has proper permissions

2. **Authentication Failed:**
   - Verify PAT token is valid and not expired
   - Check user permissions in Jira DC
   - Ensure PAT feature is enabled in your DC instance

3. **Module Not Found:**
   - Run `npm run build` to rebuild
   - Check that dist/index.js exists
   - Verify Node.js path in MCP configuration

4. **TypeScript Errors:**
   - TypeScript compilation may show warnings but still work
   - Use `npm run build` instead of direct tsc

## 🎉 Installation Complete!

Your MCP Jira Data Center Server is now ready with **40 operational tools** and **full MCP integration**.

**What you can do now:**

- Create and manage issues with natural language
- Search your Jira DC data with advanced filtering
- Manage agile workflows and sprints
- Integrate Jira operations directly into your AI workflow
- Leverage Data Center-specific features like Wiki Markup

**Architecture Benefits:**
- ✅ **40 Tools**: 14 Core + 12 Agile + 14 Search
- ✅ **DC Optimized**: Native support for DC API v2/latest
- ✅ **PAT Authentication**: Enterprise-grade security
- ✅ **Full MCP Integration**: Proper tool routing and error handling

**Need help?** Check the troubleshooting section or visit our [GitHub repository](https://github.com/phuc-nt/jira-data-center-mcp-server) for support.

**Ready to explore?** Start with simple commands like _"List all my assigned issues"_ or _"Create a new story in project ABC"_.

---

**✅ Production-ready Jira Data Center integration achieved with full MCP protocol support!**