/**
 * Type definitions for Core Module
 * Based on Jira Data Center API v2/latest
 */

/**
 * User types and interfaces
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
  name?: string; // DC-specific field for username
  key?: string; // Legacy DC field
  groups?: {
    size: number;
    items: Group[];
  };
  applicationRoles?: {
    size: number;
    items: ApplicationRole[];
  };
}

export interface Group {
  name: string;
  self?: string;
  users?: {
    size: number;
    items: User[];
  };
}

export interface ApplicationRole {
  key: string;
  name: string;
  groups?: string[];
  defaultGroups?: string[];
  selectedByDefault?: boolean;
  defined?: boolean;
  numberOfSeats?: number;
  remainingSeats?: number;
  userCount?: number;
  userCountDescription?: string;
  hasUnlimitedSeats?: boolean;
  platform?: boolean;
}

/**
 * Project types and interfaces
 */
export interface Project {
  id: string;
  key: string;
  name: string;
  self: string;
  projectTypeKey?: string;
  simplified?: boolean;
  avatarUrls?: AvatarUrls;
  projectCategory?: ProjectCategory;
  description?: string;
  lead?: User;
  components?: Component[];
  issueTypes?: IssueType[];
  versions?: Version[];
  roles?: Record<string, string>;
  permissions?: ProjectPermissions;
  insight?: {
    totalIssueCount: number;
    lastIssueUpdateTime: string;
  };
  deleted?: boolean;
  retentionTillDate?: string;
  deletedDate?: string;
  deletedBy?: User;
  archived?: boolean;
  archivedDate?: string;
  archivedBy?: User;
}

export interface ProjectCategory {
  id: string;
  name: string;
  description: string;
  self: string;
}

export interface ProjectPermissions {
  canEdit: boolean;
}

/**
 * Issue types and interfaces
 */
export interface Issue {
  id: string;
  key: string;
  self: string;
  fields: IssueFields;
  expand?: string;
  changelog?: ChangeLog;
  editmeta?: EditMeta;
  versionedRepresentations?: Record<string, unknown>;
  fieldsToInclude?: IncludedFields;
}

export interface IssueFields {
  summary: string;
  status: Status;
  assignee?: User;
  reporter?: User;
  priority?: Priority;
  issuetype: IssueType;
  project: Project;
  created: string;
  updated: string;
  description?: string | ContentBlock; // Support both text and ADF
  labels?: string[];
  components?: Component[];
  fixVersions?: Version[];
  affectedVersions?: Version[];
  environment?: string | ContentBlock;
  duedate?: string;
  watches?: Watches;
  votes?: Votes;
  worklog?: Worklog;
  attachment?: Attachment[];
  subtasks?: Issue[];
  parent?: Issue;
  customfield_10000?: string; // Epic Name
  customfield_10001?: string; // Epic Link
  customfield_10002?: number; // Story Points
  [key: string]: unknown; // Allow custom fields
}

export interface ContentBlock {
  version: number;
  type: 'doc';
  content: ContentNode[];
}

export interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ContentMark[];
}

export interface ContentMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ChangeLog {
  startAt: number;
  maxResults: number;
  total: number;
  histories: ChangeHistory[];
}

export interface ChangeHistory {
  id: string;
  author: User;
  created: string;
  items: ChangeItem[];
}

export interface ChangeItem {
  field: string;
  fieldtype: string;
  fieldId?: string;
  from?: string;
  fromString?: string;
  to?: string;
  toString?: string;
}

export interface EditMeta {
  fields: Record<string, FieldMeta>;
}

export interface FieldMeta {
  required: boolean;
  schema: FieldSchema;
  name: string;
  key: string;
  hasDefaultValue?: boolean;
  operations: string[];
  allowedValues?: unknown[];
  autoCompleteUrl?: string;
  defaultValue?: unknown;
}

export interface FieldSchema {
  type: string;
  items?: string;
  system?: string;
  custom?: string;
  customId?: number;
}

export interface IncludedFields {
  included?: string[];
  excluded?: string[];
  actuallyIncluded?: string[];
}

/**
 * Status, Priority, IssueType, and Component interfaces
 */
export interface Status {
  id: string;
  name: string;
  self: string;
  description: string;
  iconUrl: string;
  statusCategory: StatusCategory;
}

export interface StatusCategory {
  id: number;
  key: string;
  colorName: string;
  name: string;
  self: string;
}

export interface Priority {
  id: string;
  name: string;
  self: string;
  iconUrl: string;
  description?: string;
}

export interface IssueType {
  id: string;
  name: string;
  self: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
  avatarId?: number;
  hierarchyLevel?: number;
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
  moveUnfixedIssuesTo?: string;
  operations?: VersionOperation[];
  issuesStatusForFixVersion?: IssuesStatusForFixVersion;
}

export interface VersionOperation {
  id: string;
  styleClass: string;
  iconClass: string;
  label: string;
  href: string;
  weight: number;
}

export interface IssuesStatusForFixVersion {
  unmapped: number;
  toDo: number;
  inProgress: number;
  done: number;
}

/**
 * Comment and Worklog interfaces
 */
export interface Comment {
  id: string;
  self: string;
  author: User;
  body: string | ContentBlock;
  updateAuthor?: User;
  created: string;
  updated: string;
  visibility?: Visibility;
  jsdPublic?: boolean;
  properties?: Record<string, unknown>;
}

export interface Worklog {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs: WorklogEntry[];
}

export interface WorklogEntry {
  id: string;
  self: string;
  author: User;
  updateAuthor?: User;
  comment?: string | ContentBlock;
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  visibility?: Visibility;
  properties?: Record<string, unknown>;
}

export interface Visibility {
  type: 'group' | 'role';
  value: string;
  identifier?: string;
}

