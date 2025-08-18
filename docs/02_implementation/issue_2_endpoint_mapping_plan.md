# Issue #2 Resolution Plan: Endpoint Mapping Architecture Conflicts

**Issue ID**: #2  
**Priority**: 🔥 Critical  
**Estimated Effort**: 3-4 days  
**Assignee**: Development Team  

## Problem Analysis

### Current State
- **Symptom**: "Endpoint not supported in Data Center" errors for core API calls
- **Affected Tools**: enhancedGetIssue, enhancedSearchIssues, listProjects, and others
- **Root Cause**: Architecture mismatch between direct DC API usage and Cloud-to-DC mapping system

### Technical Root Cause Analysis

**Architecture Inheritance Problem**:
```
Current (Broken) Flow:
Module → DataCenterAPIClient → EndpointMapper → Jira DC API
   ↓           ↓                      ↓
Uses v2    Expects v3→v2         Maps v3→v2 only
directly   conversion            ❌ Fails on direct v2
```

**Code Analysis**:
```typescript
// Module provides DC v2 endpoint directly:
const endpoint = '/rest/api/2/search';

// But EndpointMapper expects Cloud v3 format:
mapEndpoint('/rest/api/3/search') // ✅ Works
mapEndpoint('/rest/api/2/search') // ❌ "Not supported"
```

**Inheritance Issue**:
- Architecture inherited from `jira-cloud-mcp-server` project
- EndpointMapper designed for v3→v2 conversion
- Modules correctly implement v2 direct usage
- API Client still operates on conversion model

## Solution Strategy

### Phase 1: Architecture Decision 🎯

**Option A: Remove Endpoint Mapping (Recommended)**
- Eliminate EndpointMapper completely
- Use direct DC API v2 endpoints
- Simplify API Client to basic HTTP client

**Option B: Dual-Mode Mapping**
- Support both direct v2 and v3→v2 conversion
- More complex but backwards compatible
- Higher maintenance overhead

**Option C: Standardize on v3 Format**
- Modules use v3 format, always convert to v2
- Consistent with Cloud version
- More translation overhead

**Decision**: Proceed with Option A for simplicity and performance

### Phase 2: Implementation Plan 📋

#### Step 1: Analysis and Audit
**Estimated Time**: 0.5 day

**Tasks**:
1. **Audit all endpoint usage** in modules:
   ```bash
   # Find all API endpoint definitions
   grep -r "rest/api" src/modules/
   grep -r "mapEndpoint" src/
   ```

2. **Document current endpoint patterns**:
   - Which modules use direct v2?
   - Which modules still expect mapping?
   - Which tools are affected?

3. **Identify EndpointMapper dependencies**:
   - Files importing EndpointMapper
   - Methods calling mapEndpoint()
   - Tests relying on mapping behavior

#### Step 2: Refactor DataCenterAPIClient
**Estimated Time**: 1.5 days

**Current Architecture**:
```typescript
class DataCenterAPIClient {
  makeRequest(cloudEndpoint: string) {
    const mapped = this.endpointMapper.mapEndpoint(cloudEndpoint);
    return this.httpClient.request(mapped.dcEndpoint);
  }
}
```

**Target Architecture**:
```typescript
class DataCenterAPIClient {
  makeRequest(dcEndpoint: string) {
    // Direct usage - no mapping needed
    this.validateDCEndpoint(dcEndpoint);
    return this.httpClient.request(dcEndpoint);
  }
  
  private validateDCEndpoint(endpoint: string): void {
    // Ensure proper DC API format
    if (!endpoint.startsWith('/rest/api/2/') && 
        !endpoint.startsWith('/rest/agile/1.0/')) {
      throw new Error(`Invalid DC endpoint: ${endpoint}`);
    }
  }
}
```

**Implementation Tasks**:

1. **Remove EndpointMapper Integration**:
   - Remove `endpointMapper` property from DataCenterAPIClient
   - Remove `mapEndpoint()` calls in request methods
   - Update constructor to not require EndpointMapper

2. **Add Direct Endpoint Support**:
   - Accept DC endpoints directly in `makeRequest()`
   - Add endpoint validation for DC format
   - Preserve useful features (retry logic, error handling, logging)

3. **Update Error Handling**:
   - Remove "endpoint not supported" errors
   - Add proper DC API error mapping
   - Maintain circuit breaker and retry logic

#### Step 3: Update All Modules
**Estimated Time**: 1 day

**Module Updates Required**:

**Core Module** - Verify direct v2 usage:
```typescript
// Ensure all methods use correct DC endpoints
getUser: '/rest/api/2/user'           // ✅ Correct
listUsers: '/rest/api/2/user/search'  // ✅ Correct  
getProject: '/rest/api/2/project/{id}' // ✅ Correct
```

**Agile Module** - Already correct (v1.0 API):
```typescript
// No changes needed - Agile API unchanged
listBoards: '/rest/agile/1.0/board'    // ✅ Correct
createSprint: '/rest/agile/1.0/sprint' // ✅ Correct
```

**Search Module** - Verify enhanced search endpoints:
```typescript  
// Ensure DC-specific optimizations maintained
enhancedSearch: '/rest/api/2/search'        // ✅ Correct
epicSearch: '/rest/agile/1.0/epic/{id}/issue' // ✅ Correct
```

#### Step 4: Remove EndpointMapper System
**Estimated Time**: 0.5 day

