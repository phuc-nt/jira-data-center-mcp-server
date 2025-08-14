# MCP Jira Data Center Server v1.0.0-DC: Complete Tools Reference

Tài liệu này liệt kê đầy đủ 38 tools mà MCP Jira Data Center Server v1.0.0-DC sẽ hỗ trợ, với API endpoint mapping từ Cloud API v3 sang Data Center API v2/latest và Agile API v1.0.

**Version**: 1.0.0-DC  
**Architecture**: Production-ready modular architecture với 3 specialized modules + PAT-only authentication  
**Total Tools**: 38 DC-adapted tools (46 → 38, Dashboard module removed)  
**API Coverage**: Jira Data Center API v2/latest + Agile API v1.0  
**Success Rate**: Target 100% (38/38 tools operational)  
**Authentication**: Personal Access Token (PAT) only - simplified và secure  
**Last Updated**: August 14, 2025 (Development Ready - Complete Tool Specification)

## Modular Architecture (v1.0.0-DC)

### Module Distribution (38 Total Tools - Dashboard Module Removed)

| Module | Tools | Compatibility | Data Center API Focus |
|--------|-------|--------------|-----------------------| 
| **Core** | 14 | Moderate | API v2/latest mapping, Wiki Markup support |  
| **Agile** | 10 | High | Agile API v1.0 unchanged - minimal adaptation needed |
| **Search** | 14 | High | Enhanced Epic search, DC-optimized performance |

## DC API Mapping Strategy

### 🎯 Cloud → Data Center Endpoint Mapping

**Core Transformations**:
```typescript
// Cloud API v3 → Data Center API v2/latest
const endpointMappings = {
  // Core API version change
  '/rest/api/3/': '/rest/api/2/',
  
  // Specific endpoint adaptations
  '/rest/api/3/users': '/rest/api/2/user/search',
  '/rest/api/3/project/{key}/version': '/rest/api/2/project/{key}/versions',
  
  // Agile API unchanged
  '/rest/agile/1.0/': '/rest/agile/1.0/'
};
```

## Tools by Module

### 🔧 Core Module (14 tools)

| Tool | Mô tả | Tham số chính | DC API Endpoint | Cloud → DC Changes |
|------|-------|---------------|-----------------|-------------------|
| getUser | Lấy thông tin user theo accountId/username | accountId, username | `/rest/api/2/user` | Username support added |
| getAssignableUsers | Lấy users có thể assign cho issue | issueKey, query | `/rest/api/2/issue/{issueKey}/assignable/multiProjectSearch` | Minimal changes |
| listUsers | Liệt kê tất cả users | startAt, maxResults | `/rest/api/2/user/search` | **Endpoint changed** |
| getProject | Lấy chi tiết project | projectIdOrKey | `/rest/api/2/project/{projectKey}` | Version change only |
| listProjects | Liệt kê projects | expand | `/rest/api/2/project` | Version change only |
| createIssue | Tạo issue mới | projectKey, summary, issueType | `/rest/api/2/issue` | Wiki Markup support |
| updateIssue | Cập nhật issue | issueIdOrKey, fields | `/rest/api/2/issue/{issueKey}` | Wiki Markup format |
| deleteIssue | Xóa issue | issueIdOrKey | `/rest/api/2/issue/{issueKey}` | Version change only |
| assignIssue | Gán issue cho user | issueIdOrKey, accountId | `/rest/api/2/issue/{issueKey}/assignee` | Username fallback |
| getIssueTransitions | Lấy transitions khả dụng | issueIdOrKey | `/rest/api/2/issue/{issueKey}/transitions` | Version change only |
| transitionIssue | Chuyển trạng thái issue | issueIdOrKey, transitionId | `/rest/api/2/issue/{issueKey}/transitions` | Version change only |
| addIssueComment | Thêm comment vào issue | issueIdOrKey, body | `/rest/api/2/issue/{issueKey}/comment` | **Wiki Markup native** |
| getIssueComments | Lấy comments của issue | issueIdOrKey | `/rest/api/2/issue/{issueKey}/comment` | Version change only |
| listProjectVersions | Liệt kê versions của project | projectIdOrKey | `/rest/api/2/project/{projectKey}/versions` | **Endpoint changed** |

### 🏃‍♂️ Agile Module (10 tools) - HIGH COMPATIBILITY

| Tool | Mô tả | Tham số chính | DC API Endpoint | Cloud → DC Changes |
|------|-------|---------------|-----------------|-------------------|
| listBoards | Liệt kê boards | projectKeyOrId, type | `/rest/agile/1.0/board` | **No changes needed** |
| getBoard | Lấy chi tiết board | boardId | `/rest/agile/1.0/board/{boardId}` | **No changes needed** |
| listSprints | Liệt kê sprints | boardId, state | `/rest/agile/1.0/board/{boardId}/sprint` | **No changes needed** |
| getSprint | Lấy chi tiết sprint | sprintId | `/rest/agile/1.0/sprint/{sprintId}` | **No changes needed** |
| getSprintIssues | Lấy issues trong sprint | sprintId | `/rest/agile/1.0/sprint/{sprintId}/issue` | **No changes needed** |
| createSprint | Tạo sprint mới | boardId, name, goal | `/rest/agile/1.0/sprint` | **No changes needed** |
| startSprint | Bắt đầu sprint | sprintId, startDate, endDate | `/rest/agile/1.0/sprint/{sprintId}` | **No changes needed** |
| closeSprint | Đóng sprint | sprintId | `/rest/agile/1.0/sprint/{sprintId}` | **No changes needed** |
| addIssueToSprint | Thêm issue vào sprint | sprintId, issueIdOrKey | `/rest/agile/1.0/sprint/{sprintId}/issue` | **No changes needed** |
| addIssuesToBacklog | Đưa issues vào backlog | issues | `/rest/agile/1.0/backlog/issue` | **No changes needed** |

