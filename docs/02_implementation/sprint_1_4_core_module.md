# Sprint 1.4: Core Module Migration (MODERATE COMPLEXITY)

> **Sprint Duration**: Week 7-8 (Sep 25 - Oct 9, 2025)  
> **Sprint Goal**: Migrate all 14 Core tools với API version changes, Wiki Markup support, và user resolution  
> **Dependencies**: Sprint 1.3 (Agile Module) ✅ COMPLETE  
> **Success Criteria**: All 14 Core tools operational với DC, Wiki Markup working, user resolution functional

---

## 🎯 Sprint Objectives

### Primary Goals
1. **Core CRUD Operations** - Issues, Projects, Users, Comments
2. **Wiki Markup Integration** - Native DC content format support
3. **User Resolution Strategy** - AccountId ↔ Username dual support
4. **API Version Adaptation** - Cloud API v3 → DC API v2/latest

### Success Metrics
- ✅ **14/14 Core tools operational** với Data Center
- ✅ **Wiki Markup support** trong comments và descriptions
- ✅ **User resolution working** cho assignees và mentions
- ✅ **API endpoint mapping** từ v3 → v2/latest functional
- ✅ **Performance maintained** (<500ms average response times)

---

## 📋 Sprint Backlog - 14 Tools Implementation

### Epic 1: User Management (3 tools)

#### Story 1.1: getUser Tool
**Estimate**: 4 hours  
**Priority**: P0 - CRITICAL  
**Cloud Endpoint**: `/rest/api/3/user`  
**DC Endpoint**: `/rest/api/2/user` ✅ **Version change + Username support**  
**Acceptance Criteria**:
- [ ] Support both accountId và username lookup
- [ ] Automatic identifier type detection
- [ ] User information complete với DC fields
- [ ] Error handling cho user not found

```typescript
// Enhanced getUser with dual identifier support
const getUserTool = {
  name: 'getUser',
  description: 'Get Jira user information by accountId or username',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { 
        type: 'string', 
        description: 'User account ID (Cloud format)' 
      },
      username: { 
        type: 'string', 
        description: 'Username (DC native format)' 
      },
      key: { 
        type: 'string', 
        description: 'User key (legacy DC format)' 
      }
    }
  },
  
  implementation: async (params, context) => {
    const userResolver = new UserResolver(dcApiClient);
    
    // Determine identifier type và resolve
    let identifier = params.accountId || params.username || params.key;
    const user = await userResolver.resolveUser(identifier);
    
    return {
      content: [
        { type: 'text', text: `User: ${user.displayName} (${user.accountId || user.name})` },
        { type: 'json', data: user }
      ]
    };
  }
};
```

#### Story 1.2: listUsers Tool
**Estimate**: 5 hours  
**Priority**: P0 - CRITICAL  
**Cloud Endpoint**: `/rest/api/3/users`  
**DC Endpoint**: `/rest/api/2/user/search` ✅ **Endpoint path changed**