**Files to Modify/Remove**:
1. `src/api/endpoint-mapper.ts` - **DELETE** entirely
2. `src/api/datacenter-client.ts` - Remove EndpointMapper imports
3. Module constructors - Remove EndpointMapper parameters
4. Tests - Remove endpoint mapping tests

**Cleanup Tasks**:
- Remove EndpointMapper from all imports
- Remove mapping-related configuration
- Update type definitions
- Remove unused mapping interfaces

### Phase 3: Testing & Validation 🧪

#### Step 5: Comprehensive Testing
**Estimated Time**: 1 day

**Testing Strategy**:

1. **Unit Tests**:
   ```bash
   # Test all API client changes
   npm test -- src/api/datacenter-client.test.ts
   
   # Test modules without mapping
   npm run dev:core
   npm run dev:agile  
   npm run dev:search
   ```

2. **Integration Tests**:
   ```bash
   # Test with mock Jira DC instance
   JIRA_BASE_URL="https://demo.atlassian.com" 
   JIRA_PAT="test-token"
   node dist/index.js
   ```

3. **Tool-by-Tool Verification**:
   - Test each of the 40 tools individually
   - Verify proper DC API responses
   - Check error handling for invalid endpoints

#### Step 6: Error Scenarios Testing
**Estimated Time**: 0.5 day

**Test Cases**:
- Invalid endpoint formats
- Network connectivity issues  
- DC API authentication failures
- Malformed requests
- Rate limiting responses

### Phase 4: Documentation & Cleanup 📖

#### Step 7: Update Documentation
**Estimated Time**: 0.5 day

**Documentation Updates**:

1. **Architecture Documentation**:
   - Remove endpoint mapping references
   - Update API client documentation
   - Clarify direct DC API usage

2. **API Reference**:
   - Update endpoint examples
   - Remove Cloud API references
   - Add DC-specific examples

3. **Troubleshooting**:
   - Remove mapping-related error solutions
   - Add DC endpoint validation errors
   - Update connectivity troubleshooting

## Technical Implementation Details

### API Client Refactoring

**New DataCenterAPIClient Interface**:
```typescript
interface APIClientConfig {
  baseUrl: string;
  personalAccessToken: string;
  apiVersion: '2' | 'latest';
  timeout: number;
  maxRetries: number;
}

class DataCenterAPIClient {
  async makeRequest(options: {
    endpoint: string;    // Direct DC endpoint
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: unknown;
    params?: Record<string, unknown>;
  }): Promise<unknown> {
    // Direct implementation without mapping
  }
}
```

**Endpoint Validation Logic**:
```typescript
private validateEndpoint(endpoint: string): void {
  const validPrefixes = [
    '/rest/api/2/',
    '/rest/api/latest/', 
    '/rest/agile/1.0/'
  ];
  
  if (!validPrefixes.some(prefix => endpoint.startsWith(prefix))) {
    throw new Error(`Invalid DC API endpoint: ${endpoint}`);
  }
}
```

### Module Update Patterns

**Standard Pattern for All Modules**:
```typescript
// Before (with mapping)
const result = await this.apiClient.makeRequest('/rest/api/3/search');

// After (direct DC)
const result = await this.apiClient.makeRequest({
  endpoint: '/rest/api/2/search',
  method: 'GET',
  params: queryParams
});
```

## Success Criteria

### Definition of Done ✅

1. **EndpointMapper Removed**:
   - No references to EndpointMapper in codebase
   - All mapping logic eliminated
   - Clean compilation with no mapping imports

2. **Direct DC API Usage**:
   - All 40 tools use direct DC endpoints
   - No "endpoint not supported" errors
   - Proper endpoint validation in place

3. **API Client Simplified**:
   - Direct HTTP client without mapping layer
   - Maintains retry logic, error handling, logging
   - Clean, maintainable code structure

4. **All Tools Functional**:
   - Core module: 14 tools working
   - Agile module: 12 tools working  
   - Search module: 14 tools working
   - No regression in functionality

### Testing Checklist

- [ ] All modules compile without EndpointMapper
- [ ] DataCenterAPIClient accepts direct DC endpoints
- [ ] Endpoint validation rejects invalid formats
- [ ] All 40 tools execute successfully
- [ ] Error handling works for DC API responses
- [ ] No "endpoint not supported" errors occur
- [ ] Integration tests pass with real DC instance
- [ ] Documentation reflects new direct usage

## Risk Mitigation

### Potential Risks

1. **Breaking Existing Functionality**:
   - **Mitigation**: Comprehensive testing before deployment
   - **Rollback Plan**: Keep EndpointMapper in separate branch

2. **Missing Edge Cases**:
   - **Mitigation**: Audit all endpoint usage patterns
   - **Testing**: Test with multiple DC API versions

3. **Performance Impact**:
   - **Mitigation**: Remove mapping overhead improves performance
   - **Monitoring**: Measure response times before/after

## Timeline

**Total Estimated Time**: 3-4 days

```
Day 1: Analysis + API Client refactoring start
Day 2: Complete API Client + Module updates  
Day 3: Testing + Error handling
Day 4: Documentation + Final validation
```

---

**Dependencies**:
- Issue #1 resolution may be done in parallel
- No external dependencies required

**Next Steps**: 
1. Review and approve plan
2. Create feature branch for refactoring
3. Begin Phase 1 implementation

**Navigation**: [← Back to Issues Tracker](issues_tracker.md) | [Implementation Progress](implementation_progress.md)