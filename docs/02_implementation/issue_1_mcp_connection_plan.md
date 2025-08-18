# Issue #1 Resolution Plan: MCP Connection Problems

**Issue ID**: #1  
**Priority**: 🔥 Critical  
**Estimated Effort**: 2-3 days  
**Assignee**: Development Team  

## Problem Analysis

### Current State
- **Working**: Main server `dist/index.js` with unified MCP integration (40 tools)
- **Failing**: Individual module MCP connections with error -32000: Connection closed
- **Root Cause**: Individual module files are test scripts, not MCP servers

### Technical Details

**Architecture Mismatch**:
```
Current (Broken):
MCP Client → Individual Module Test Scripts (dist/modules/test-*-module.js)
❌ Test scripts don't implement MCP protocol

Target (Fixed):
MCP Client → Individual MCP Server Modules (dist/modules/*/mcp-server.js)
✅ Proper MCP protocol implementation
```

**File Analysis**:
- `dist/modules/test-core-module.js` - Test runner, not MCP server
- `dist/modules/test-agile-module.js` - Test runner, not MCP server  
- `dist/modules/test-search-module.js` - Test runner, not MCP server

## Solution Strategy

### Phase 1: Architecture Decision 🎯

**Option A: Individual MCP Servers (Recommended)**
- Create separate MCP servers for each module
- Maintain modular architecture as designed
- Allow users to load only needed modules

**Option B: Unified Server Only**
- Remove individual module support
- Focus on single unified server
- Simpler architecture but less flexible

**Decision**: Proceed with Option A for maximum flexibility

### Phase 2: Implementation Plan 📋

#### Step 1: Create Module-Specific MCP Servers
**Estimated Time**: 1 day

**Tasks**:
1. Create `src/modules/core/mcp-server.ts`
2. Create `src/modules/agile/mcp-server.ts`  
3. Create `src/modules/search/mcp-server.ts`

**Template Structure**:
```typescript
// src/modules/core/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CoreModule } from './index.js';

class CoreMCPServer {
  private server: Server;
  private coreModule: CoreModule;
  
  constructor() {
    this.server = new Server({
      name: 'mcp-jira-dc-core',
      version: '1.0.0-DC'
    });
    
    this.setupToolHandlers();
  }
  
  private setupToolHandlers() {
    // Register only Core module tools (14 tools)
  }
}
```

#### Step 2: Update Build System
**Estimated Time**: 0.5 day

**Tasks**:
1. Modify `simple-build.cjs` to compile individual servers
2. Update `tsconfig.json` for multiple entry points
3. Create proper dist structure:
   ```
   dist/
   ├── index.js (Unified server - 40 tools)
   ├── modules/core/mcp-server.js (Core only - 14 tools)
   ├── modules/agile/mcp-server.js (Agile only - 12 tools)
   └── modules/search/mcp-server.js (Search only - 14 tools)
   ```

#### Step 3: Update Package.json Scripts
**Estimated Time**: 0.5 day

**Tasks**:
```json
{
  "bin": {
    "mcp-jira-dc-server": "dist/index.js",
    "mcp-jira-dc-core": "dist/modules/core/mcp-server.js",
    "mcp-jira-dc-agile": "dist/modules/agile/mcp-server.js", 
    "mcp-jira-dc-search": "dist/modules/search/mcp-server.js"
  }
}
```

### Phase 3: Testing & Validation 🧪

#### Step 4: Test Individual Servers
**Estimated Time**: 0.5 day

**Test Commands**:
```bash
# Test individual servers
JIRA_BASE_URL="..." JIRA_PAT="..." node dist/modules/core/mcp-server.js
JIRA_BASE_URL="..." JIRA_PAT="..." node dist/modules/agile/mcp-server.js
JIRA_BASE_URL="..." JIRA_PAT="..." node dist/modules/search/mcp-server.js
```

#### Step 5: Update MCP Client Configurations
**Estimated Time**: 0.5 day

**Example Configuration**:
```json
{
  "mcpServers": {
    "jira-dc-core": {
      "command": "node",
      "args": ["/path/to/dist/modules/core/mcp-server.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_PAT": "your-token"
      }
    }
  }
}
```

### Phase 4: Documentation Update 📖

#### Step 6: Update Installation Guides
**Estimated Time**: 0.5 day

**Files to Update**:
- `INSTALL.md` - Add modular server configurations
- `PRODUCTION_DEPLOYMENT.md` - Update deployment options  
- `README.md` - Update architecture description

## Technical Implementation Details

### Tool Distribution Strategy

**Core Server** (14 tools):
- User Management: getUser, listUsers, getAssignableUsers
- Project Management: getProject, listProjects, listProjectVersions
- Issue CRUD: createIssue, updateIssue, deleteIssue, assignIssue, addIssueComment
- Issue Comments: getIssueComments
- Issue Lifecycle: getIssueTransitions, transitionIssue

**Agile Server** (12 tools):
- Board Management: listBoards, getBoard, getBoardConfiguration, listBacklogIssues
- Sprint Management: listSprints, getSprint, getSprintIssues, createSprint, startSprint, closeSprint
- Issue Operations: addIssueToSprint, addIssuesToBacklog

**Search Server** (14 tools):
- Enhanced Search: enhancedSearchIssues, enhancedGetIssue
- Epic Search: epicSearchAgile
- Universal Search: universalSearchUsers, getUser, listUsers, listProjects, listProjectVersions
- Filter Management: listFilters, getFilter
- Consolidated: listBoards, listSprints, listBacklogIssues, multiEntitySearch

### Error Handling Strategy

**Connection Issues**:
- Implement proper MCP protocol initialization
- Add connection timeout handling
- Provide meaningful error messages

**Environment Validation**:
- Validate required environment variables
- Test Jira DC connectivity on startup
- Graceful degradation for missing configurations

## Success Criteria

### Definition of Done ✅

1. **Individual MCP Servers Created**:
   - Core server: 14 tools operational
   - Agile server: 12 tools operational
   - Search server: 14 tools operational

2. **MCP Client Connection Success**:
   - No -32000 connection errors
   - Tools respond correctly to MCP calls
   - Proper error handling and logging

3. **Build System Updated**:
   - `npm run build` creates all server files
   - Verification script tests all servers
   - Package.json bin entries updated

4. **Documentation Complete**:
   - INSTALL.md updated with modular configurations
   - All configuration examples tested and verified

### Testing Checklist

- [ ] Core server connects and lists 14 tools
- [ ] Agile server connects and lists 12 tools  
- [ ] Search server connects and lists 14 tools
- [ ] Unified server still works with 40 tools
- [ ] All MCP client configurations validated
- [ ] Build system produces correct artifacts
- [ ] Documentation examples work correctly

## Risk Mitigation

### Potential Risks

1. **Breaking Changes**: Existing unified server might break
   - **Mitigation**: Keep unified server as primary, add modules as secondary

2. **Tool Conflicts**: Same tool names across modules
   - **Mitigation**: Use module prefixes where necessary

3. **Increased Complexity**: More servers to maintain
   - **Mitigation**: Share common code, maintain consistent patterns

## Timeline

**Total Estimated Time**: 2-3 days

```
Day 1: Create module MCP servers + Build system
Day 2: Testing + MCP client configurations  
Day 3: Documentation + Final validation
```

---

**Next Steps**: 
1. Review and approve plan
2. Begin Phase 1 implementation
3. Set up testing environment

**Navigation**: [← Back to Issues Tracker](issues_tracker.md) | [Implementation Progress](implementation_progress.md)