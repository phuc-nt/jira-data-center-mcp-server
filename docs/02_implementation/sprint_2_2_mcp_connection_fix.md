# Sprint 2.2: MCP Connection Architecture Fix

**Sprint ID**: 2.2  
**Duration**: 2-3 days  
**Status**: 📋 PLANNED  
**Priority**: 🔥 Critical  
**Issue Reference**: [Issue #1 Complete Resolution Plan](issue_1_mcp_connection_plan.md)

## Sprint Objective

Fix MCP connection architecture to enable individual module usage by creating proper MCP servers for each module, eliminating MCP error -32000: Connection closed.

## Sprint Scope

### In Scope ✅
- Create individual MCP servers for Core, Agile, Search modules
- Update build system to compile individual servers
- Implement proper MCP protocol for each module
- Update package.json bin entries for modular deployment
- Test all individual server connections

### Out of Scope ❌
- Endpoint mapping architecture changes (completed in Sprint 2.1)
- New feature development
- Performance optimizations beyond connection fixes

## Daily Tasks Breakdown

### Day 1: Module MCP Servers Creation

**Morning (4h)**:
- [ ] **Task 1.1**: Create `src/modules/core/mcp-server.ts`
  - Implement MCP Server class for Core module
  - Register 14 Core tools (User, Project, Issue CRUD, Lifecycle)
  - Add proper error handling and logging

- [ ] **Task 1.2**: Create `src/modules/agile/mcp-server.ts`
  - Implement MCP Server class for Agile module
  - Register 12 Agile tools (Board, Sprint, Issue Operations)
  - Maintain HIGH compatibility architecture

**Afternoon (4h)**:
- [ ] **Task 1.3**: Create `src/modules/search/mcp-server.ts`
  - Implement MCP Server class for Search module
  - Register 14 Search tools (Enhanced search, Epic, Universal, Filters)
  - Integrate DC-specific optimizations

- [ ] **Task 1.4**: Update build system in `simple-build.cjs`
  - Add compilation for individual MCP servers
  - Create proper dist structure with individual executables
  - Maintain unified server build

**End of Day Deliverables**:
- [ ] 3 MCP server files created and compiling
- [ ] Build system produces individual executables

### Day 2: Integration and Testing

**Morning (4h)**:
- [ ] **Task 2.1**: Update `package.json` bin entries
  - Add `mcp-jira-dc-core`: `dist/modules/core/mcp-server.js`
  - Add `mcp-jira-dc-agile`: `dist/modules/agile/mcp-server.js`
  - Add `mcp-jira-dc-search`: `dist/modules/search/mcp-server.js`

- [ ] **Task 2.2**: Test individual server startup
  - Verify each server initializes correctly
  - Test environment variable handling
  - Confirm tool registration for each module

**Afternoon (4h)**:
- [ ] **Task 2.3**: MCP client connection testing
  - Test Core server: 14 tools accessible via MCP
  - Test Agile server: 12 tools accessible via MCP
  - Test Search server: 14 tools accessible via MCP

- [ ] **Task 2.4**: Error handling validation
  - Test connection timeout scenarios
  - Verify proper error messages for missing env vars
  - Validate graceful failure modes

**End of Day Deliverables**:
- [ ] All 3 individual servers connect successfully via MCP
- [ ] No MCP error -32000 occurring

### Day 3: Validation and Cleanup

**Morning (4h)**:
- [ ] **Task 3.1**: Comprehensive testing
  - Full build verification: `npm run build`
  - Test unified server still works (40 tools)
  - Verify no regression in existing functionality

- [ ] **Task 3.2**: Configuration examples creation
  - Create working MCP client configs for each server
  - Test with sample Jira DC instance
  - Validate environment variable requirements

**Afternoon (4h)**:
- [ ] **Task 3.3**: Final validation
  - Run all module test scripts successfully
  - Verify individual MCP connections work end-to-end
  - Test tool execution through MCP protocol

- [ ] **Task 3.4**: Sprint completion
  - Update sprint status to COMPLETED
  - Prepare handoff to Sprint 1.6b
  - Document any issues for next sprint

**End of Day Deliverables**:
- [ ] Sprint 2.2 marked COMPLETED
- [ ] Individual MCP servers fully functional
- [ ] Complete Sprint 2 resolution achieved

## Technical Implementation Details

### MCP Server Template Structure
```typescript
export class CoreMCPServer {
  private server: Server;
  private coreModule: CoreModule;
  
  constructor() {
    this.server = new Server({
      name: 'mcp-jira-dc-core',
      version: '1.0.0-DC'
    });
  }
  
  private setupToolHandlers(): void {
    // Register only Core module tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [/* 14 Core tools */]
    }));
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Route to Core module methods only
    });
  }
}
```

### Build System Updates
```javascript
// simple-build.cjs additions
const moduleEntries = [
  'src/modules/core/mcp-server.ts',
  'src/modules/agile/mcp-server.ts', 
  'src/modules/search/mcp-server.ts'
];

// Compile each module server individually
```

### Expected Output Structure
```
dist/
├── index.js                           # Unified server (40 tools)
├── modules/core/mcp-server.js         # Core server (14 tools)
├── modules/agile/mcp-server.js        # Agile server (12 tools)
└── modules/search/mcp-server.js       # Search server (14 tools)
```

## Success Criteria

### Must Have ✅
- [ ] Individual MCP servers created for all 3 modules
- [ ] Build system produces all executables correctly
- [ ] MCP client can connect to each server without -32000 error
- [ ] All tools accessible through individual servers
- [ ] No regression in unified server functionality

### Should Have 📋
- [ ] Proper error handling for all connection scenarios
- [ ] Working MCP client configuration examples
- [ ] Individual server health checks

### Could Have 🎯
- [ ] Performance metrics for individual vs unified servers
- [ ] Advanced logging and monitoring

## Risk Mitigation

### High Risk: Breaking Unified Server
- **Mitigation**: Test unified server after each change
- **Rollback**: Keep unified server as separate entry point

### Medium Risk: MCP Protocol Implementation Issues  
- **Mitigation**: Follow existing unified server patterns
- **Testing**: Test each server independently

### Low Risk: Build System Complexity
- **Mitigation**: Keep individual builds simple
- **Fallback**: Manual compilation if needed

## Dependencies

### Prerequisites
- ✅ Sprint 2.1 completed (Endpoint mapping fixes)
- ✅ All 40 tools working with proper DC API calls
- ✅ DataCenterAPIClient refactored for direct endpoints
- ✅ MCP SDK properly integrated

### Blockers
- Sprint 2.1 must be completed first - API calls must work before MCP servers

## Definition of Done

### Code Complete
- [ ] All 3 MCP server files created and functional
- [ ] Build system updated and tested
- [ ] Package.json bin entries updated

### Testing Complete  
- [ ] Individual server connections tested
- [ ] All tools accessible through MCP protocol
- [ ] No MCP connection errors

### Ready for Production
- [ ] All Sprint 2 issues resolved
- [ ] Full deployment testing completed
- [ ] Documentation updated with new architecture

---

**Navigation**: [← Issues Tracker](issues_tracker.md) | [Complete Resolution Plan](issue_1_mcp_connection_plan.md) | [Previous Sprint](sprint_2_1_endpoint_mapping_fix.md)