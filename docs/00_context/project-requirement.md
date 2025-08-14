# MCP Jira Data Center Server - Project Requirements Document

> **Project**: MCP Jira Data Center Server (PAT-Only Tools Architecture)  
> **Version**: v1.0.0-DC DEVELOPMENT READY 🚀  
> **Status**: Comprehensive migration plan với Personal Access Token authentication only  
> **Achievement**: Complete requirements analysis và technical strategy cho Data Center deployment

---

## 🎯 Project Vision

**Mission Statement**: Tạo ra một MCP server chuyên biệt cho Jira Data Center/Server với Personal Access Token authentication duy nhất, tools-only architecture, và tối ưu hóa cho enterprise on-premises environments.

**Core Philosophy**: "PAT-Only, Data Center-Focused" - Đơn giản hóa authentication với security tốt nhất, tối ưu cho enterprise self-hosted Jira instances.

---

## 🔧 Technical Requirements

### 1. Architecture Transformation từ Cloud

**From Cloud v4.1.6 (Source)**:
- Multi-auth: Basic + API Token + OAuth
- Cloud-specific: `*.atlassian.net` URLs  
- API v3 focused với ADF content format
- 46 tools across 4 modules

**To Data Center v1.0.0-DC (Target)** ✅:
- PAT-only authentication: Simplified và secure
- Self-hosted: Custom domain support với context paths
- API v2/latest compatibility với Wiki Markup support
- **Same 46 tools** adapted cho Data Center endpoints

### 2. PAT-Only Authentication Design

**Personal Access Token Strategy**:
```typescript
interface JiraDataCenterAuth {
  personalAccessToken: string; // PAT từ Jira DC 8.14+
  tokenValidation: boolean;    // Auto-validate token on startup
  tokenRefresh: false;         // PATs không cần refresh
}
```

**Authentication Flow**:
- **Header**: `Authorization: Bearer {personal-access-token}`
- **Validation**: Startup token validation via `/rest/api/2/myself`
- **Security**: No credential storage, token-only approach
- **Fallback**: Graceful error handling cho invalid/expired tokens

### 3. API Version Compatibility - ANALYZED ✅

**Endpoint Mapping Strategy**:

**High Compatibility (90%+ direct mapping)**:
- **Agile Module**: `/rest/agile/1.0/` → No changes needed
- **Core CRUD**: `/rest/api/3/` → `/rest/api/2/` version change only
- **Search Operations**: Same JQL support với enhanced filtering

**Moderate Changes (endpoint variations)**:
- **Dashboard Module**: `/dashboard/search` → `/dashboard` 
- **User Search**: `/users` → `/user/search`
- **Project Versions**: `/version` → `/versions`

**Content Format Adaptation**:
- **Comments**: ADF → Wiki Markup conversion
- **Descriptions**: Support both Wiki Markup và plain text
- **Rich Content**: Graceful degradation strategy

### 4. Jira Data Center Feature Scope - PLANNED ✅

**Target Tools (38 tools across 3 modules)**:

**Core Module (14 tools)** 📋:
- Issue CRUD: create, update, delete, assign, transition
- Project Management: list, get project details
- User Operations: get, search, assignable users
- Comments: add/get với Wiki Markup support  
- Versions: project version management

**Agile Module (10 tools)** ✅ HIGH COMPATIBILITY:
- Board Management: list, get boards
- Sprint Lifecycle: create, start, close sprints
- Sprint Operations: get sprint details, issues
- Backlog Management: add issues to sprint/backlog

**Search Module (14 tools)** ✅ HIGH COMPATIBILITY:
- Enhanced Search: JQL với smart filtering
- Epic Discovery: via Agile API (better than Cloud)
- Universal User Search: multi-mode user discovery
- Filter Management: saved filters và sharing

### 5. Removed Features (Cloud-Specific)

**Not Applicable for Data Center**:
- OAuth 2.0 flows: Data Center có simpler OAuth model
- Atlassian Account ID dependency: Username support available
- ADF Content requirement: Wiki Markup native support
- Cloud-specific rate limiting: Admin-configurable limits

**Simplified Features**:
- Single authentication method: PAT only
- Flexible base URL: Support custom domains và context paths
- Local user management: LDAP/Local users instead of Atlassian accounts

---

## 📁 Target Architecture

### File Structure Design
```
src/
├── index.ts - Main monolithic server (backward compatibility)
├── modules/ - 3 Specialized Modules
│   ├── core/ - Core module server (14 tools)
│   ├── agile/ - Agile module server (10 tools)
│   └── search/ - Search module server (14 tools)
├── tools/jira/ - Legacy monolithic tools (38 DC-adapted tools)
├── utils/
│   ├── jira-dc-api.ts - Data Center API client với PAT auth
│   ├── pat-auth.ts - PAT authentication handler
│   ├── content-formatter.ts - Wiki Markup ↔ plain text converter
│   └── error-handler.ts - DC-specific error mapping
├── schemas/
│   ├── jira-dc.ts - Data Center schemas với username support
│   └── common.ts - Shared validation schemas
└── config/
    └── datacenter-config.ts - DC configuration management
```

