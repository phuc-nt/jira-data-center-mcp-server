# Sprint 1.2: API Client Adaptation for Data Center

> **Sprint Duration**: Week 3-4 (Aug 28 - Sep 11, 2025)  
> **Sprint Goal**: Implement Cloud → Data Center API client adaptation với endpoint mapping và content format conversion  
> **Dependencies**: Sprint 1.1 (PAT Authentication) ✅ COMPLETE  
> **Success Criteria**: Unified API client supporting all DC endpoints với content format conversion

---

## 🎯 Sprint Objectives

### Primary Goals
1. **Endpoint Mapping System** - Cloud API v3 → DC API v2/latest translation
2. **Content Format Conversion** - ADF ↔ Wiki Markup support
3. **User Resolution Strategy** - AccountId ↔ Username dual support
4. **API Client Library** - Unified DC API client với error handling

### Success Metrics
- ✅ All Cloud endpoints mapped to DC equivalents
- ✅ Content format conversion working (ADF → Wiki Markup)
- ✅ User resolution supporting both accountId và username
- ✅ API client ready cho all 38 tools implementation
- ✅ Performance targets met (<200ms endpoint mapping)

---

## 📋 Sprint Backlog

### Epic 1: Endpoint Mapping System

#### Story 1.1: Core API Endpoint Mapping
**Estimate**: 14 hours  
**Priority**: P0 - CRITICAL  
**Acceptance Criteria**:
- [ ] Complete mapping từ Cloud API v3 → DC API v2/latest
- [ ] Support cho both 'latest' và 'v2' API versions
- [ ] Path parameter transformation
- [ ] Query parameter adaptation
- [ ] Endpoint capability detection

**Endpoint Mappings Implementation**:
```typescript
class EndpointMapper {
  private mappings = {
    // Core API version changes
    '/rest/api/3/': '/rest/api/{version}/',
    
    // Specific endpoint adaptations
    '/rest/api/3/users': '/rest/api/{version}/user/search',
    '/rest/api/3/project/{key}/version': '/rest/api/{version}/project/{key}/versions',
    '/rest/api/3/issue/{key}/assignable/search': '/rest/api/{version}/issue/{key}/assignable/multiProjectSearch',
    
    // Agile API unchanged (HIGH COMPATIBILITY)
    '/rest/agile/1.0/': '/rest/agile/1.0/',
    
    // Dashboard endpoints removed (not supported in DC version)
  };

  - [ ] mapEndpoint(cloudEndpoint: string, apiVersion: string): string
  - [ ] validateEndpointSupport(endpoint: string): boolean  
  - [ ] transformPathParams(endpoint: string, params: object): string
  - [ ] adaptQueryParams(cloudParams: object, dcEndpoint: string): object
}
```

#### Story 1.2: API Version Negotiation
**Estimate**: 8 hours  
**Priority**: P0 - CRITICAL  
**Acceptance Criteria**:
- [ ] Automatic API version detection cho DC instance
- [ ] Fallback strategy từ 'latest' → 'v2' if needed
- [ ] Version capability matrix
- [ ] Version-specific endpoint adaptations
- [ ] Error handling cho unsupported versions

**Version Detection**:
```typescript
class APIVersionManager {
  - [ ] detectSupportedVersion(baseUrl: string): Promise<'latest' | '2'>
  - [ ] getVersionCapabilities(version: string): APICapabilities
  - [ ] validateVersionCompatibility(requiredFeatures: string[]): boolean
  - [ ] negotiateBestVersion(dcInstance: DCInstance): APIVersion
}
```

### Epic 2: Content Format Conversion

#### Story 2.1: ADF to Wiki Markup Converter
**Estimate**: 16 hours  
**Priority**: P0 - CRITICAL  
**Acceptance Criteria**:
- [ ] Complete ADF document structure parsing
- [ ] Wiki Markup generation cho common elements
- [ ] Graceful handling cho unsupported ADF elements
- [ ] Performance optimization cho large documents
- [ ] Bidirectional conversion support

**Content Converter Implementation**:
```typescript
class ContentFormatConverter {
  // ADF → Wiki Markup conversion
  - [ ] adfToWikiMarkup(adf: ADFDocument): string
  - [ ] convertTextElements(node: ADFNode): string
  - [ ] convertFormatting(marks: ADFMark[]): string
  - [ ] convertStructures(node: ADFNode): string // headers, lists, tables
  - [ ] convertLinks(node: ADFNode): string
  - [ ] handleUnsupportedElements(node: ADFNode): string
  
  // Wiki Markup → Plain Text fallback
  - [ ] wikiMarkupToPlainText(wikiText: string): string
  - [ ] preserveImportantFormatting(text: string): string
  
  // Format detection và validation
  - [ ] detectContentFormat(content: string): 'adf' | 'wikimarkup' | 'plaintext'
  - [ ] validateWikiMarkup(markup: string): ValidationResult
}

// Content format mappings
interface ContentFormatMappings {
  // Text formatting
  '**bold**': '*bold*',
  '*italic*': '_italic_',
  '`code`': '{{code}}',
  
  // Structure elements  
  'heading1': 'h1. ',
  'heading2': 'h2. ',
  'heading3': 'h3. ',
  'bulletList': '* ',
  'orderedList': '# ',
  
  // Links và references
  'link': '[text|url]',
  'mention': '[~username]',
  'emoji': ':emoji_name:'
}
```

