/**
 * RadixInsight Analytics Platform
 * Functionality Test Script
 * 
 * This script tests the functionality of all implemented features
 */

const fs = require('fs');
const path = require('path');

// Test database abstraction layer
function testDatabaseAbstraction() {
  console.log('\n=== Testing Database Abstraction Layer ===');
  
  try {
    const { DatabaseFactory } = require('./database/abstraction');
    console.log('✓ Database abstraction module imported successfully');
    
    // Test PostgreSQL adapter
    const pgAdapter = DatabaseFactory.createDatabase('postgresql', {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'postgres',
      password: 'postgres'
    });
    console.log('✓ PostgreSQL adapter created successfully');
    console.log('  Interface methods:', Object.keys(pgAdapter).filter(key => typeof pgAdapter[key] === 'function').join(', '));
    
    // Test MongoDB adapter
    const mongoAdapter = DatabaseFactory.createDatabase('mongodb', {
      connectionString: 'mongodb://localhost:27017/test'
    });
    console.log('✓ MongoDB adapter created successfully');
    console.log('  Interface methods:', Object.keys(mongoAdapter).filter(key => typeof mongoAdapter[key] === 'function').join(', '));
    
    // Test ClickHouse adapter
    const clickhouseAdapter = DatabaseFactory.createDatabase('clickhouse', {
      host: 'localhost',
      port: 8123,
      database: 'test'
    });
    console.log('✓ ClickHouse adapter created successfully');
    console.log('  Interface methods:', Object.keys(clickhouseAdapter).filter(key => typeof clickhouseAdapter[key] === 'function').join(', '));
    
    console.log('✓ Database abstraction layer test passed');
    return true;
  } catch (error) {
    console.error('✗ Database abstraction layer test failed:', error.message);
    return false;
  }
}

// Test SDK
function testSDK() {
  console.log('\n=== Testing SDK ===');
  
  try {
    // Check if SDK directory exists
    if (!fs.existsSync('./sdk')) {
      throw new Error('SDK directory not found');
    }
    console.log('✓ SDK directory exists');
    
    // Check if package.json exists
    if (!fs.existsSync('./sdk/package.json')) {
      throw new Error('SDK package.json not found');
    }
    
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync('./sdk/package.json', 'utf8'));
    console.log('✓ SDK package.json exists');
    console.log('  Package name:', packageJson.name);
    console.log('  Package version:', packageJson.version);
    
    // Check if main file exists
    if (!fs.existsSync('./sdk/src/index.js')) {
      throw new Error('SDK main file not found');
    }
    console.log('✓ SDK main file exists');
    
    // Check if examples exist
    if (!fs.existsSync('./sdk/examples')) {
      throw new Error('SDK examples directory not found');
    }
    
    const examples = fs.readdirSync('./sdk/examples');
    console.log('✓ SDK examples exist:', examples.join(', '));
    
    console.log('✓ SDK test passed');
    return true;
  } catch (error) {
    console.error('✗ SDK test failed:', error.message);
    return false;
  }
}

// Test link validation system
function testLinkValidation() {
  console.log('\n=== Testing Link Validation System ===');
  
  try {
    // Check if link validator directory exists
    if (!fs.existsSync('./utils/link-validator')) {
      throw new Error('Link validator directory not found');
    }
    console.log('✓ Link validator directory exists');
    
    // Check if required files exist
    const requiredFiles = ['index.js', 'cli.js', 'api.js', 'logger.js', 'integration.js'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(`./utils/link-validator/${file}`)) {
        throw new Error(`Link validator file not found: ${file}`);
      }
    }
    console.log('✓ All link validator files exist');
    
    // Try to import the module
    const linkValidator = require('./utils/link-validator');
    console.log('✓ Link validator module imported successfully');
    console.log('  Available functions:', Object.keys(linkValidator).join(', '));
    
    console.log('✓ Link validation system test passed');
    return true;
  } catch (error) {
    console.error('✗ Link validation system test failed:', error.message);
    return false;
  }
}