#### Story 1.3: getAssignableUsers Tool
**Estimate**: 4 hours  
**Priority**: P1 - HIGH  
**Cloud Endpoint**: `/rest/api/3/issue/{issueKey}/assignable/multiProjectSearch`  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/assignable/multiProjectSearch` ✅ **Version change only**

### Epic 2: Project Management (2 tools)

#### Story 2.1: getProject Tool
**Estimate**: 3 hours  
**Priority**: P0 - CRITICAL  
**Cloud Endpoint**: `/rest/api/3/project/{projectKey}`  
**DC Endpoint**: `/rest/api/2/project/{projectKey}` ✅ **Version change only**

#### Story 2.2: listProjects Tool
**Estimate**: 3 hours  
**Priority**: P1 - HIGH  
**Cloud Endpoint**: `/rest/api/3/project`  
**DC Endpoint**: `/rest/api/2/project` ✅ **Version change only**

### Epic 3: Issue Management (5 tools)

#### Story 3.1: createIssue Tool
**Estimate**: 8 hours  
**Priority**: P0 - CRITICAL  
**Cloud Endpoint**: `/rest/api/3/issue`  
**DC Endpoint**: `/rest/api/2/issue` ✅ **Version change + Wiki Markup support**  
**Acceptance Criteria**:
- [ ] Support Wiki Markup trong description
- [ ] Handle user assignment với dual resolution
- [ ] Validate required fields cho DC
- [ ] Rich error messaging cho validation failures

```typescript
// Enhanced createIssue with Wiki Markup support
const createIssueTool = {
  name: 'createIssue',
  description: 'Create a new Jira issue with Wiki Markup support',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key' },
      summary: { type: 'string', description: 'Issue summary' },
      description: { 
        type: 'string', 
        description: 'Issue description (supports Wiki Markup)' 
      },
      issueType: { type: 'string', description: 'Issue type name or ID' },
      assignee: { 
        type: 'string', 
        description: 'Assignee (accountId or username)' 
      },
      priority: { type: 'string', description: 'Priority name or ID' },
      labels: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Issue labels' 
      }
    },
    required: ['projectKey', 'summary', 'issueType']
  },
  
  implementation: async (params, context) => {
    const contentConverter = new ContentFormatConverter();
    const userResolver = new UserResolver(dcApiClient);
    
    // Convert description to Wiki Markup if needed
    const description = contentConverter.ensureWikiMarkup(params.description);
    
    // Resolve assignee to appropriate DC format
    const assignee = params.assignee 
      ? await userResolver.getAssignableIdentifier(params.assignee)
      : null;
    
    const issueData = {
      fields: {
        project: { key: params.projectKey },
        summary: params.summary,
        description: description,
        issuetype: { name: params.issueType },
        assignee: assignee ? { name: assignee } : null,
        priority: params.priority ? { name: params.priority } : null,
        labels: params.labels || []
      }
    };
    
    const issue = await dcApiClient.post('/rest/api/2/issue', issueData);
    
    return {
      content: [
        { type: 'text', text: `Created issue: ${issue.key}` },
        { type: 'json', data: issue }
      ]
    };
  }
};
```

#### Story 3.2: updateIssue Tool
**Estimate**: 7 hours  
**Priority**: P0 - CRITICAL  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}` ✅ **Version change + Wiki Markup**

#### Story 3.3: deleteIssue Tool
**Estimate**: 3 hours  
**Priority**: P1 - HIGH  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}` ✅ **Version change only**

#### Story 3.4: assignIssue Tool
**Estimate**: 5 hours  
**Priority**: P0 - CRITICAL  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/assignee` ✅ **Version change + User resolution**

#### Story 3.5: transitionIssue Tool
**Estimate**: 6 hours  
**Priority**: P0 - CRITICAL  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/transitions` ✅ **Version change only**

#### Story 3.6: getIssueTransitions Tool
**Estimate**: 3 hours  
**Priority**: P1 - HIGH  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/transitions` ✅ **Version change only**

### Epic 4: Comment Management (2 tools)

