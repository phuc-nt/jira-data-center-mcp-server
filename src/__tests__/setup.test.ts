import { describe, expect, it } from '@jest/globals';
import { testUtils } from './setup.js';

describe('Test Setup', () => {
  it('should have working test utilities', () => {
    expect(testUtils).toBeDefined();
    expect(testUtils.createMockConfig).toBeDefined();
    expect(testUtils.createMockUserResponse).toBeDefined();
    expect(testUtils.createMockFetchResponse).toBeDefined();
  });

  it('should create valid mock configuration', () => {
    const config = testUtils.createMockConfig();
    expect(config.baseUrl).toBeDefined();
    expect(config.personalAccessToken).toBeDefined();
    expect(config.apiVersion).toBe('latest');
  });

  it('should create mock fetch response', () => {
    const response = testUtils.createMockFetchResponse(200, { test: 'data' });
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });
});