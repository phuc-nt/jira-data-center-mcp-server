/**
 * Basic test script for Core Module
 * Tests module instantiation and basic functionality
 */

import { CoreModule } from './core/index.js';
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

async function testCoreModule() {
  console.log('🧪 Testing Core Module...');
  
  try {
    // Test module instantiation
    console.log('1. Creating Core Module instance...');
    const coreModule = new CoreModule(mockConfig, mockAuthenticator);
    console.log('✅ Core Module created successfully');

    // Test capabilities
    console.log('2. Checking module capabilities...');
    const capabilities = coreModule.getCapabilities();
    console.log(`✅ Total tools: ${capabilities.totalTools}`);
    console.log(`✅ User management: ${capabilities.userManagement.tools.length} tools`);
    console.log(`✅ Project management: ${capabilities.projectManagement.tools.length} tools`);
    console.log(`✅ Issue CRUD: ${capabilities.issueCrud.tools.length} tools`);
    console.log(`✅ Issue lifecycle: ${capabilities.issueLifecycle.tools.length} tools`);

    // Test health status
    console.log('3. Checking health status...');
    const health = coreModule.getHealthStatus();
    console.log(`✅ Module: ${health.module}, API Version: ${health.apiVersion}, Compatibility: ${health.compatibility}`);

    console.log('\n🎉 All Core Module tests passed!');
    console.log('📊 Module Details:');
    console.log(`   - Total Tools: ${capabilities.totalTools}`);
    console.log(`   - User Management: ${capabilities.userManagement.tools.join(', ')}`);
    console.log(`   - Project Management: ${capabilities.projectManagement.tools.join(', ')}`);
    console.log(`   - Issue CRUD: ${capabilities.issueCrud.tools.join(', ')}`);
    console.log(`   - Issue Lifecycle: ${capabilities.issueLifecycle.tools.join(', ')}`);
    console.log(`   - DC Enhancements: ${capabilities.dcEnhancements.join(', ')}`);

    console.log('\n🔧 Compatibility Summary:');
    console.log(`   - User Management: ${capabilities.userManagement.compatibility}`);
    console.log(`   - Project Management: ${capabilities.projectManagement.compatibility}`);
    console.log(`   - Issue CRUD: ${capabilities.issueCrud.compatibility}`);
    console.log(`   - Issue Lifecycle: ${capabilities.issueLifecycle.compatibility}`);

  } catch (error) {
    console.error('❌ Core Module test failed:', error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCoreModule().catch(console.error);
}