#### Story 4.1: addIssueComment Tool
**Estimate**: 6 hours  
**Priority**: P0 - CRITICAL  
**Cloud Endpoint**: `/rest/api/3/issue/{issueKey}/comment`  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/comment` ✅ **Version + Wiki Markup native**  
**Acceptance Criteria**:
- [ ] Native Wiki Markup support (primary advantage over Cloud)
- [ ] User mention resolution trong comments
- [ ] Rich formatting preserved
- [ ] Comment visibility restrictions support

```typescript
// Enhanced addIssueComment with native Wiki Markup
const addIssueCommentTool = {
  name: 'addIssueComment',
  description: 'Add comment to issue with native Wiki Markup support',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' },
      body: { 
        type: 'string', 
        description: 'Comment body (Wiki Markup format)' 
      },
      visibility: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['group', 'role'] },
          value: { type: 'string', description: 'Group name or role name' }
        },
        description: 'Comment visibility restrictions'
      }
    },
    required: ['issueIdOrKey', 'body']
  },
  
  implementation: async (params, context) => {
    const userResolver = new UserResolver(dcApiClient);
    
    // Process user mentions trong Wiki Markup
    const processedBody = await userResolver.processUserMentions(params.body);
    
    const commentData = {
      body: processedBody,
      visibility: params.visibility
    };
    
    const comment = await dcApiClient.post(
      `/rest/api/2/issue/${params.issueIdOrKey}/comment`, 
      commentData
    );
    
    return {
      content: [
        { type: 'text', text: `Added comment to ${params.issueIdOrKey}` },
        { type: 'json', data: comment }
      ]
    };
  }
};
```

#### Story 4.2: getIssueComments Tool
**Estimate**: 4 hours  
**Priority**: P1 - HIGH  
**DC Endpoint**: `/rest/api/2/issue/{issueKey}/comment` ✅ **Version change only**

### Epic 5: Version Management (1 tool)

#### Story 5.1: listProjectVersions Tool
**Estimate**: 4 hours  
**Priority**: P1 - HIGH  
**Cloud Endpoint**: `/rest/api/3/project/{projectKey}/version`  
**DC Endpoint**: `/rest/api/2/project/{projectKey}/versions` ✅ **Endpoint path changed**

---

## 🔧 Implementation Strategy

### Wiki Markup Integration
```typescript
class ContentFormatHandler {
  // Ensure content is in Wiki Markup format
  ensureWikiMarkup(content: string): string {
    if (this.isADFFormat(content)) {
      return this.adfToWikiMarkup(content);
    }
    if (this.isPlainText(content)) {
      return content; // Plain text works in Wiki Markup
    }
    return content; // Assume already Wiki Markup
  }
  
  // Process user mentions trong Wiki Markup
  async processUserMentions(content: string, userResolver: UserResolver): Promise<string> {
    const mentionPattern = /\[~([^\]]+)\]/g;
    
    return content.replace(mentionPattern, async (match, identifier) => {
      try {
        const user = await userResolver.resolveUser(identifier);
        return `[~${user.name || user.accountId}]`;
      } catch (error) {
        return match; // Keep original if resolution fails
      }
    });
  }
}
```

### User Resolution Strategy
```typescript
class EnhancedUserResolver {
  async resolveUser(identifier: string): Promise<User> {
    // Try multiple resolution strategies
    const strategies = [
      () => this.findByAccountId(identifier),
      () => this.findByUsername(identifier),
      () => this.findByEmail(identifier),
      () => this.findByDisplayName(identifier)
    ];
    
    for (const strategy of strategies) {
      try {
        const user = await strategy();
        if (user) {
          this.cacheUser(user);
          return user;
        }
      } catch (error) {
        // Continue to next strategy
      }
    }
    
    throw new Error(`User not found: ${identifier}`);
  }
  
