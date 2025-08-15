/**
 * Type definitions for Search Module
 * Based on Jira Data Center API v2/latest + Agile API v1.0
 * HIGH COMPATIBILITY with DC-specific enhancements
 */

import type { 
  Issue, User, Project 
} from '../core/types.js';
import type { Board, Sprint } from '../agile/types.js';

/**
 * Enhanced search types for DC optimization
 */
export interface EnhancedSearchParams {
  jql?: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  validateQuery?: boolean;
  properties?: string[];
  fieldsByKeys?: boolean;
}

export interface EnhancedSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: Issue[];
  warningMessages?: string[];
  names?: Record<string, string>;
  schema?: Record<string, FieldSchema>;
}

export interface FieldSchema {
  type: string;
  items?: string;
  system?: string;
  custom?: string;
  customId?: number;
}

/**
 * Enhanced issue retrieval with context
 */
export interface EnhancedGetIssueParams {
  issueIdOrKey: string;
  fields?: string[];
  expand?: string[];
  properties?: string[];
  fieldsByKeys?: boolean;
  updateHistory?: boolean;
}

/**
 * Epic search types for Agile API integration
 */
export interface EpicSearchParams {
  boardId: number;
  query?: string;
  startAt?: number;
  maxResults?: number;
  done?: boolean;
}

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

export interface EpicSearchResponse {
  maxResults: number;
  startAt: number;
  total?: number;
  isLast: boolean;
  values: Epic[];
}

/**
 * Universal user search with multiple modes
 */
export interface UniversalUserSearchParams {
  query?: string;
  mode?: 'assignable' | 'general' | 'project';
  issueKey?: string;
  projectKey?: string;
  startAt?: number;
  maxResults?: number;
  includeActive?: boolean;
  includeInactive?: boolean;
}

export interface UniversalUserSearchResponse {
  users: User[];
  total: number;
  searchMode: string;
  searchContext?: {
    issueKey?: string;
    projectKey?: string;
    boardId?: number;
  };
}

/**
 * Filter search and management types
 */
export interface Filter {
  id: string;
  name: string;
  description?: string;
  owner: User;
  jql: string;
  self: string;
  searchUrl: string;
  viewUrl: string;
  favourite: boolean;
  favouritedCount?: number;
  sharePermissions?: SharePermission[];
  editPermissions?: SharePermission[];
  subscriptions?: FilterSubscription[];
  sharedUsers?: User[];
  approximateLastUsed?: string;
}

export interface SharePermission {
  id: number;
  type: 'global' | 'project' | 'group' | 'user';
  project?: {
    id: string;
    key: string;
    name: string;
  };
  group?: {
    name: string;
  };
  user?: User;
}

export interface FilterSubscription {
  id: number;
  user: User;
  group?: {
    name: string;
  };
}

export interface FilterListParams {
  filterName?: string;
  accountId?: string;
  owner?: string;
  groupname?: string;
  groupId?: string;
  projectId?: number;
  id?: number[];
  orderBy?: string;
  startAt?: number;
  maxResults?: number;
  expand?: string[];
}

export interface FilterListResponse {
  self: string;
  nextPage?: string;
  maxResults: number;
  startAt: number;
  total?: number;
  isLast: boolean;
  values: Filter[];
}

/**
 * Search context and metadata types
 */
export interface SearchContext {
  issueKey?: string;
  projectKey?: string;
  boardId?: number;
  sprintId?: number;
  filterId?: string;
  userContext?: {
    accountId?: string;
    username?: string;
  };
}

export interface SearchMetadata {
  searchTime: number;
  resultCount: number;
  totalAvailable: number;
  searchMode: string;
  optimizations: string[];
  cacheStatus?: 'hit' | 'miss' | 'partial';
}

/**
 * Advanced search options for DC performance
 */
export interface AdvancedSearchOptions {
  enableCaching?: boolean;
  cacheTtl?: number;
  enableOptimization?: boolean;
  useParallelSearch?: boolean;
  searchTimeout?: number;
  maxConcurrentRequests?: number;
  retryOnFailure?: boolean;
}

/**
 * Consolidated search parameters (combines multiple search types)
 */
