# Jira Data Center MCP Server - API Endpoint Validation Guide

**Mục đích:** Kiểm tra tính chính xác của endpoint và parameter format để đảm bảo tương thích với Jira Data Center API

**Test Environment:** Production Jira Data Center  
**API Version:** REST API v2/latest + Agile API v1.0  
**Authentication:** Personal Access Token (PAT)

---

## 🔍 VALIDATION CHECKLIST

### Authentication Headers
```http
Authorization: Bearer <PAT_TOKEN>
Content-Type: application/json
Accept: application/json
```

### Base URLs
```
Core/Search APIs: https://<jira-dc-domain>/rest/api/2/
Agile APIs: https://<jira-dc-domain>/rest/agile/1.0/
```

---

## 📋 ALL TOOLS ENDPOINT VALIDATION

## MODULE 1: CORE (14 tools)

### 👥 USER MANAGEMENT TOOLS

#### 1. `getUser` - ✅ FIXED
**Endpoint:** `GET /rest/api/2/user`
```http
GET /rest/api/2/user?username={username}
GET /rest/api/2/user?key={userKey}
```
**❌ KHÔNG SỬ DỤNG:** `?accountId={accountId}` (Cloud format)  
**✅ DC FORMAT:** `?username={username}`  
**Test Case:** `GET /rest/api/2/user?username=test.user`

#### 2. `listUsers` - ✅ FIXED
**Endpoint:** `GET /rest/api/2/user/search`
```http
GET /rest/api/2/user/search?username={query}&maxResults=50
GET /rest/api/2/user/search?username=.&maxResults=50  # Wildcard for all
```
**❌ Cloud:** `/rest/api/3/users/search`  
**✅ DC:** `/rest/api/2/user/search`

#### 3. `getAssignableUsers` - ✅ FIXED  
**Endpoint:** `GET /rest/api/2/user/assignable/search`
```http
GET /rest/api/2/user/assignable/search?project={projectKey}&username={query}
GET /rest/api/2/user/assignable/multiProjectSearch?projectKeys={projectKey}
```
**❌ KHÔNG SỬ DỤNG:** `?issueKey={issueKey}` directly  
**✅ DC FORMAT:** Extract project from issueKey: `PROJ-123` → `project=PROJ`

### 🏗️ PROJECT MANAGEMENT TOOLS

#### 4. `getProject`
**Endpoint:** `GET /rest/api/2/project/{projectKey}`
```http
GET /rest/api/2/project/TESTPROJ?expand=description,lead,issueTypes
```
**Status:** Should work (version change only)

#### 5. `listProjects`  
**Endpoint:** `GET /rest/api/2/project`
```http
GET /rest/api/2/project?expand=description,lead&maxResults=50
GET /rest/api/2/project?action=view&typeKey=software
```
**Status:** Should work (version change only)

#### 6. `listProjectVersions`
**Endpoint:** `GET /rest/api/2/project/{projectKey}/versions`
```http
GET /rest/api/2/project/TESTPROJ/versions?orderBy=name&status=unreleased
```
**Status:** Should work (endpoint changed from Cloud)

### 📝 ISSUE CRUD OPERATIONS

#### 7. `createIssue`
**Endpoint:** `POST /rest/api/2/issue`
```json
{
  "fields": {
    "project": { "key": "TESTPROJ" },
    "summary": "Test issue",
    "issuetype": { "id": "10001" },
    "assignee": { "name": "username" },
    "description": "Plain text or Wiki Markup"
  }
}
```
**Status:** Should work (Wiki Markup native in DC)

#### 8. `updateIssue` - ✅ FIXED
**Endpoint:** `PUT /rest/api/2/issue/{issueKey}`
```json
{
  "fields": {
    "summary": "Updated summary",
    "description": "Updated description"
  }
}
```
**✅ DC FORMAT:** Simplified fields object (no complex processing)

#### 9. `deleteIssue` - ✅ FIXED
**Endpoint:** `DELETE /rest/api/2/issue/{issueKey}`
```http
DELETE /rest/api/2/issue/PROJ-123?deleteSubtasks=true
```
**⚠️ PERMISSION:** Requires "Delete Issues" permission (Admin-level)

#### 10. `assignIssue` - ✅ FIXED
**Endpoint:** `PUT /rest/api/2/issue/{issueKey}/assignee`
```json
{
  "name": "username"
}
```
**❌ KHÔNG SỬ DỤNG:** `{ "accountId": "..." }` (Cloud format)  
**✅ DC FORMAT:** `{ "name": "username" }`