/**
 * Transitions and workflow interfaces
 */
export interface Transition {
  id: string;
  name: string;
  to: Status;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isAvailable?: boolean;
  isConditional?: boolean;
  fields?: Record<string, FieldMeta>;
  expand?: string;
  looping?: boolean;
}

export interface TransitionsResponse {
  expand?: string;
  transitions: Transition[];
}

/**
 * Attachment and media interfaces
 */
export interface Attachment {
  id: string;
  self: string;
  filename: string;
  author: User;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

export interface Watches {
  self: string;
  watchCount: number;
  isWatching: boolean;
  watchers?: User[];
}

export interface Votes {
  self: string;
  votes: number;
  hasVoted: boolean;
  voters?: User[];
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
export interface UserListParams {
  query?: string;
  username?: string;
  accountId?: string;
  startAt?: number;
  maxResults?: number;
  includeActive?: boolean;
  includeInactive?: boolean;
}

export interface UserListResponse {
  self: string;
  nextPage?: string;
  maxResults: number;
  startAt: number;
  total?: number;
  isLast: boolean;
  values: User[];
}

export interface ProjectListParams {
  expand?: string[];
  recent?: number;
  properties?: string[];
  typeKey?: string;
  categoryId?: number;
  action?: 'view' | 'browse' | 'edit';
  startAt?: number;
  maxResults?: number;
}

export interface ProjectListResponse {
  self: string;
  nextPage?: string;
  maxResults: number;
  startAt: number;
  total?: number;
  isLast: boolean;
  values: Project[];
}

export interface CreateIssueParams {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: string | ContentBlock;
    issuetype: {
      id: string;
    };
    assignee?: {
      accountId?: string;
      name?: string; // DC fallback
    };
    priority?: {
      id: string;
    };
    labels?: string[];
    components?: Array<{ id: string }>;
    fixVersions?: Array<{ id: string }>;
    affectedVersions?: Array<{ id: string }>;
    customfield_10000?: string; // Epic Name
    customfield_10001?: string; // Epic Link
    customfield_10002?: number; // Story Points
    [key: string]: unknown; // Allow custom fields
  };
  update?: Record<string, FieldOperation[]>;
  historyMetadata?: HistoryMetadata;
  properties?: Array<{
    key: string;
    value: unknown;
  }>;
}

export interface UpdateIssueParams {
  fields?: {
    summary?: string;
    description?: string | ContentBlock;
    assignee?: {
      accountId?: string;
      name?: string; // DC fallback
    };
    priority?: {
      id: string;
    };
    labels?: string[];
    components?: Array<{ id: string }>;
    fixVersions?: Array<{ id: string }>;
    affectedVersions?: Array<{ id: string }>;
    [key: string]: unknown; // Allow custom fields
  };
  update?: Record<string, FieldOperation[]>;
  historyMetadata?: HistoryMetadata;
  properties?: Array<{
    key: string;
    value: unknown;
  }>;
}

export interface FieldOperation {
  add?: unknown;
  set?: unknown;
  remove?: unknown;
  edit?: unknown;
}

export interface HistoryMetadata {
  type?: string;
  description?: string;
  descriptionKey?: string;
  activityDescription?: string;
  activityDescriptionKey?: string;
  emailDescription?: string;
  emailDescriptionKey?: string;
  actor?: HistoryMetadataParticipant;
  generator?: HistoryMetadataParticipant;
  cause?: HistoryMetadataParticipant;
  extraData?: Record<string, string>;
}

export interface HistoryMetadataParticipant {
  id?: string;
  displayName?: string;
  displayNameKey?: string;
  type?: string;
  avatarUrl?: string;
  url?: string;
}

export interface AssignIssueParams {
  accountId?: string;
  name?: string; // DC fallback
}

export interface TransitionIssueParams {
  transition: {
    id: string;
  };
  fields?: Record<string, unknown>;
  update?: Record<string, FieldOperation[]>;
  historyMetadata?: HistoryMetadata;
  properties?: Array<{
    key: string;
    value: unknown;
  }>;
}

export interface AddCommentParams {
  body: string | ContentBlock;
  visibility?: Visibility;
  properties?: Array<{
    key: string;
    value: unknown;
  }>;
}

export interface CommentListResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: Comment[];
}

/**
 * Error types specific to Core operations
 */
export interface CoreError {
  errorMessages: string[];
  errors?: Record<string, string>;
  status?: number;
  warningMessages?: string[];
}

/**
 * Search and filter types
 */
export interface UserSearchParams {
  query?: string;
  issueKey?: string;
  project?: string;
  startAt?: number;
  maxResults?: number;
  includeActive?: boolean;
  includeInactive?: boolean;
}

export interface AssignableUserSearchParams {
  issueKey?: string;
  project?: string;
  query?: string;
  sessionId?: string;
  startAt?: number;
  maxResults?: number;
}

/**
 * Utility types for API responses
 */
export type CoreAPIResponse<T> = {
  data: T;
  status: number;
  headers: Record<string, string>;
  warnings?: string[];
};

export type PaginatedResponse<T> = {
  maxResults: number;
  startAt: number;
  total?: number;
  isLast: boolean;
  values: T[];
};

/**
 * Content format conversion types
 */
export interface ContentFormatOptions {
  preferredFormat: 'wikimarkup' | 'plaintext' | 'adf';
  fallbackToPlaintext: boolean;
  preserveFormatting: boolean;
}

/**
 * DC-specific configuration types
 */
export interface DCUserResolution {
  useAccountId: boolean;
  usernameAsFallback: boolean;
  fieldMappings: Record<string, string>;
}

/**
 * Validation and metadata types
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidation {
  fieldId: string;
  required: boolean;
  hasValidValue: boolean;
  validationError?: string;
}

/**
 * Common operation result types
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}