### 🔍 Search Module (14 tools) - DC ENHANCED

| Tool | Mô tả | Tham số chính | DC API Endpoint | Cloud → DC Changes |
|------|-------|---------------|-----------------|-------------------|
| enhancedSearchIssues | **ENHANCED SEARCH** - Smart filtering | jql, fields, expand | `/rest/api/2/search` | Version change only |
| enhancedGetIssue | **ENHANCED GET** - Context-aware | issueIdOrKey, fields, expand | `/rest/api/2/issue/{issueKey}` | Version change only |
| listBacklogIssues | Lấy backlog issues | boardId, jql | `/rest/agile/1.0/board/{boardId}/backlog` | **No changes needed** |
| epicSearchAgile | **EPIC SEARCH VIA AGILE API** | boardId, query | `/rest/agile/1.0/board/{boardId}/epic` | **Better DC support** |
| universalSearchUsers | **UNIVERSAL USER SEARCH** | query, mode, issueKey | Multiple DC endpoints | **Enhanced DC version** |
| listUsers | Liệt kê users | startAt, maxResults | `/rest/api/2/user/search` | **Endpoint changed** |
| getUser | Lấy thông tin user | accountId, username | `/rest/api/2/user` | Username support added |
| listProjects | Liệt kê projects | expand | `/rest/api/2/project` | Version change only |
| listProjectVersions | Liệt kê versions | projectIdOrKey | `/rest/api/2/project/{projectKey}/versions` | **Endpoint changed** |
| listFilters | Liệt kê filters | expand | `/rest/api/2/filter/search` | Version change only |
| getFilter | Lấy chi tiết filter | filterId | `/rest/api/2/filter/{filterId}` | Version change only |
| listBoards | Liệt kê boards | projectKeyOrId | `/rest/agile/1.0/board` | **No changes needed** |
| listSprints | Liệt kê sprints | boardId | `/rest/agile/1.0/board/{boardId}/sprint` | **No changes needed** |

## DC-Specific Enhancements

### 🚀 Authentication Implementation

**PAT-Only Authentication**:
```typescript
interface JiraDataCenterAuth {
  baseUrl: string;                    // e.g., "https://jira.company.com"
  personalAccessToken: string;        // PAT from DC 8.14+
  contextPath?: string;               // e.g., "/jira" if custom context
}

// Authentication header
const dcHeaders = {
  'Authorization': `Bearer ${personalAccessToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### 🎯 Content Format Support

**Wiki Markup Implementation**:
```typescript
// Data Center native Wiki Markup
const dcComment = {
  body: 'h3. Heading\n\nThis is *bold* text and _italic_ text'
};

// Content format flexibility
interface ContentFormatOptions {
  preferredFormat: 'wikimarkup' | 'plaintext';
  fallbackToPlaintext: boolean;
  preserveFormatting: boolean;
}
```

### 📊 API Compatibility Matrix

| Feature Category | Compatibility Level | Changes Required |
|------------------|-------------------|-----------------|
| **User Operations** | 90% | Username support, endpoint adaptation |
| **Issue CRUD** | 95% | Version change, Wiki Markup format |
| **Project Management** | 95% | Endpoint path variations |
| **Agile Operations** | 100% | **No changes needed** |
| **Search & Filtering** | 90% | Version changes, enhanced capabilities |
| **Authentication** | New Implementation | **PAT-only strategy** |

## Migration from Cloud v4.1.6

### 🔄 Tool Count Reduction

**Removed (Dashboard Module - 8 tools)**:
- listDashboards, getDashboard, getDashboardGadgets
- getJiraGadgets, createDashboard, updateDashboard  
- addGadgetToDashboard, removeGadgetFromDashboard
- **Reason**: Dashboard API has different implementation patterns in DC

**Maintained (38 tools across 3 modules)**:
- **Core Module**: 14 tools with moderate API adaptations
- **Agile Module**: 10 tools with minimal changes (high compatibility)
- **Search Module**: 14 tools with enhanced DC capabilities

### 🎯 DC-Specific Advantages

**Enhanced Epic Search**:
- Better Epic API support trong Data Center
- Enhanced filtering capabilities
- Improved performance với direct network access

**Content Flexibility**:
- Native Wiki Markup support
- Plain text fallback for simplicity
- Better rich text handling

**Network Performance**:
- Direct network access (no internet routing)
- Higher concurrent request limits
- Lower latency với on-premises deployment

## Success Metrics - Target v1.0.0-DC

- **Tool Adaptation**: 38/38 tools DC-compatible (100% target)
- **API Compatibility**: Complete Data Center v2/latest + Agile v1.0 support
- **Authentication**: PAT-only implementation với enterprise security
- **Performance**: Sub-500ms maintained với DC optimizations
- **Content Support**: Native Wiki Markup với graceful fallback

### Architecture Benefits

**Simplified Authentication**:
- Single PAT method vs Cloud's multiple auth strategies
- Better enterprise security compliance
- No credential storage requirements

**Enhanced Performance**:
- Direct network access vs internet routing
- Dedicated resources vs shared cloud infrastructure
- Custom caching strategies

**Enterprise Integration**:
- LDAP/AD user resolution support
- Custom fields compatibility
- On-premises data sovereignty

---

*Last Updated: August 14, 2025*  
*MCP Jira Data Center Server v1.0.0-DC - Complete Tools Reference*  
*38 Tools across 3 Specialized Modules with PAT-Only Authentication*