export interface ConsolidatedSearchParams {
  // Issue search
  jql?: string;
  issueFields?: string[];
  issueExpand?: string[];
  
  // User search
  userQuery?: string;
  userContext?: 'assignable' | 'general';
  
  // Project search
  projectExpand?: string[];
  projectType?: string;
  
  // Board/Sprint search
  boardProject?: string;
  sprintState?: 'future' | 'active' | 'closed';
  
  // Common pagination
  startAt?: number;
  maxResults?: number;
  
  // Search options
  options?: AdvancedSearchOptions;
}

/**
 * Multi-entity search response
 */
export interface MultiSearchResponse {
  issues?: {
    results: Issue[];
    total: number;
  };
  users?: {
    results: User[];
    total: number;
  };
  projects?: {
    results: Project[];
    total: number;
  };
  boards?: {
    results: Board[];
    total: number;
  };
  sprints?: {
    results: Sprint[];
    total: number;
  };
  epics?: {
    results: Epic[];
    total: number;
  };
  filters?: {
    results: Filter[];
    total: number;
  };
  metadata: SearchMetadata;
}

/**
 * Search suggestion and autocomplete types
 */
export interface SearchSuggestion {
  value: string;
  displayName: string;
  description?: string;
  type: 'jql' | 'user' | 'project' | 'epic' | 'filter';
  metadata?: Record<string, unknown>;
}

export interface AutocompleteParams {
  fieldName?: string;
  fieldValue?: string;
  predicateName?: string;
  predicateValue?: string;
}

export interface AutocompleteResponse {
  results: SearchSuggestion[];
}

/**
 * Search history and saved searches
 */
export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  searchType: string;
  context?: SearchContext;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  searchType: string;
  owner: User;
  isPrivate: boolean;
  createdDate: string;
  lastUsed?: string;
  useCount: number;
}

/**
 * Error types specific to Search operations
 */
export interface SearchError {
  errorMessages: string[];
  errors?: Record<string, string>;
  warningMessages?: string[];
  jqlErrors?: JQLError[];
}

export interface JQLError {
  lineNumber?: number;
  columnNumber?: number;
  errorMessage: string;
  errorType: 'syntax' | 'semantic' | 'permission';
}

/**
 * Performance monitoring for search operations
 */
export interface SearchPerformanceMetrics {
  searchId: string;
  startTime: number;
  endTime: number;
  duration: number;
  resultCount: number;
  searchType: string;
  cacheHit: boolean;
  optimizationsApplied: string[];
  errorCount: number;
}

/**
 * DC-specific search enhancements
 */
export interface DCSearchEnhancements {
  useDirectNetworkAccess: boolean;
  enableLocalCaching: boolean;
  optimizeForDataCenter: boolean;
  useBulkOperations: boolean;
  enableParallelProcessing: boolean;
}

/**
 * Search result aggregation and analytics
 */
export interface SearchAnalytics {
  totalSearches: number;
  averageResponseTime: number;
  mostCommonQueries: Array<{
    query: string;
    count: number;
    avgResponseTime: number;
  }>;
  searchTypeDistribution: Record<string, number>;
  errorRate: number;
  cacheHitRate: number;
}

/**
 * Utility types for search operations
 */
export type SearchAPIResponse<T> = {
  data: T;
  status: number;
  headers: Record<string, string>;
  metadata?: SearchMetadata;
  warnings?: string[];
};

export type SearchResultType = 
  | 'issue' 
  | 'user' 
  | 'project' 
  | 'board' 
  | 'sprint' 
  | 'epic' 
  | 'filter' 
  | 'version';

export interface SearchResultItem<T = unknown> {
  type: SearchResultType;
  id: string;
  key?: string;
  displayName: string;
  description?: string;
  data: T;
  relevanceScore?: number;
  lastModified?: string;
}

export interface SearchResultSet {
  results: SearchResultItem[];
  totalResults: number;
  searchTime: number;
  searchQuery: string;
  searchContext?: SearchContext;
  suggestions?: SearchSuggestion[];
}

/**
 * Configuration for search module
 */
export interface SearchModuleConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  maxSearchResults: number;
  enableOptimizations: boolean;
  enableAnalytics: boolean;
  performanceThreshold: number;
  dcEnhancements: DCSearchEnhancements;
}