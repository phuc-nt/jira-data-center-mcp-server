# MCP Jira Data Center Server - Issues Tracker

**Status**: 🔄 Active Issues Requiring Resolution  
**Created**: August 18, 2025  
**Last Updated**: August 18, 2025

## Active Issues

### Issue #1: MCP Connection Problems ❌ HIGH PRIORITY

**Summary**: MCP error -32000: Connection closed when connecting MCP client with individual modules

**Status**: 🔄 Unresolved  
**Impact**: HIGH - Blocking module-specific usage  
**Environment**: macOS, Node.js v23.1.0, npm 10.9.0

**Problem Details**:
- Individual modules fail with MCP error -32000: Connection closed
- Main server `dist/index.js` works correctly for full MCP integration
- Module testing works successfully in test mode (14 tools operational)
- MCP client connection to individual modules fails

**Root Cause Analysis**:
- Individual module files are test scripts, not MCP servers
- Missing proper MCP protocol implementation in individual modules
- Architecture mismatch between unified server vs module-specific servers

**Plan Document**: [Issue #1 Resolution Plan](issue_1_mcp_connection_plan.md)  
**Sprint Implementation**: [Sprint 2.2: MCP Connection Fix](sprint_2_2_mcp_connection_fix.md)

---

### Issue #2: Endpoint Mapping Architecture Conflicts ❌ HIGH PRIORITY

**Summary**: Tools like enhancedGetIssue, enhancedSearchIssues, and listProjects encounter "Endpoint not supported in Data Center" errors

**Status**: 🔄 Unresolved  
**Impact**: HIGH - Blocking core functionality  
**Scope**: API Client architecture conflicts

**Problem Details**:
- API methods fail despite full implementation
- System cannot successfully call Jira Data Center API
- Architecture contradiction between module-specific and API Client handling
- Modules use Data Center API (v2) directly but API Client is designed to map from Cloud API (v3) to Data Center API (v2)

**Root Cause Analysis**:
- Architecture inherited from previous Cloud project
- EndpointMapper designed to convert /rest/api/3/... to /rest/api/2/..., cannot handle direct v2 endpoints
- Some modules implement correctly (using v2 directly) while API Client architecture still operates on mapping model

**Plan Document**: [Issue #2 Resolution Plan](issue_2_endpoint_mapping_plan.md)  
**Sprint Implementation**: [Sprint 2.1: Endpoint Mapping Fix](sprint_2_1_endpoint_mapping_fix.md)

## Issue Priority Matrix

| Issue | Severity | Impact | Effort | Sprint | Priority |
|-------|----------|--------|---------|---------|----------|
| #2 Endpoint Mapping | High | High | High | 2.1 | 🔥 Critical (First) |
| #1 MCP Connection | High | High | Medium | 2.2 | 🔥 Critical (Second) |

## Resolution Timeline

**Target Resolution**: Sprint 2.1 + 2.2 (Current Phase 7)
- **Sprint 2.1**: Issue #2 - 3-4 days (Foundational API fix)  
- **Sprint 2.2**: Issue #1 - 2-3 days (MCP architecture fix)
- **Sequential Execution**: 2.1 must complete before 2.2 (API calls must work before MCP servers)

## Testing Status

**What Works** ✅:
- Main server `dist/index.js` - Full MCP integration
- Individual module testing in test mode
- Build system and TypeScript compilation
- All 40 tools compile successfully

**What Fails** ❌:
- MCP client connection to individual modules
- API calls through DataCenterAPIClient
- Module-specific MCP server deployment

## Next Actions

1. **Sprint 2.1 (First)**: Fix endpoint mapping architecture - remove v3→v2 conversion system
2. **Sprint 2.2 (Second)**: Fix MCP connection architecture for individual modules  
3. **Integration Testing**: Verify all 40 tools work through proper MCP connections
4. **Documentation**: Update deployment guides after both sprints complete

---

**Navigation**: [← Back to Implementation Overview](implementation_progress.md) | [Project Hub](../START_POINT.md)