/**
 * Jest test setup for MCP Jira Data Center Server
 * Configures test environment, mocks, and global test utilities
 */

import { jest } from '@jest/globals';

/**
 * Mock fetch globally for all tests
 */
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

/**
 * Mock console methods to avoid noise in test output
 */
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

/**
 * Test environment variables
 */
process.env.NODE_ENV = 'test';
process.env.JIRA_DC_BASE_URL = 'https://test-jira-dc.company.com';
process.env.JIRA_DC_PAT = 'test-pat-token-1234567890abcdef';
process.env.JIRA_DC_API_VERSION = 'latest';
process.env.JIRA_DC_TIMEOUT = '5000';

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Create a mock DC configuration
   */
  createMockConfig: () => ({
    baseUrl: 'https://test-jira-dc.company.com',
    personalAccessToken: 'test-pat-token-1234567890abcdef',
    apiVersion: 'latest' as const,
    timeout: 5000,
    maxRetries: 2,
    validateSsl: false,
  }),

  /**
   * Create a mock successful DC user response
   */
  createMockUserResponse: () => ({
    accountId: 'test-account-id',
    name: 'testuser',
    displayName: 'Test User',
    emailAddress: 'test@company.com',
    active: true,
  }),

  /**
   * Create a mock fetch response
   */
  createMockFetchResponse: (status: number, data?: unknown, statusText?: string) => {
    const mockJson = jest.fn() as any;
    const mockText = jest.fn() as any;
    
    mockJson.mockResolvedValue(data);
    mockText.mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data));
    
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    
    const response = {
      ok: status >= 200 && status < 300,
      status,
      statusText: statusText || 'OK',
      headers,
      json: mockJson,
      text: mockText,
    } as unknown as Response;

    return response;
  },

  /**
   * Create a mock fetch rejection (network error)
   */
  createMockFetchError: (message: string) => {
    return new Error(message);
  },

  /**
   * Reset all mocks
   */
  resetMocks: () => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockReset();
  },

  /**
   * Wait for a promise to resolve/reject
   */
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

/**
 * Common test data
 */
export const testData = {
  validPATToken: 'NjEyODYwNjE2NjY4OkRCTkRGdWYwR1JVMmVmODJ2RmlWZlRZQw',
  invalidPATToken: 'invalid-token',
  shortPATToken: 'short',
  
  validBaseUrl: 'https://jira.company.com',
  invalidBaseUrl: 'not-a-url',
  httpBaseUrl: 'http://jira.company.com',
  
  contextPaths: {
    valid: '/jira',
    invalid: 'jira',
    custom: '/custom-context',
  },

  dcResponses: {
    myself: {
      accountId: '5b10ac8d82e05b22cc7d4ef5',
      name: 'admin',
      displayName: 'Administrator',
      emailAddress: 'admin@company.com',
      active: true,
    },
    
    error401: {
      errorMessages: ['You do not have valid authentication credentials.'],
    },
    
    error403: {
      errorMessages: ['You do not have permission to access this resource.'],
    },
    
    error404: {
      errorMessages: ['The requested resource was not found.'],
    },
  },
};

/**
 * Mock network conditions for testing
 */
export const mockNetworkConditions = {
  /**
   * Simulate network timeout
   */
  timeout: () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('The operation was aborted.', 'AbortError')), 100);
      })
    );
  },

  /**
   * Simulate DNS resolution failure
   */
  dnsFailure: () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('getaddrinfo ENOTFOUND test-jira-dc.company.com')
    );
  },

  /**
   * Simulate connection refused
   */
  connectionRefused: () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:443')
    );
  },

  /**
   * Simulate SSL certificate error
   */
  sslError: () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('certificate verify failed: self signed certificate')
    );
  },
};

/**
 * Reset test environment before each test
 */
beforeEach(() => {
  testUtils.resetMocks();
});

/**
 * Clean up after all tests
 */
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
  
  // Clear any remaining timers
  jest.clearAllTimers();
});