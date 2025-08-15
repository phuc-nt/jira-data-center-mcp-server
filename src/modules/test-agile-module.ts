/**
 * Basic test script for Agile Module
 * Tests module instantiation and basic functionality
 */

import { AgileModule } from './agile/index.js';
import type { JiraDataCenterConfig } from '../config/datacenter-config.js';
import type { PATAuthenticator } from '../auth/pat-authenticator.js';

// Mock configuration
const mockConfig: JiraDataCenterConfig = {
  baseUrl: 'https://jira.example.com',
  personalAccessToken: 'mock-pat-token',
  contextPath: '',
  apiVersion: '2',
  timeout: 30000,
  maxRetries: 3,
  validateSsl: true
};

// Mock authenticator
const mockAuthenticator = {
  authenticate: async () => ({ type: 'bearer' as const, token: 'mock-token' }),
  validateToken: async () => true
} as unknown as PATAuthenticator;

async function testAgileModule() {
  console.log('🧪 Testing Agile Module...');
  
  try {
    // Test module instantiation
    console.log('1. Creating Agile Module instance...');
    const agileModule = new AgileModule(mockConfig, mockAuthenticator);
    console.log('✅ Agile Module created successfully');

    // Test capabilities
    console.log('2. Checking module capabilities...');
    const capabilities = agileModule.getCapabilities();
    console.log(`✅ Total tools: ${capabilities.totalTools}`);
    console.log(`✅ Board tools: ${capabilities.boardManagement.tools.length}`);
    console.log(`✅ Sprint tools: ${capabilities.sprintManagement.tools.length}`);
    console.log(`✅ Issue tools: ${capabilities.issueOperations.tools.length}`);

    // Test health status
    console.log('3. Checking health status...');
    const health = agileModule.getHealthStatus();
    console.log(`✅ Module: ${health.module}, API Version: ${health.apiVersion}, Compatibility: ${health.compatibility}`);

    console.log('\n🎉 All Agile Module tests passed!');
    console.log('📊 Module Details:');
    console.log(`   - Total Tools: ${capabilities.totalTools}`);
    console.log(`   - Board Management: ${capabilities.boardManagement.tools.join(', ')}`);
    console.log(`   - Sprint Management: ${capabilities.sprintManagement.tools.join(', ')}`);
    console.log(`   - Issue Operations: ${capabilities.issueOperations.tools.join(', ')}`);
    console.log(`   - DC Enhancements: ${capabilities.dcEnhancements.join(', ')}`);

  } catch (error) {
    console.error('❌ Agile Module test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAgileModule().catch(console.error);
}