### Domain Organization
```
Entry Points:
├── mcp-jira-dc-server (38 tools - full compatibility)
├── mcp-jira-dc-core (14 tools - essential operations)
├── mcp-jira-dc-agile (10 tools - sprint/board focus)
└── mcp-jira-dc-search (14 tools - search/discovery focus)
```

---

## 🚀 Migration Strategy

### Phase 1: Authentication & Configuration
- PAT authentication implementation
- Base URL detection và context path support
- API version negotiation (latest/v2)
- Configuration validation và error handling

### Phase 2: API Client Adaptation  
- Endpoint mapping implementation
- Content format conversion utilities
- User resolution strategies (username ↔ accountId)
- Error response mapping

### Phase 3: Tools Migration (Module by Module)
- **Agile First**: Highest compatibility, quickest wins
- **Core Second**: Essential operations với moderate changes
- **Search Third**: Enhanced capabilities với epic discovery

### Phase 4: Testing & Validation
- Unit testing với mock Data Center responses
- Integration testing với real Data Center instances
- Performance benchmarking
- Security audit và PAT handling review

---

## ⚖️ Backward Compatibility Strategy

**Breaking Changes (Acceptable)**:
- Authentication method: OAuth/Basic → PAT only
- Base URL format: Atlassian URLs → Custom domains
- Content format preference: ADF → Wiki Markup

**Migration Support**:
- Configuration converter từ Cloud config
- API endpoint mapping documentation
- Error message mapping với clear guidance
- Version compatibility matrix

**User Migration Path**:
```typescript
// Old Cloud Config
const cloudConfig = {
  siteName: 'mysite',
  userEmail: 'user@domain.com', 
  apiToken: 'ATATT3...'
};

// New Data Center Config
const dcConfig = {
  baseUrl: 'https://jira.company.com',
  personalAccessToken: 'NjEyODYwNjE2NjY4...',
  apiVersion: 'latest'
};
```

---

## ✅ Success Criteria - TARGETS DEFINED

### Technical Metrics 📋 PLANNED
- ✅ **PAT Authentication**: Single, secure authentication method
- ✅ **Tool Compatibility**: All 38 tools operational với Data Center APIs
- ✅ **Performance**: Sub-500ms response times maintained từ Cloud version  
- ✅ **API Coverage**: Complete Data Center API v2/latest support
- ✅ **Content Handling**: Wiki Markup support với ADF fallback

### Quality Metrics 📋 PLANNED
- ✅ **Consistent Patterns**: All tools follow DC-adapted patterns
- ✅ **Error Handling**: Comprehensive DC-specific error mapping
- ✅ **Documentation**: Complete API reference cho Data Center users
- ✅ **Integration Testing**: Real DC instance validation

### User Experience 📋 PLANNED  
- ✅ **Configuration Simplicity**: Single PAT setup
- ✅ **Migration Support**: Clear upgrade path từ Cloud version
- ✅ **Enterprise Ready**: Support cho corporate network configurations
- ✅ **Self-Hosted Optimized**: Performance tuning cho on-premises deployment

### Security & Compliance 📋 PLANNED
- ✅ **PAT Security**: Best practices cho token handling
- ✅ **Network Security**: Corporate firewall compatibility
- ✅ **Audit Trail**: Comprehensive logging cho enterprise compliance
- ✅ **Token Management**: Clear token lifecycle management

---

## 🎯 Key Advantages over Cloud Version

### **Simplified Authentication**
- Single PAT method vs multiple auth strategies
- No OAuth complexity for enterprise users
- Better integration với corporate security policies

### **Enhanced Performance**  
- Direct network access vs internet routing
- Dedicated resources vs shared infrastructure
- Custom caching strategies vs cloud limitations

### **Enterprise Features**
- LDAP/AD integration support
- Custom fields và workflow compatibility
- On-premises data sovereignty

### **Content Flexibility**
- Native Wiki Markup support
- Better rich text handling
- Custom field format support

---

**Reference Implementation**: Data Center-optimized architecture  
**Achievement**: Comprehensive migration strategy với PAT-only authentication

### Migration Benefits Summary
- **Simplified Setup**: PAT-only authentication reduces configuration complexity
- **Enhanced Security**: Token-based access với enterprise-grade security
- **Performance Optimized**: Direct network access và dedicated resources
- **Enterprise Ready**: Full compatibility với corporate Jira Data Center instances
- **Content Native**: Wiki Markup support cho better user experience

---

_Document Status: Requirements Complete ✅_  
_Last Updated: 2025-08-14 - Initial Planning Phase_  
_Status: Development Ready với Comprehensive Migration Strategy_