#### 11. `addIssueComment`
**Endpoint:** `POST /rest/api/2/issue/{issueKey}/comment`
```json
{
  "body": "Comment text",
  "visibility": {
    "type": "role",
    "value": "Administrators"
  }
}
```
**Status:** Should work (Wiki Markup native in DC)

#### 12. `getIssueComments`
**Endpoint:** `GET /rest/api/2/issue/{issueKey}/comment`
```http
GET /rest/api/2/issue/PROJ-123/comment?maxResults=50&orderBy=created
```
**Status:** Should work (version change only)

### 🔄 ISSUE LIFECYCLE TOOLS

#### 13. `getIssueTransitions`
**Endpoint:** `GET /rest/api/2/issue/{issueKey}/transitions`
```http
GET /rest/api/2/issue/PROJ-123/transitions?expand=transitions.fields
```
**Status:** Should work (version change only)

#### 14. `transitionIssue` - ✅ FIXED
**Endpoint:** `POST /rest/api/2/issue/{issueKey}/transitions`
```json
{
  "transition": {
    "id": "21"
  },
  "fields": {
    "resolution": {
      "name": "Fixed"
    }
  }
}
```
**✅ DC FORMAT:** Transition ID as string, not number

---

## MODULE 2: AGILE (10 tools)

### 🏢 BOARD MANAGEMENT

#### 15. `listBoards`
**Endpoint:** `GET /rest/agile/1.0/board`
```http
GET /rest/agile/1.0/board?type=scrum&projectKeyOrId=TESTPROJ
```
**Status:** Should work (no changes)

#### 16. `getBoard`
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}`
```http
GET /rest/agile/1.0/board/123
```
**Status:** Should work (no changes)

#### 17. `getBoardConfiguration`
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/configuration`
```http
GET /rest/agile/1.0/board/123/configuration
```
**Status:** Should work (no changes)

#### 18. `listBacklogIssues`
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/backlog`
```http
GET /rest/agile/1.0/board/123/backlog?jql=project=TESTPROJ&maxResults=50
```
**Status:** Should work (no changes)

### 🏃‍♂️ SPRINT MANAGEMENT

#### 19. `listSprints`
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/sprint`
```http
GET /rest/agile/1.0/board/123/sprint?state=active&maxResults=50
```
**Status:** Should work (no changes)

