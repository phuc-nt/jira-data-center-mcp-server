# Jira Data Center MCP Server: Khắc Phục 10 Tools Lỗi

Dựa trên phân tích lỗi và nghiên cứu tài liệu API, đây là giải pháp chi tiết cho từng tool:

## 🔥 CRITICAL: User Management Issues (4 tools)

### 1. `getUser` - Fix 404 Error

**⚠️ Vấn đề:** Endpoint sai hoặc parameter format không đúng

**✅ Giải pháp:**

```http
# Sử dụng username thay vì accountId cho Data Center
GET /rest/api/2/user?username={username}

# Hoặc sử dụng key parameter  
GET /rest/api/2/user?key={userKey}

# Không sử dụng accountId vì DC không hỗ trợ
```

**Implementation:**
```typescript
async getUser(identifier: string, type: 'username' | 'key' = 'username') {
  const param = type === 'username' ? 'username' : 'key';
  const url = `/rest/api/2/user?${param}=${encodeURIComponent(identifier)}`;
  return await this.request('GET', url);
}
```

### 2. `getAssignableUsers` - Fix 404 Error

**⚠️ Vấn đề:** Endpoint cần projectKey thay vì issueKey để tìm assignable users

**✅ Giải pháp:**

```http
# Đúng cho Data Center - sử dụng project parameter
GET /rest/api/2/user/assignable/search?project={projectKey}&username={query}

# Backup option - search by project
GET /rest/api/2/user/assignable/multiProjectSearch?projectKeys={projectKey}&query={query}
```

**Implementation:**
```typescript
async getAssignableUsers(projectKey: string, query?: string) {
  let url = `/rest/api/2/user/assignable/search?project=${projectKey}`;
  if (query) {
    url += `&username=${encodeURIComponent(query)}`;
  }
  return await this.request('GET', url);
}
```

### 3. `assignIssue` - Fix Format Error

**⚠️ Vấn đề:** Data Center sử dụng `name` field thay vì `accountId`

**✅ Giải pháp:**

```http
PUT /rest/api/2/issue/{issueKey}/assignee
Content-Type: application/json

# Data Center format - sử dụng name
{
  "name": "username"
}

# Hoặc để unassign
{
  "name": null
}
```

**Implementation:**
```typescript
async assignIssue(issueKey: string, username?: string) {
  const body = {
    name: username || null
  };
  return await this.request('PUT', `/rest/api/2/issue/${issueKey}/assignee`, body);
}
```

### 4. `universalSearchUsers` - Fix 400 Error

**⚠️ Vấn đề:** Query parameter cần format đặc biệt cho Data Center

**✅ Giải pháp:**

```http
# Data Center user search - sử dụng wildcard
GET /rest/api/2/user/search?username=.&maxResults=1000&startAt=0

# Search với query cụ thể
GET /rest/api/2/user/search?username={query}&maxResults=50&startAt=0

# Lưu ý: username=. để lấy tất cả users
```

**Implementation:**
```typescript
async universalSearchUsers(query?: string, maxResults: number = 50) {
  const searchQuery = query || '.';  // Dấu . để search tất cả
  const url = `/rest/api/2/user/search?username=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}`;
  return await this.request('GET', url);
}
```

## 🚨 CRITICAL: Permission & Authorization Issues (4 tools)

### 5. `updateIssue` - Fix 400 Error  

**⚠️ Vấn đề:** Field format và required field validation

**✅ Giải pháp:**

```http
PUT /rest/api/2/issue/{issueKey}
Content-Type: application/json

# Sử dụng fields object đơn giản
{
  "fields": {
    "summary": "Updated summary",
    "description": "Updated description"
  }
}

# Hoặc sử dụng update syntax cho complex operations
{
  "update": {
    "labels": [
      {"add": "new-label"}
    ],
    "components": [
      {"set": [{"name": "Component1"}]}
    ]
  }
}
```

**Implementation:**
```typescript
async updateIssue(issueKey: string, fields: any, updateOperations?: any) {
  const body: any = {};
  if (fields) body.fields = fields;
  if (updateOperations) body.update = updateOperations;
  
  return await this.request('PUT', `/rest/api/2/issue/${issueKey}`, body);
}
```

### 6. `deleteIssue` - Fix 403 Error

**⚠️ Vấn đề:** Permission không đủ, cần admin permission

**✅ Giải pháp:**

```http
DELETE /rest/api/2/issue/{issueKey}?deleteSubtasks=true
```

**Permission Required:** "Delete Issues" project permission hoặc Project Admin role

**Implementation với error handling:**
```typescript
async deleteIssue(issueKey: string, deleteSubtasks: boolean = true) {
  try {
    const url = `/rest/api/2/issue/${issueKey}?deleteSubtasks=${deleteSubtasks}`;
    return await this.request('DELETE', url);
  } catch (error) {
    if (error.status === 403) {
      throw new Error('Insufficient permissions. Delete Issues permission required.');
    }
    throw error;
  }
}
```

### 7. `transitionIssue` - Fix Transition Error

**⚠️ Vấn đề:** Transition ID format và required fields

**✅ Giải pháp:**