#### Story 2.2: Content Format Strategy
**Estimate**: 6 hours  
**Priority**: P1 - HIGH  
**Acceptance Criteria**:
- [ ] Preferred format detection cho DC instance
- [ ] Graceful degradation strategy
- [ ] Content format configuration
- [ ] Format conversion caching
- [ ] Error handling cho conversion failures

### Epic 3: User Resolution System

#### Story 3.1: Dual User Identifier Support
**Estimate**: 12 hours  
**Priority**: P0 - CRITICAL  
**Acceptance Criteria**:
- [ ] Support cho both accountId và username
- [ ] Automatic user identifier detection
- [ ] User lookup strategies (accountId → username, username → accountId)
- [ ] Fallback mechanisms cho identifier resolution
- [ ] Caching cho user resolution

**User Resolver Implementation**:
```typescript
class UserResolver {
  - [ ] resolveUser(identifier: string): Promise<User>
  - [ ] detectIdentifierType(id: string): 'accountId' | 'username' | 'email'
  - [ ] findUserByAccountId(accountId: string): Promise<User>
  - [ ] findUserByUsername(username: string): Promise<User>
  - [ ] findUserByEmail(email: string): Promise<User>
  - [ ] cacheUserResolution(user: User): void
  
  // Assignment compatibility
  - [ ] getAssignableIdentifier(user: User, context: 'issue' | 'comment'): string
  - [ ] validateUserForAssignment(userId: string, issueKey: string): Promise<boolean>
}

// User resolution strategies
enum UserResolutionStrategy {
  ACCOUNT_ID_FIRST = 'accountId_first',    // Try accountId, fallback to username
  USERNAME_FIRST = 'username_first',       // Try username, fallback to accountId  
  EMAIL_LOOKUP = 'email_lookup',           // Search by email address
  DISPLAY_NAME = 'display_name'            // Search by display name
}
```

### Epic 4: Unified API Client

#### Story 4.1: Data Center API Client
**Estimate**: 18 hours  
**Priority**: P0 - CRITICAL  
**Acceptance Criteria**:
- [ ] Unified API client cho all DC endpoints
- [ ] Request/response interceptors
- [ ] Automatic retry logic với exponential backoff
- [ ] Response caching cho read-only operations
- [ ] Comprehensive error handling

**API Client Architecture**:
```typescript
class JiraDataCenterAPIClient {
  private config: JiraDataCenterConfig;
  private auth: PATAuthenticator;
  private endpointMapper: EndpointMapper;
  private contentConverter: ContentFormatConverter;
  private userResolver: UserResolver;
  
  // Core API methods
  - [ ] get<T>(endpoint: string, params?: object): Promise<T>
  - [ ] post<T>(endpoint: string, data: object): Promise<T>
  - [ ] put<T>(endpoint: string, data: object): Promise<T>
  - [ ] delete<T>(endpoint: string): Promise<T>
  
  // Request interceptors
  - [ ] addAuthHeaders(request: Request): Request
  - [ ] mapEndpoint(request: Request): Request
  - [ ] convertRequestContent(request: Request): Request
  - [ ] resolveUserIdentifiers(request: Request): Promise<Request>
  
  // Response interceptors  
  - [ ] handleDCResponse<T>(response: Response): Promise<T>
  - [ ] convertResponseContent(response: Response): Response
  - [ ] cacheReadOnlyResponse(response: Response): void
  - [ ] logRequestResponse(req: Request, res: Response): void
}
```

#### Story 4.2: Error Handling & Retry Logic
**Estimate**: 10 hours  
**Priority**: P1 - HIGH  
**Acceptance Criteria**:
- [ ] DC-specific error code mapping
- [ ] Retry logic cho transient failures
- [ ] Circuit breaker pattern cho DC availability
- [ ] Request timeout handling
- [ ] Error context preservation

**Error Handling Strategy**:
```typescript
class DCErrorHandler {
  // DC-specific error mapping
  - [ ] mapDCError(error: DCAPIError): MCPError
  - [ ] shouldRetry(error: DCAPIError): boolean
  - [ ] getRetryDelay(attempt: number): number
  - [ ] handleRateLimit(error: RateLimitError): Promise<void>
  
  // Circuit breaker
  - [ ] trackFailures(endpoint: string): void
  - [ ] isCircuitOpen(endpoint: string): boolean
  - [ ] resetCircuit(endpoint: string): void
}

// Retry configuration
interface RetryConfig {
  maxAttempts: 3,
  baseDelay: 1000,      // 1 second
  maxDelay: 30000,      // 30 seconds  
  exponential: true,
  retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']
}
```

---

## 🧪 Testing Strategy