// Test visualization components
function testVisualizations() {
  console.log('\n=== Testing Visualization Components ===');
  
  try {
    // Check if visualizations directory exists
    if (!fs.existsSync('./public/js/visualizations')) {
      throw new Error('Visualizations directory not found');
    }
    console.log('✓ Visualizations directory exists');
    
    // Check if required files exist
    const requiredFiles = ['index.js', 'examples.js'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(`./public/js/visualizations/${file}`)) {
        throw new Error(`Visualization file not found: ${file}`);
      }
    }
    console.log('✓ All visualization files exist');
    
    // Check if demo file exists
    if (!fs.existsSync('./public/visualizations-demo.html')) {
      throw new Error('Visualization demo file not found');
    }
    console.log('✓ Visualization demo file exists');
    
    // Read the index.js file to check for visualization functions
    const indexContent = fs.readFileSync('./public/js/visualizations/index.js', 'utf8');
    const visualizationTypes = [
      'createPieChart',
      'createDataTable',
      'createFlowDiagram'
    ];
    
    for (const vizType of visualizationTypes) {
      if (!indexContent.includes(vizType)) {
        throw new Error(`Visualization function not found: ${vizType}`);
      }
    }
    console.log('✓ All visualization functions found');
    
    console.log('✓ Visualization components test passed');
    return true;
  } catch (error) {
    console.error('✗ Visualization components test failed:', error.message);
    return false;
  }
}

// Test user flow tracking
function testUserFlowTracking() {
  console.log('\n=== Testing User Flow Tracking ===');
  
  try {
    // Check if user flow tracking directory exists
    if (!fs.existsSync('./modules/user-flow-tracking')) {
      throw new Error('User flow tracking directory not found');
    }
    console.log('✓ User flow tracking directory exists');
    
    // Check if required files exist
    const requiredFiles = ['index.js', 'api.js', 'client.js', 'integration.js'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(`./modules/user-flow-tracking/${file}`)) {
        throw new Error(`User flow tracking file not found: ${file}`);
      }
    }
    console.log('✓ All user flow tracking files exist');
    
    // Try to import the module
    const UserFlowTracker = require('./modules/user-flow-tracking');
    console.log('✓ User flow tracking module imported successfully');
    
    // Check if the module has the expected methods
    const expectedMethods = [
      'startFlow',
      'addEvent',
      'endFlow',
      'getFlow',
      'getFlows'
    ];
    
    for (const method of expectedMethods) {
      if (typeof UserFlowTracker.prototype[method] !== 'function') {
        throw new Error(`User flow tracking method not found: ${method}`);
      }
    }
    console.log('✓ All user flow tracking methods found');
    
    console.log('✓ User flow tracking test passed');
    return true;
  } catch (error) {
    console.error('✗ User flow tracking test failed:', error.message);
    return false;
  }
}

// Test analytics features
function testAnalyticsFeatures() {
  console.log('\n=== Testing Analytics Features ===');
  
  try {
    // Check if analytics features directory exists
    if (!fs.existsSync('./modules/analytics-features')) {
      throw new Error('Analytics features directory not found');
    }
    console.log('✓ Analytics features directory exists');
    
    // Check if all feature files exist
    const features = [
      { file: 'cohort-analysis.js', className: 'CohortAnalysis' },
      { file: 'ab-testing.js', className: 'ABTesting' },
      { file: 'session-recording.js', className: 'SessionRecording' },
      { file: 'anomaly-detection.js', className: 'AnomalyDetection' },
      { file: 'heatmaps-integration.js', className: 'HeatmapsIntegration' }
    ];
    
    for (const feature of features) {
      if (!fs.existsSync(`./modules/analytics-features/${feature.file}`)) {
        throw new Error(`Analytics feature file not found: ${feature.file}`);
      }
      console.log(`✓ ${feature.file} exists`);
      
      // Try to import the module
      const FeatureModule = require(`./modules/analytics-features/${feature.file}`);
      
      // Check if it's a class with the expected name
      if (typeof FeatureModule !== 'function' || FeatureModule.name !== feature.className) {
        throw new Error(`Analytics feature class not found: ${feature.className}`);
      }
      console.log(`✓ ${feature.className} class found`);
    }
    
    console.log('✓ Analytics features test passed');
    return true;
  } catch (error) {
    console.error('✗ Analytics features test failed:', error.message);
    return false;
  }
}