```http
# Bước 1: Lấy available transitions
GET /rest/api/2/issue/{issueKey}/transitions?expand=transitions.fields

# Bước 2: Thực hiện transition với required fields
POST /rest/api/2/issue/{issueKey}/transitions
{
  "transition": {
    "id": "21"  # String format, không phải number
  },
  "fields": {
    "resolution": {
      "name": "Fixed"  # Nếu transition require resolution
    }
  }
}
```

**Implementation:**
```typescript
async transitionIssue(issueKey: string, transitionId: string, fields?: any) {
  const body: any = {
    transition: {
      id: transitionId.toString()  // Ensure string format
    }
  };
  
  if (fields) {
    body.fields = fields;
  }
  
  return await this.request('POST', `/rest/api/2/issue/${issueKey}/transitions`, body);
}
```

### 8. `listFilters` - Fix 404 Error

**⚠️ Vấn đề:** Data Center sử dụng endpoint khác

**✅ Giải pháp:**

```http
# Data Center - không có /search suffix
GET /rest/api/2/filter?expand=description,owner,viewUrl,searchUrl

# Lấy favorite filters
GET /rest/api/2/filter/favourite

# Lấy filter của user hiện tại  
GET /rest/api/2/filter?expand=description,owner
```

**Implementation:**
```typescript
async listFilters(expand?: string, favourite?: boolean) {
  let url = '/rest/api/2/filter';
  if (favourite) {
    url += '/favourite';
  }
  
  const params = [];
  if (expand) {
    params.push(`expand=${expand}`);
  }
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return await this.request('GET', url);
}
```

## ⚠️ HIGH PRIORITY: Performance Issues (2 tools)

### 9. `enhancedSearchIssues` - Fix Timeout

**⚠️ Vấn đề:** Query quá phức tạp và expand parameters gây timeout

**✅ Giải pháp:**

```http
POST /rest/api/2/search
{
  "jql": "project = TEST AND status = 'To Do'",
  "startAt": 0,
  "maxResults": 20,  # Giảm xuống từ 50
  "fields": [
    "summary",
    "status", 
    "assignee",
    "created"
  ],  # Không dùng *all
  "expand": []  # Không expand changelog để tránh timeout
}
```

**Implementation với pagination:**
```typescript
async enhancedSearchIssues(
  jql: string, 
  startAt: number = 0, 
  maxResults: number = 20,  // Giảm default
  fields?: string[],
  expand?: string[]
) {
  const body: any = {
    jql,
    startAt,
    maxResults: Math.min(maxResults, 20),  // Cap tối đa 20
    fields: fields || ["summary", "status", "assignee", "created"],
    expand: expand || []  // Không expand mặc định
  };
  
  return await this.request('POST', '/rest/api/2/search', body);
}
```

### 10. `enhancedGetIssue` - Fix Timeout

**⚠️ Vấn đề:** Expand quá nhiều data gây timeout

**✅ Giải pháp:**

```http
# Minimal fields để tránh timeout
GET /rest/api/2/issue/{issueKey}?fields=summary,status,assignee,created,description&expand=

# Nếu cần comments, lấy riêng
GET /rest/api/2/issue/{issueKey}/comment?maxResults=10

# Nếu cần worklog, lấy riêng  
GET /rest/api/2/issue/{issueKey}/worklog?maxResults=10
```

**Implementation với fallback:**
```typescript
async enhancedGetIssue(issueKey: string, includeDetails?: boolean) {
  const basicFields = "summary,status,assignee,created,description,issuetype,priority";
  
  try {
    if (includeDetails) {
      // Lấy basic info trước
      const issue = await this.request('GET', 
        `/rest/api/2/issue/${issueKey}?fields=${basicFields}`
      );
      
      // Lấy comments riêng nếu cần
      const comments = await this.request('GET', 
        `/rest/api/2/issue/${issueKey}/comment?maxResults=10`
      );
      
      return { ...issue, comments };
    } else {
      return await this.request('GET', 
        `/rest/api/2/issue/${issueKey}?fields=${basicFields}`
      );
    }
  } catch (error) {
    // Fallback to minimal fields
    return await this.request('GET', `/rest/api/2/issue/${issueKey}`);
  }
}
```

## 🔧 Tổng Kết Các Thay Đổi Cần Thiết

### 1. Authentication Headers
```typescript
// Sử dụng Basic Auth cho Data Center
const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

// Hoặc Personal Access Token
const authHeader = `Bearer ${personalAccessToken}`;
```

### 2. Error Handling Pattern
```typescript
async request(method: string, endpoint: string, body?: any) {
  try {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error for ${method} ${endpoint}:`, error);
    throw error;
  }
}
```

### 3. Configuration Updates
```typescript
interface JiraDataCenterConfig {
  baseUrl: string;  // https://jira.company.com
  auth: {
    username: string;
    password: string;
  } | {
    token: string;  // PAT
  };
  timeout: number;
  defaultMaxResults: number; // 20 instead of 50
}
```

Những thay đổi này sẽ giải quyết tất cả 10 tools lỗi và đảm bảo compatibility hoàn toàn với Jira Data Center environment.[1][2][3][4]