  async getAssignableIdentifier(userIdentifier: string): Promise<string> {
    const user = await this.resolveUser(userIdentifier);
    // DC prefers username for assignments
    return user.name || user.accountId;
  }
}
```

---

## 🧪 Testing Strategy

### Unit Testing
```typescript
describe('Core Module - DC Migration', () => {
  describe('User Management', () => {
    - [ ] 'getUser should resolve both accountId and username'
    - [ ] 'listUsers should adapt endpoint correctly'
    - [ ] 'should handle user resolution fallbacks'
    - [ ] 'should cache user resolutions'
  });

  describe('Issue Management', () => {
    - [ ] 'createIssue should support Wiki Markup descriptions'
    - [ ] 'updateIssue should preserve Wiki Markup formatting'
    - [ ] 'assignIssue should resolve users correctly'
    - [ ] 'should validate required fields cho DC'
  });

  describe('Content Format', () => {
    - [ ] 'should convert ADF to Wiki Markup'
    - [ ] 'should preserve Wiki Markup natively'
    - [ ] 'should handle user mentions correctly'
    - [ ] 'should gracefully handle conversion errors'
  });
});
```

### Integration Testing
```typescript
describe('Core DC Integration', () => {
  describe('Full CRUD Lifecycle', () => {
    - [ ] 'should create issue with Wiki Markup description'
    - [ ] 'should assign users using various identifier types'
    - [ ] 'should add comments with rich formatting'
    - [ ] 'should transition issues through workflow'
    - [ ] 'should maintain data integrity throughout'
  });

  describe('User Resolution', () => {
    - [ ] 'should resolve users in real DC environment'
    - [ ] 'should handle LDAP/AD integrated users'
    - [ ] 'should work with mixed identifier scenarios'
  });
});
```

---

## 📊 Performance Targets

### Core Module Performance
- **User Operations**: <200ms với caching
- **Issue CRUD**: <500ms average
- **Content Conversion**: <100ms cho typical content
- **User Resolution**: <150ms với caching strategy

### Optimization Strategy
```typescript
interface CoreModuleCache {
  userResolution: 300000,    // 5 minutes
  projectInfo: 600000,       // 10 minutes
  issueTransitions: 120000,  // 2 minutes
  projectVersions: 1800000   // 30 minutes
}
```

---

## 🎯 Definition of Done

### Functionality
- [ ] All 14 Core tools implemented và working với DC
- [ ] Wiki Markup support fully functional
- [ ] User resolution working cho all identifier types
- [ ] API endpoint mapping complete và tested
- [ ] Error handling comprehensive

### Quality  
- [ ] >90% test coverage across Core module
- [ ] Integration tests passing với real DC instance
- [ ] Performance targets achieved
- [ ] Content format conversion validated
- [ ] User resolution scenarios covered

### Documentation
- [ ] Core module API reference
- [ ] Wiki Markup conversion guide
- [ ] User resolution strategy documentation
- [ ] Troubleshooting guide cho common issues

---

## 🚨 Risk Assessment - MODERATE RISK

### Key Risk Areas
1. **User Resolution Complexity**: AccountId vs Username mapping edge cases
   - **Mitigation**: Comprehensive fallback strategies và caching
   - **Impact**: Medium - affects assignment và mention functionality

2. **Content Format Edge Cases**: Complex ADF structures might not convert perfectly
   - **Mitigation**: Graceful degradation với plain text fallback
   - **Impact**: Low - content still readable, just less formatted

3. **API Version Differences**: Some DC versions might have endpoint variations
   - **Mitigation**: Version detection và capability-based routing
   - **Impact**: Medium - might require version-specific implementations

### Mitigation Strategies
- **User Resolution Failures**: Clear error messages với manual identifier options
- **Content Conversion Issues**: Always preserve original content với conversion warning
- **API Compatibility**: Comprehensive version testing và documentation

---

## 📈 Sprint Success Metrics

### Technical Metrics
- **Tool Implementation**: 14/14 Core tools completed
- **Content Format**: >95% successful Wiki Markup conversions
- **User Resolution**: >99% success rate với caching
- **API Mapping**: 100% endpoint compatibility achieved

### Quality Metrics
- **Test Coverage**: >90% across Core module components
- **Error Handling**: Clear guidance cho >95% of error scenarios
- **Performance**: Meet all performance targets
- **Documentation**: Complete user và developer guides

### Business Value
- **Essential Operations**: Core CRUD functionality available
- **Content Advantage**: Better formatting support than Cloud ADF
- **User Experience**: Smooth identifier resolution
- **Migration Foundation**: Proves API adaptation strategy

---

_Sprint 1.4 Core Module - Created August 14, 2025_  
_Risk Level: MODERATE (API changes + Content format + User resolution)_  
_Dependencies: Sprint 1.3 Agile Module ✅_  
_Next Sprint: 1.5 Search Module & Final Production_  
_Status: Ready for Implementation_