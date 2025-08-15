/**
 * Type definitions for Agile Module
 * Based on Jira Agile API v1.0 - unchanged between Cloud and Data Center
 */

/**
 * Board types and interfaces
 */
export interface Board {
  id: number;
  self: string;
  name: string;
  type: 'scrum' | 'kanban';
  admins?: {
    users?: User[];
    groups?: Group[];
  };
  location?: {
    type: string;
    key: string;
    id: string;
    self: string;
    name: string;
  };
  canEdit?: boolean;
  isPrivate?: boolean;
  favourite?: boolean;
}

/**
 * Board configuration
 */
export interface BoardConfiguration {
  id: number;
  name: string;
  type: string;
  self: string;
  location: {
    type: string;
    key: string;
    id: string;
    self: string;
    name: string;
  };
  filter: {
    id: string;
    self: string;
  };
  subQuery?: {
    query: string;
  };
  columnConfig: {
    columns: BoardColumn[];
    constraintType?: string;
  };
  estimation?: {
    type: string;
    field: {
      fieldId: string;
      displayName: string;
    };
  };
  ranking?: {
    rankCustomFieldId: number;
  };
}

export interface BoardColumn {
  name: string;
  statuses: Status[];
  min?: number;
  max?: number;
}

/**
 * Sprint types and interfaces
 */
export interface Sprint {
  id: number;
  self: string;
  state: 'future' | 'active' | 'closed';
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  createdDate?: string;
  originBoardId?: number;
  goal?: string;
}

/**
 * Issue types (simplified for agile context)
 */
export interface Issue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: Status;
    assignee?: User;
    reporter?: User;
    priority?: Priority;
    issuetype: IssueType;
    project: Project;
    created: string;
    updated: string;
    description?: string;
    labels?: string[];
    components?: Component[];
    fixVersions?: Version[];
    sprint?: Sprint[];
    epic?: {
      id: number;
      key: string;
      self: string;
      name: string;
      summary: string;
      color: {
        key: string;
      };
      done: boolean;
    };
    storyPoints?: number;
    timeestimate?: number;
    timeoriginalestimate?: number;
    timespent?: number;
    aggregatetimeestimate?: number;
    aggregatetimeoriginalestimate?: number;
    aggregatetimespent?: number;
    [key: string]: unknown; // Allow custom fields
  };
}

/**
 * Common Jira entities
 */
export interface User {
  accountId: string;
  emailAddress?: string;
  avatarUrls?: AvatarUrls;
  displayName: string;
  active: boolean;
  timeZone?: string;
  locale?: string;
  self?: string;
  name?: string; // For DC compatibility
}

export interface Group {
  name: string;
  self?: string;
}

export interface Status {
  id: string;
  name: string;
  self: string;
  description: string;
  iconUrl: string;
  statusCategory: {
    id: number;
    key: string;
    colorName: string;
    name: string;
    self: string;
  };
}

export interface Priority {
  id: string;
  name: string;
  self: string;
  iconUrl: string;
}

export interface IssueType {
  id: string;
  name: string;
  self: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
  avatarId?: number;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  self: string;
  projectTypeKey?: string;
  simplified?: boolean;
  avatarUrls?: AvatarUrls;
  projectCategory?: {
    id: string;
    name: string;
    description: string;
    self: string;
  };
}

export interface Component {
  id: string;
  name: string;
  self: string;
  description?: string;
  lead?: User;
  assigneeType?: string;
  assignee?: User;
  realAssigneeType?: string;
  realAssignee?: User;
  isAssigneeTypeValid?: boolean;
  project?: string;
  projectId?: number;
}

export interface Version {
  id: string;
  name: string;
  self: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  startDate?: string;
  releaseDate?: string;
  overdue?: boolean;
  userStartDate?: string;
  userReleaseDate?: string;
  project?: string;
  projectId?: number;
}

export interface AvatarUrls {
  '48x48'?: string;
  '24x24'?: string;
  '16x16'?: string;
  '32x32'?: string;
}

/**
 * Request/Response types for API operations
 */
export interface BoardListParams {
  projectKeyOrId?: string;
  type?: 'scrum' | 'kanban';
  name?: string;
  startAt?: number;
  maxResults?: number;
}

export interface BoardListResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Board[];
}

export interface SprintListParams {
  boardId: number;
  state?: 'future' | 'active' | 'closed';
  startAt?: number;
  maxResults?: number;
}

export interface SprintListResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Sprint[];
}

export interface IssueListParams {
  sprintId?: number;
  boardId?: number;
  jql?: string;
  validateQuery?: boolean;
  fields?: string[];
  expand?: string[];
  startAt?: number;
  maxResults?: number;
}

export interface IssueListResponse {
  maxResults: number;
  startAt: number;
  total: number;
  issues: Issue[];
  warningMessages?: string[];
}

export interface CreateSprintParams {
  name: string;
  goal?: string;
  boardId: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintParams {
  id: number;
  name?: string;
  goal?: string;
  state?: 'future' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

export interface BacklogConfig {
  issueIdOrKeys: string[];
  rankBeforeIssue?: string;
  rankAfterIssue?: string;
  rankCustomFieldId?: number;
}

/**
 * Error types specific to Agile operations
 */
export interface AgileError {
  errorMessages: string[];
  errors?: Record<string, string>;
  status?: number;
  agileErrorCode?: string;
}

/**
 * Epic-related types (for search module integration)
 */
export interface Epic {
  id: number;
  key: string;
  self: string;
  name: string;
  summary: string;
  color: {
    key: string;
  };
  done: boolean;
}

/**
 * Velocity and metrics types
 */
export interface Velocity {
  sprintId: number;
  commitment: number;
  completed: number;
}

/**
 * Board filter and estimation configuration
 */
export interface BoardFilter {
  id: string;
  self: string;
  name?: string;
  description?: string;
  jql?: string;
}

export interface EstimationConfig {
  type: 'issueCount' | 'field';
  field?: {
    fieldId: string;
    displayName: string;
  };
}

/**
 * Ranking configuration
 */
export interface RankingConfig {
  rankCustomFieldId: number;
}

/**
 * Utility types for API responses
 */
export type AgileAPIResponse<T> = {
  data: T;
  status: number;
  headers: Record<string, string>;
  warnings?: string[];
};

export type PaginatedResponse<T> = {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: T[];
};

/**
 * Search and filter types for agile operations
 */
export interface AgileSearchParams {
  boardId?: number;
  sprintId?: number;
  projectKey?: string;
  query?: string;
  fields?: string[];
  expand?: string[];
  startAt?: number;
  maxResults?: number;
  orderBy?: string;
}

/**
 * Webhook and event types (for future extensions)
 */
export interface AgileWebhookEvent {
  timestamp: number;
  webhookEvent: string;
  sprint?: Sprint;
  board?: Board;
  issue?: Issue;
}

/**
 * Performance metrics types
 */
export interface AgileMetrics {
  sprintId: number;
  startDate: string;
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  velocity: number;
  burndownData?: {
    date: string;
    remainingPoints: number;
  }[];
}