#### 20. `getSprint`
**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}`
```http
GET /rest/agile/1.0/sprint/456
```
**Status:** Should work (no changes)

#### 21. `getSprintIssues`
**Endpoint:** `GET /rest/agile/1.0/sprint/{sprintId}/issue`
```http
GET /rest/agile/1.0/sprint/456/issue?jql=project=TESTPROJ&maxResults=50
```
**Status:** Should work (no changes)

#### 22. `createSprint`
**Endpoint:** `POST /rest/agile/1.0/sprint`
```json
{
  "name": "Test Sprint",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-14T23:59:59.999Z",
  "originBoardId": 123
}
```
**Status:** Should work (no changes)

#### 23. `startSprint`
**Endpoint:** `POST /rest/agile/1.0/sprint/{sprintId}`
```json
{
  "state": "active"
}
```
**Status:** Should work (no changes)

#### 24. `closeSprint`
**Endpoint:** `POST /rest/agile/1.0/sprint/{sprintId}`
```json
{
  "state": "closed"
}
```
**Status:** Should work (no changes)

---

## MODULE 3: SEARCH (14 tools)

### 🔍 ENHANCED SEARCH TOOLS

#### 25. `enhancedSearchIssues` - ✅ OPTIMIZED
**Endpoint:** `GET /rest/api/2/search`
```http
GET /rest/api/2/search?jql=project=TESTPROJ&maxResults=20&fields=summary,status,assignee
```
**✅ DC OPTIMIZATIONS:**
- maxResults ≤ 20 (reduced from 50)
- fields: essential only
- expand: minimal (no changelog, worklog, attachment)

#### 26. `enhancedGetIssue` - ✅ OPTIMIZED
**Endpoint:** `GET /rest/api/2/issue/{issueKey}`
```http
GET /rest/api/2/issue/PROJ-123?fields=summary,status,assignee,created,description
```
**✅ DC OPTIMIZATIONS:**
- fields: essential only
- expand: single option max
- timeout: reduced to 10s

### 🎯 EPIC SEARCH

#### 27. `epicSearchAgile`
**Endpoint:** `GET /rest/agile/1.0/board/{boardId}/epic`
```http
GET /rest/agile/1.0/board/123/epic?query=epic&maxResults=50
```
**Status:** Should work (better DC support)

### 👥 UNIVERSAL USER SEARCH

#### 28. `universalSearchUsers` - ✅ FIXED
**Endpoint:** `GET /rest/api/2/user/search`
```http
GET /rest/api/2/user/search?username=.&maxResults=50  # All users
GET /rest/api/2/user/search?username=test&maxResults=50  # Specific query
```
**✅ DC FORMAT:** Use wildcard "." for all users

### 📋 CONSOLIDATED TOOLS

#### 29. `listUsers` (Search Module)
**Same as Core Module #2**

#### 30. `getUser` (Search Module)  
**Same as Core Module #1**

#### 31. `listProjects` (Search Module)
**Same as Core Module #5**

#### 32. `listProjectVersions` (Search Module)
**Same as Core Module #6**

#### 33. `listFilters` - ✅ FIXED
**Endpoint:** `GET /rest/api/2/filter`
```http
GET /rest/api/2/filter?expand=description,owner
GET /rest/api/2/filter/favourite  # Favourite filters
```
**❌ Cloud:** `/rest/api/2/filter/search`  
**✅ DC:** `/rest/api/2/filter` (no /search suffix)

#### 34. `getFilter`
**Endpoint:** `GET /rest/api/2/filter/{filterId}`
```http
GET /rest/api/2/filter/10001?expand=description,owner,viewUrl
```
**Status:** Should work (version change only)

#### 35. `listBoards` (Search Module)
**Same as Agile Module #15**

#### 36. `listSprints` (Search Module)
**Same as Agile Module #19**

#### 37. `listBacklogIssues` (Search Module)
**Same as Agile Module #18**

#### 38. `multiEntitySearch` (Advanced)
**Multiple endpoints used in parallel**
**Status:** Should work (combination of working endpoints)

---

## ⚠️ VALIDATION PRIORITY

### 🔥 HIGH PRIORITY (Previously Failed)
1. **getUser** - Verify username parameter works
2. **getAssignableUsers** - Verify project parameter extraction
3. **assignIssue** - Verify name field acceptance  
4. **universalSearchUsers** - Verify wildcard query
5. **updateIssue** - Verify simplified fields format
6. **deleteIssue** - Verify admin permissions required
7. **transitionIssue** - Verify string transition ID
8. **listFilters** - Verify no /search suffix needed
9. **enhancedSearchIssues** - Verify performance optimizations
10. **enhancedGetIssue** - Verify reduced expand parameters

### ✅ LOW PRIORITY (Should Work)
- All Agile module tools (no API changes)
- Project management tools (version changes only)
- Comment operations (native Wiki Markup support)
- Transition queries (version changes only)

---

## 🧪 TESTING COMMANDS

### Test Individual Endpoints
```bash
# Test getUser with username
curl -H "Authorization: Bearer <PAT>" \
  "https://<domain>/rest/api/2/user?username=test.user"

# Test listFilters without /search
curl -H "Authorization: Bearer <PAT>" \
  "https://<domain>/rest/api/2/filter"

# Test assignIssue with name field
curl -X PUT -H "Authorization: Bearer <PAT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test.user"}' \
  "https://<domain>/rest/api/2/issue/PROJ-123/assignee"
```

### Test Performance Optimizations
```bash
# Test enhanced search with reduced parameters
curl -H "Authorization: Bearer <PAT>" \
  "https://<domain>/rest/api/2/search?jql=project=TESTPROJ&maxResults=10&fields=summary,status"
```

---

## 📊 VALIDATION RESULTS TEMPLATE

```
✅ PASS: Endpoint works as expected
❌ FAIL: Endpoint returns error
⚠️  WARNING: Endpoint works but with issues
🔄 RETRY: Needs permission/configuration change

Tool: <tool_name>
Endpoint: <endpoint_url>
Status: <status_code>  
Response: <success/error_message>
Notes: <additional_observations>
```

---

**Recommended Validation Order:**
1. Test 10 previously failed tools first
2. Test sample from each module (Core, Agile, Search)
3. Validate authentication and permissions
4. Test performance optimizations
5. Full integration test with all 38 tools