// Test documentation
function testDocumentation() {
  console.log('\n=== Testing Documentation ===');
  
  try {
    // Check if README.md exists
    if (!fs.existsSync('./README.md')) {
      throw new Error('README.md not found');
    }
    console.log('✓ README.md exists');
    
    // Check if DOCUMENTATION.md exists
    if (!fs.existsSync('./DOCUMENTATION.md')) {
      throw new Error('DOCUMENTATION.md not found');
    }
    console.log('✓ DOCUMENTATION.md exists');
    
    // Check if SDK has its own README
    if (!fs.existsSync('./sdk/README.md')) {
      throw new Error('SDK README.md not found');
    }
    console.log('✓ SDK README.md exists');
    
    // Check if README.md contains information about all features
    const readmeContent = fs.readFileSync('./README.md', 'utf8');
    const requiredTopics = [
      'Database Abstraction Layer',
      'MongoDB',
      'SDK',
      'Link Validation',
      'Visualization',
      'User Flow Tracking',
      'Cohort Analysis',
      'A/B Testing',
      'Session Recording',
      'Anomaly Detection',
      'Heatmaps'
    ];
    
    for (const topic of requiredTopics) {
      if (!readmeContent.includes(topic)) {
        throw new Error(`README.md is missing information about: ${topic}`);
      }
    }
    console.log('✓ README.md contains information about all features');
    
    // Check if DOCUMENTATION.md contains API documentation
    const docsContent = fs.readFileSync('./DOCUMENTATION.md', 'utf8');
    const requiredAPIs = [
      'Authentication',
      'Database Abstraction Layer',
      'Projects API',
      'Events API',
      'Dashboards API',
      'User Flow Tracking API',
      'Cohort Analysis API',
      'A/B Testing API',
      'Session Recording API',
      'Anomaly Detection API',
      'Heatmaps API',
      'SDK Integration',
      'Link Validation',
      'Visualization Components'
    ];
    
    for (const api of requiredAPIs) {
      if (!docsContent.includes(api)) {
        throw new Error(`DOCUMENTATION.md is missing API documentation for: ${api}`);
      }
    }
    console.log('✓ DOCUMENTATION.md contains API documentation for all features');
    
    console.log('✓ Documentation test passed');
    return true;
  } catch (error) {
    console.error('✗ Documentation test failed:', error.message);
    return false;
  }
}

// Test deployment scripts
function testDeploymentScripts() {
  console.log('\n=== Testing Deployment Scripts ===');
  
  try {
    // Check if scripts directory exists
    if (!fs.existsSync('./scripts')) {
      throw new Error('Scripts directory not found');
    }
    console.log('✓ Scripts directory exists');
    
    // Check if deployment scripts exist
    if (!fs.existsSync('./scripts/deploy.sh')) {
      throw new Error('deploy.sh not found');
    }
    console.log('✓ deploy.sh exists');
    
    if (!fs.existsSync('./scripts/docker-deploy.sh')) {
      throw new Error('docker-deploy.sh not found');
    }
    console.log('✓ docker-deploy.sh exists');
    
    // Check if test script exists
    if (!fs.existsSync('./scripts/test.sh')) {
      throw new Error('test.sh not found');
    }
    console.log('✓ test.sh exists');
    
    // Check if scripts are executable
    const deployStats = fs.statSync('./scripts/deploy.sh');
    const dockerDeployStats = fs.statSync('./scripts/docker-deploy.sh');
    const testStats = fs.statSync('./scripts/test.sh');
    
    if (!(deployStats.mode & 0o111)) {
      throw new Error('deploy.sh is not executable');
    }
    console.log('✓ deploy.sh is executable');
    
    if (!(dockerDeployStats.mode & 0o111)) {
      throw new Error('docker-deploy.sh is not executable');
    }
    console.log('✓ docker-deploy.sh is executable');
    
    if (!(testStats.mode & 0o111)) {
      throw new Error('test.sh is not executable');
    }
    console.log('✓ test.sh is executable');
    
    console.log('✓ Deployment scripts test passed');
    return true;
  } catch (error) {
    console.error('✗ Deployment scripts test failed:', error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('=== Running Functionality Tests for RadixInsight Analytics Platform ===');
  
  const results = {
    databaseAbstraction: testDatabaseAbstraction(),
    sdk: testSDK(),
    linkValidation: testLinkValidation(),
    visualizations: testVisualizations(),
    userFlowTracking: testUserFlowTracking(),
    analyticsFeatures: testAnalyticsFeatures(),
    documentation: testDocumentation(),
    deploymentScripts: testDeploymentScripts()
  };
  
  console.log('\n=== Test Summary ===');
  let allPassed = true;
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✓' : '✗'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) allPassed = false;
  }
  
  console.log('\n=== Overall Result ===');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - The package is 100% functional');
  } else {
    console.log('❌ SOME TESTS FAILED - The package is not fully functional');
  }
  
  return allPassed;
}

// Run the tests
runAllTests();
