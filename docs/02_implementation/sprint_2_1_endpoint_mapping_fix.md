# Sprint 2.1: Endpoint Mapping Architecture Refactoring

**Sprint ID**: 2.1  
**Duration**: 3-4 days  
**Status**: 📋 PLANNED  
**Priority**: 🔥 Critical - Foundational Fix  
**Issue Reference**: [Issue #2 Complete Resolution Plan](issue_2_endpoint_mapping_plan.md)

## Sprint Objective

Eliminate "Endpoint not supported in Data Center" errors by removing the Cloud→DC endpoint mapping system and implementing direct DC API usage throughout the codebase.

## Sprint Scope

### In Scope ✅
- Remove EndpointMapper system completely
- Refactor DataCenterAPIClient for direct DC endpoint usage
- Update all modules to use direct DC API v2 endpoints
- Implement proper DC endpoint validation
- Comprehensive testing of all 40 tools

### Out of Scope ❌
- New feature development
- Performance optimizations beyond removing mapping overhead
- Cloud API compatibility (focusing purely on DC)

## Daily Tasks Breakdown

### Day 1: Analysis and API Client Refactoring

**Morning (4h)**:
- [ ] **Task 1.1**: Comprehensive endpoint usage audit
  - Scan all modules for endpoint usage patterns
  - Identify EndpointMapper dependencies
  - Document current vs target endpoint formats
  - Map all 40 tools to their DC endpoints

- [ ] **Task 1.2**: Begin DataCenterAPIClient refactoring
  - Remove EndpointMapper integration from constructor
  - Eliminate `mapEndpoint()` calls in request methods
  - Implement direct endpoint acceptance in `makeRequest()`

**Afternoon (4h)**:
- [ ] **Task 1.3**: Add DC endpoint validation
  - Create `validateDCEndpoint()` method
  - Support `/rest/api/2/`, `/rest/api/latest/`, `/rest/agile/1.0/`
  - Add proper error messages for invalid endpoints

- [ ] **Task 1.4**: Preserve existing functionality
  - Maintain retry logic and circuit breaker
  - Keep error handling and logging
  - Ensure authentication flow unchanged

**End of Day Deliverables**:
- [ ] Audit report of all endpoint usage
- [ ] DataCenterAPIClient refactored (compiling)

### Day 2: Module Updates and EndpointMapper Removal

**Morning (4h)**:
- [ ] **Task 2.1**: Update Core Module endpoints
  - Verify all 14 Core tools use correct DC v2 endpoints
  - Fix any remaining v3 references
  - Test module compilation after changes

- [ ] **Task 2.2**: Update Search Module endpoints  
  - Verify all 14 Search tools use DC-optimized endpoints
  - Ensure enhanced search uses `/rest/api/2/search`
  - Maintain DC-specific optimizations

**Afternoon (4h)**:
- [ ] **Task 2.3**: Verify Agile Module (should need no changes)
  - Confirm all 12 Agile tools use `/rest/agile/1.0/` correctly
  - Validate HIGH compatibility maintained
  - Test Agile module compilation

- [ ] **Task 2.4**: Remove EndpointMapper system
  - Delete `src/api/endpoint-mapper.ts` file
  - Remove all EndpointMapper imports across codebase
  - Remove mapping-related type definitions

**End of Day Deliverables**:
- [ ] All modules updated for direct DC usage
- [ ] EndpointMapper system completely removed
- [ ] Clean compilation with no mapping references

### Day 3: Testing and Error Handling

**Morning (4h)**:
- [ ] **Task 3.1**: Individual module testing
  - Test Core module: `npm run dev:core` (14 tools)
  - Test Agile module: `npm run dev:agile` (12 tools)  
  - Test Search module: `npm run dev:search` (14 tools)

- [ ] **Task 3.2**: Build system validation
  - Run full build: `npm run build`
  - Verify all 40 tools compile successfully
  - Test unified server startup with new architecture

**Afternoon (4h)**:
- [ ] **Task 3.3**: Error scenario testing
  - Test invalid endpoint format handling
  - Verify proper error messages for DC API failures
  - Test authentication and connectivity error flows

- [ ] **Task 3.4**: Integration testing preparation
  - Prepare test environment with mock Jira DC instance
  - Create test scripts for all 40 tools
  - Set up comprehensive validation suite

**End of Day Deliverables**:
- [ ] All individual modules tested and working
- [ ] No "endpoint not supported" errors occurring
- [ ] Comprehensive error handling validated

### Day 4: Final Validation and Documentation

**Morning (4h)**:
- [ ] **Task 4.1**: End-to-end integration testing
  - Test all 40 tools against mock Jira DC instance
  - Verify proper DC API responses
  - Test error handling for various failure scenarios

- [ ] **Task 4.2**: Performance validation
  - Measure response times without mapping overhead
  - Verify no performance regression
  - Test concurrent tool usage

**Afternoon (4h)**:
- [ ] **Task 4.3**: Final cleanup and validation
  - Remove any remaining mapping-related code/comments
  - Update internal documentation and code comments
  - Verify clean codebase with no mapping references

- [ ] **Task 4.4**: Sprint completion
  - Run final comprehensive test suite
  - Update sprint status to COMPLETED
  - Prepare integration with Sprint 1.6a changes

**End of Day Deliverables**:
- [ ] Sprint 1.6b marked COMPLETED
- [ ] All endpoint mapping issues resolved
- [ ] Ready for combined testing with MCP fixes

## Technical Implementation Details

### API Client Refactoring Pattern

**Before (with mapping)**:
```typescript
class DataCenterAPIClient {
  constructor(config: Config, authenticator: Auth, mapper: EndpointMapper) {
    this.endpointMapper = mapper;
  }
  
  async makeRequest(cloudEndpoint: string) {
    const mapped = this.endpointMapper.mapEndpoint(cloudEndpoint);
    return this.httpClient.request(mapped.dcEndpoint);
  }
}
```

**After (direct DC)**:
```typescript
class DataCenterAPIClient {
  constructor(config: Config, authenticator: Auth) {
    // No mapper needed
  }
  
  async makeRequest(options: RequestOptions) {
    this.validateDCEndpoint(options.endpoint);
    return this.httpClient.request(options);
  }
  
  private validateDCEndpoint(endpoint: string): void {
    const validPrefixes = ['/rest/api/2/', '/rest/api/latest/', '/rest/agile/1.0/'];
    if (!validPrefixes.some(prefix => endpoint.startsWith(prefix))) {
      throw new Error(`Invalid DC API endpoint: ${endpoint}`);
    }
  }
}
```

### Module Update Verification

**Core Module Endpoints** (14 tools):
```typescript
// All should be DC v2 format:
'/rest/api/2/user'                    // getUser
'/rest/api/2/user/search'             // listUsers  
'/rest/api/2/issue/{key}/assignable/multiProjectSearch'  // getAssignableUsers
'/rest/api/2/project/{key}'           // getProject
'/rest/api/2/project'                 // listProjects
'/rest/api/2/project/{key}/versions'  // listProjectVersions
// ... etc for all Core tools
```

**Search Module Endpoints** (14 tools):
```typescript
// Enhanced search with DC optimizations:
'/rest/api/2/search'                  // enhancedSearchIssues
'/rest/api/2/issue/{key}'             // enhancedGetIssue
'/rest/agile/1.0/epic/{key}/issue'    // epicSearchAgile
// ... etc for all Search tools
```

### Endpoint Validation Strategy

```typescript
const DC_API_PATTERNS = {
  coreApi: /^\/rest\/api\/(2|latest)\/.+$/,
  agileApi: /^\/rest\/agile\/1\.0\/.+$/
};

function validateDCEndpoint(endpoint: string): boolean {
  return DC_API_PATTERNS.coreApi.test(endpoint) || 
         DC_API_PATTERNS.agileApi.test(endpoint);
}
```

## Success Criteria

### Must Have ✅
- [ ] EndpointMapper system completely removed from codebase
- [ ] All 40 tools use direct DC API endpoints
- [ ] No "endpoint not supported in Data Center" errors
- [ ] DataCenterAPIClient accepts direct DC endpoints
- [ ] All modules compile and run successfully

### Should Have 📋
- [ ] Proper endpoint validation with meaningful errors
- [ ] Performance improvement from removing mapping overhead
- [ ] Clean codebase with no mapping references

### Could Have 🎯
- [ ] Enhanced error messages for DC-specific issues
- [ ] Performance benchmarks showing improvement

## Risk Mitigation

### High Risk: Breaking All API Functionality
- **Mitigation**: Incremental changes with testing at each step
- **Rollback**: Keep EndpointMapper in separate branch until completion

### Medium Risk: Missing DC-Specific Endpoints
- **Mitigation**: Comprehensive audit of all endpoint usage
- **Testing**: Test each tool individually after changes

### Low Risk: Performance Regression
- **Mitigation**: Removing mapping should improve performance
- **Monitoring**: Measure response times before/after

## Dependencies

### Prerequisites
- ✅ Sprint 1.6a completion (MCP connections fixed)
- ✅ All modules currently compiling
- ✅ Test environment available

### Inter-Sprint Dependencies
- **Must complete before Sprint 2.2**: MCP connections depend on working API calls
- No parallel execution - this is foundational fix for all API functionality

## Definition of Done

### Code Complete
- [ ] EndpointMapper completely removed from codebase
- [ ] DataCenterAPIClient refactored for direct usage
- [ ] All modules updated with direct DC endpoints
- [ ] Proper endpoint validation implemented

### Testing Complete
- [ ] All 40 tools tested individually
- [ ] Integration testing with mock DC instance
- [ ] Error scenarios tested and handled
- [ ] No endpoint mapping errors occurring

### Quality Gates
- [ ] Clean compilation with no mapping references
- [ ] Performance equal or better than before
- [ ] Code review completed

### Ready for Integration
- [ ] Ready to begin Sprint 2.2 (MCP connection fixes)
- [ ] No blocking issues remaining
- [ ] API calls working for MCP server development

---

**Navigation**: [← Issues Tracker](issues_tracker.md) | [Complete Resolution Plan](issue_2_endpoint_mapping_plan.md) | [Next Sprint →](sprint_2_2_mcp_connection_fix.md)