### Unit Testing
```typescript
describe('API Client Adaptation', () => {
  describe('Endpoint Mapping', () => {
    - [ ] 'should map Cloud API v3 to DC API v2'
    - [ ] 'should handle path parameters correctly'
    - [ ] 'should adapt query parameters'
    - [ ] 'should support API version negotiation'
    - [ ] 'should detect unsupported endpoints'
  });

  describe('Content Format Conversion', () => {
    - [ ] 'should convert simple ADF to Wiki Markup'
    - [ ] 'should handle complex ADF structures'
    - [ ] 'should gracefully degrade unsupported elements'
    - [ ] 'should preserve important formatting'
    - [ ] 'should detect content format correctly'
  });

  describe('User Resolution', () => {
    - [ ] 'should resolve users by accountId'
    - [ ] 'should resolve users by username'
    - [ ] 'should handle mixed identifier scenarios'
    - [ ] 'should cache user resolutions'
    - [ ] 'should fallback gracefully'
  });
});
```

### Integration Testing
```typescript
describe('DC API Integration', () => {
  describe('Real DC Instance', () => {
    - [ ] 'should authenticate và make successful requests'
    - [ ] 'should handle all mapped endpoints'
    - [ ] 'should convert content formats correctly'
    - [ ] 'should resolve users in real DC environment'
    - [ ] 'should handle errors gracefully'
  });
});
```

---

## 🔧 Implementation Plan

### Week 3: Core API Adaptation
**Days 1-2**: Endpoint Mapping System
- Implement EndpointMapper class
- Core API v3 → v2/latest mappings
- Path và query parameter transformations
- API version negotiation logic

**Days 3-4**: Content Format Conversion
- ADF parser implementation
- Wiki Markup generator
- Common element conversions
- Graceful degradation logic

**Day 5**: User Resolution System
- User identifier detection
- AccountId ↔ Username resolution
- User lookup strategies
- Caching implementation

### Week 4: API Client & Integration
**Days 6-7**: Unified API Client
- JiraDataCenterAPIClient implementation
- Request/response interceptors
- Authentication integration
- Basic CRUD operations

**Days 8-9**: Error Handling & Retry
- DC error mapping system
- Retry logic với exponential backoff
- Circuit breaker implementation
- Performance optimization

**Day 10**: Testing & Validation
- Comprehensive unit testing
- Integration testing với real DC
- Performance benchmarking
- Sprint review và documentation

---

## 📊 Performance Targets

### API Client Performance
- **Endpoint Mapping**: <50ms per request
- **Content Conversion**: <200ms for typical documents
- **User Resolution**: <100ms with caching
- **Request Processing**: <500ms total request lifecycle

### Caching Strategy
```typescript
interface CacheConfig {
  userResolution: 300000,    // 5 minutes
  readOnlyRequests: 60000,   // 1 minute  
  endpointCapabilities: 3600000, // 1 hour
  apiVersionInfo: 86400000   // 24 hours
}
```

---

## 🎯 Definition of Done

### Functionality
- [ ] All Cloud endpoints có DC equivalents mapped
- [ ] Content format conversion working cho typical use cases
- [ ] User resolution supporting dual identifier system
- [ ] API client ready cho tool implementation
- [ ] Error handling comprehensive

### Quality
- [ ] >90% test coverage across all API client code
- [ ] Performance targets met
- [ ] Integration tests passing với real DC instance
- [ ] Code review completed
- [ ] Documentation updated

### Documentation
- [ ] API mapping reference guide
- [ ] Content format conversion examples
- [ ] User resolution strategy guide
- [ ] Error handling documentation

---

## 🚨 Risk Mitigation

### High-Risk Items
1. **API Version Compatibility**: Some endpoints might not exist trong older DC versions
   - **Mitigation**: Comprehensive version detection và capability matrix
   - **Fallback**: Clear error messages với version requirements

2. **Content Format Complexity**: Complex ADF structures might not convert perfectly
   - **Mitigation**: Graceful degradation với plain text fallback
   - **Fallback**: User notification về format limitations

3. **User Resolution Conflicts**: AccountId vs Username mapping might be ambiguous
   - **Mitigation**: Multiple resolution strategies với fallback chain
   - **Fallback**: Manual user specification option

### Contingency Plans
- **Endpoint Mapping Failures**: Comprehensive error logging với suggested alternatives
- **Content Conversion Issues**: Plain text fallback với preserved structure
- **User Resolution Problems**: Clear error messages với resolution guidance

---

## 📈 Sprint Success Metrics

### Technical Metrics
- **Endpoint Coverage**: 100% of required Cloud endpoints mapped
- **Content Conversion**: >95% success rate cho typical documents
- **User Resolution**: >99% success rate với caching
- **API Performance**: <500ms average request processing time

### Quality Metrics
- **Test Coverage**: >90% across API client components
- **Error Handling**: Clear guidance cho >95% of error scenarios
- **Documentation**: Complete API reference với examples
- **Integration**: Successful testing với multiple DC versions

---

_Sprint 1.2 API Client Adaptation - Created August 14, 2025_  
_Dependencies: Sprint 1.1 Foundation ✅_  
_Next Sprint: 1.3 Agile Module Migration_  
_Status: Ready for Implementation_