#!/bin/bash

# RadixInsight Analytics Platform Test Script
# This script runs tests for all components of the RadixInsight platform

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}     RadixInsight Analytics Platform Test Script          ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo ""

# Function to print status messages
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to print warning messages
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to print error messages
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to test database abstraction layer
test_database_abstraction() {
  print_status "Testing database abstraction layer..."
  
  # Create test file
  cat > test-db-abstraction.js <<EOL
const { DatabaseFactory } = require('./database/abstraction');

async function testDatabaseAbstraction() {
  console.log('Testing Database Abstraction Layer');
  
  // Test PostgreSQL adapter
  try {
    console.log('\nTesting PostgreSQL adapter:');
    const pgDb = DatabaseFactory.createDatabase('postgresql', {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'postgres',
      password: 'postgres'
    });
    
    console.log('PostgreSQL adapter created successfully');
    console.log('Interface methods available:', Object.keys(pgDb).filter(key => typeof pgDb[key] === 'function'));
  } catch (error) {
    console.error('Error testing PostgreSQL adapter:', error.message);
  }
  
  // Test MongoDB adapter
  try {
    console.log('\nTesting MongoDB adapter:');
    const mongoDb = DatabaseFactory.createDatabase('mongodb', {
      connectionString: 'mongodb://localhost:27017/test'
    });
    
    console.log('MongoDB adapter created successfully');
    console.log('Interface methods available:', Object.keys(mongoDb).filter(key => typeof mongoDb[key] === 'function'));
  } catch (error) {
    console.error('Error testing MongoDB adapter:', error.message);
  }
  
  // Test ClickHouse adapter
  try {
    console.log('\nTesting ClickHouse adapter:');
    const clickhouseDb = DatabaseFactory.createDatabase('clickhouse', {
      host: 'localhost',
      port: 8123,
      database: 'test'
    });
    
    console.log('ClickHouse adapter created successfully');
    console.log('Interface methods available:', Object.keys(clickhouseDb).filter(key => typeof clickhouseDb[key] === 'function'));
  } catch (error) {
    console.error('Error testing ClickHouse adapter:', error.message);
  }
  
  console.log('\nDatabase abstraction layer test completed');
}

testDatabaseAbstraction().catch(console.error);
EOL
  
  # Run test
  node test-db-abstraction.js
  
  if [ $? -eq 0 ]; then
    print_success "Database abstraction layer test completed."
  else
    print_error "Database abstraction layer test failed."
  fi
  
  echo ""
}

# Function to test SDK
test_sdk() {
  print_status "Testing SDK..."
  
  # Create test file
  cat > test-sdk.js <<EOL
const fs = require('fs');
const path = require('path');

function testSDK() {
  console.log('Testing SDK Package');
  
  // Check if SDK package.json exists
  const packageJsonPath = path.join(__dirname, 'sdk', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('SDK package.json not found');
    process.exit(1);
  }
  
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('SDK package name:', packageJson.name);
  console.log('SDK package version:', packageJson.version);
  
  // Check if main SDK file exists
  const mainFilePath = path.join(__dirname, 'sdk', 'src', 'index.js');
  if (!fs.existsSync(mainFilePath)) {
    console.error('SDK main file not found');
    process.exit(1);
  }
  
  console.log('SDK main file exists');
  
  // Check if examples exist
  const examplesDir = path.join(__dirname, 'sdk', 'examples');
  if (!fs.existsSync(examplesDir)) {
    console.error('SDK examples directory not found');
    process.exit(1);
  }
  
  const examples = fs.readdirSync(examplesDir);
  console.log('SDK examples found:', examples);
  
  console.log('SDK test completed successfully');
}

testSDK();
EOL
  
  # Run test
  node test-sdk.js
  
  if [ $? -eq 0 ]; then
    print_success "SDK test completed."
  else
    print_error "SDK test failed."
  fi
  
  echo ""
}

# Function to test link validation
test_link_validation() {
  print_status "Testing link validation system..."
  
  # Create test file
  cat > test-link-validator.js <<EOL
const fs = require('fs');
const path = require('path');

function testLinkValidator() {
  console.log('Testing Link Validation System');
  
  // Check if link validator files exist
  const validatorDir = path.join(__dirname, 'utils', 'link-validator');
  if (!fs.existsSync(validatorDir)) {
    console.error('Link validator directory not found');
    process.exit(1);
  }
  
  const files = ['index.js', 'cli.js', 'api.js', 'logger.js', 'integration.js'];
  for (const file of files) {
    const filePath = path.join(validatorDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(\`Link validator file not found: \${file}\`);
      process.exit(1);
    }
    console.log(\`Link validator file exists: \${file}\`);
  }
  
  // Create a test HTML file with links
  const testDir = path.join(__dirname, 'test-links');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  const testHtmlPath = path.join(testDir, 'test.html');
  fs.writeFileSync(testHtmlPath, \`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Link Test</title>
    </head>
    <body>
      <a href="https://example.com">Valid Link</a>
      <a href="https://example.com/nonexistent">Invalid Link</a>
      <a href="./relative-link.html">Relative Link</a>
    </body>
    </html>
  \`);
  
  console.log('Created test HTML file with links');
  
  // Try to import the link validator
  try {
    const linkValidator = require('./utils/link-validator');
    console.log('Link validator module imported successfully');
    console.log('Available functions:', Object.keys(linkValidator));
    
    console.log('Link validation system test completed successfully');
  } catch (error) {
    console.error('Error importing link validator:', error.message);
    process.exit(1);
  }
}

testLinkValidator();
EOL
  
  # Run test
  node test-link-validator.js
  
  if [ $? -eq 0 ]; then
    print_success "Link validation system test completed."
  else
    print_error "Link validation system test failed."
  fi
  
  echo ""
}

# Function to test visualization components
test_visualization_components() {
  print_status "Testing visualization components..."
  
  # Create test file
  cat > test-visualizations.js <<EOL
const fs = require('fs');
const path = require('path');

function testVisualizations() {
  console.log('Testing Visualization Components');
  
  // Check if visualization files exist
  const vizDir = path.join(__dirname, 'public', 'js', 'visualizations');
  if (!fs.existsSync(vizDir)) {
    console.error('Visualizations directory not found');
    process.exit(1);
  }
  
  const files = ['index.js', 'examples.js'];
  for (const file of files) {
    const filePath = path.join(vizDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(\`Visualization file not found: \${file}\`);
      process.exit(1);
    }
    console.log(\`Visualization file exists: \${file}\`);
  }
  
  // Check if demo HTML file exists
  const demoPath = path.join(__dirname, 'public', 'visualizations-demo.html');
  if (!fs.existsSync(demoPath)) {
    console.error('Visualization demo file not found');
    process.exit(1);
  }
  console.log('Visualization demo file exists');
  
  // Read the index.js file to check for visualization functions
  const indexContent = fs.readFileSync(path.join(vizDir, 'index.js'), 'utf8');
  const visualizationTypes = [
    'createPieChart',
    'createDataTable',
    'createFlowDiagram'
  ];
  
  for (const vizType of visualizationTypes) {
    if (indexContent.includes(vizType)) {
      console.log(\`Visualization function found: \${vizType}\`);
    } else {
      console.error(\`Visualization function not found: \${vizType}\`);
      process.exit(1);
    }
  }
  
  console.log('Visualization components test completed successfully');
}

testVisualizations();
EOL
  
  # Run test
  node test-visualizations.js
  
  if [ $? -eq 0 ]; then
    print_success "Visualization components test completed."
  else
    print_error "Visualization components test failed."
  fi
  
  echo ""
}

# Function to test user flow tracking
test_user_flow_tracking() {
  print_status "Testing user flow tracking..."
  
  # Create test file
  cat > test-user-flow.js <<EOL
const fs = require('fs');
const path = require('path');

function testUserFlowTracking() {
  console.log('Testing User Flow Tracking');
  
  // Check if user flow tracking files exist
  const flowDir = path.join(__dirname, 'modules', 'user-flow-tracking');
  if (!fs.existsSync(flowDir)) {
    console.error('User flow tracking directory not found');
    process.exit(1);
  }
  
  const files = ['index.js', 'api.js', 'client.js', 'integration.js'];
  for (const file of files) {
    const filePath = path.join(flowDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(\`User flow tracking file not found: \${file}\`);
      process.exit(1);
    }
    console.log(\`User flow tracking file exists: \${file}\`);
  }
  
  // Try to import the user flow tracking module
  try {
    const UserFlowTracker = require('./modules/user-flow-tracking');
    console.log('User flow tracking module imported successfully');
    
    // Check if the module has the expected methods
    const expectedMethods = [
      'startFlow',
      'addEvent',
      'endFlow',
      'getFlow',
      'getFlows'
    ];
    
    for (const method of expectedMethods) {
      if (typeof UserFlowTracker.prototype[method] === 'function') {
        console.log(\`User flow tracking method found: \${method}\`);
      } else {
        console.error(\`User flow tracking method not found: \${method}\`);
        process.exit(1);
      }
    }
    
    console.log('User flow tracking test completed successfully');
  } catch (error) {
    console.error('Error importing user flow tracking module:', error.message);
    process.exit(1);
  }
}

testUserFlowTracking();
EOL
  
  # Run test
  node test-user-flow.js
  
  if [ $? -eq 0 ]; then
    print_success "User flow tracking test completed."
  else
    print_error "User flow tracking test failed."
  fi
  
  echo ""
}

# Function to test analytics features
test_analytics_features() {
  print_status "Testing analytics features..."
  
  # Create test file
  cat > test-analytics-features.js <<EOL
const fs = require('fs');
const path = require('path');

function testAnalyticsFeatures() {
  console.log('Testing Analytics Features');
  
  // Check if analytics features directory exists
  const featuresDir = path.join(__dirname, 'modules', 'analytics-features');
  if (!fs.existsSync(featuresDir)) {
    console.error('Analytics features directory not found');
    process.exit(1);
  }
  
  // Check if all feature files exist
  const features = [
    { file: 'cohort-analysis.js', className: 'CohortAnalysis' },
    { file: 'ab-testing.js', className: 'ABTesting' },
    { file: 'session-recording.js', className: 'SessionRecording' },
    { file: 'anomaly-detection.js', className: 'AnomalyDetection' },
    { file: 'heatmaps-integration.js', className: 'HeatmapsIntegration' }
  ];
  
  for (const feature of features) {
    const filePath = path.join(featuresDir, feature.file);
    if (!fs.existsSync(filePath)) {
      console.error(\`Analytics feature file not found: \${feature.file}\`);
      process.exit(1);
    }
    console.log(\`Analytics feature file exists: \${feature.file}\`);
    
    // Check if the file exports the expected class
    try {
      const module = require(filePath);
      if (typeof module === 'function' && module.name === feature.className) {
        console.log(\`Analytics feature class found: \${feature.className}\`);
      } else {
        console.error(\`Analytics feature class not found: \${feature.className}\`);
        process.exit(1);
      }
    } catch (error) {
      console.error(\`Error importing analytics feature \${feature.file}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('Analytics features test completed successfully');
}

testAnalyticsFeatures();
EOL
  
  # Run test
  node test-analytics-features.js
  
  if [ $? -eq 0 ]; then
    print_success "Analytics features test completed."
  else
    print_error "Analytics features test failed."
  fi
  
  echo ""
}

# Function to test documentation
test_documentation() {
  print_status "Testing documentation..."
  
  # Create test file
  cat > test-documentation.js <<EOL
const fs = require('fs');
const path = require('path');

function testDocumentation() {
  console.log('Testing Documentation');
  
  // Check if README.md exists
  const readmePath = path.join(__dirname, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    process.exit(1);
  }
  console.log('README.md exists');
  
  // Check if DOCUMENTATION.md exists
  const docsPath = path.join(__dirname, 'DOCUMENTATION.md');
  if (!fs.existsSync(docsPath)) {
    console.error('DOCUMENTATION.md not found');
    process.exit(1);
  }
  console.log('DOCUMENTATION.md exists');
  
  // Check if SDK has its own README
  const sdkReadmePath = path.join(__dirname, 'sdk', 'README.md');
  if (!fs.existsSync(sdkReadmePath)) {
    console.error('SDK README.md not found');
    process.exit(1);
  }
  console.log('SDK README.md exists');
  
  // Check if README.md contains information about all features
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
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
    if (readmeContent.includes(topic)) {
      console.log(\`README.md contains information about: \${topic}\`);
    } else {
      console.error(\`README.md is missing information about: \${topic}\`);
      process.exit(1);
    }
  }
  
  // Check if DOCUMENTATION.md contains API documentation
  const docsContent = fs.readFileSync(docsPath, 'utf8');
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
    if (docsContent.includes(api)) {
      console.log(\`DOCUMENTATION.md contains API documentation for: \${api}\`);
    } else {
      console.error(\`DOCUMENTATION.md is missing API documentation for: \${api}\`);
      process.exit(1);
    }
  }
  
  console.log('Documentation test completed successfully');
}

testDocumentation();
EOL
  
  # Run test
  node test-documentation.js
  
  if [ $? -eq 0 ]; then
    print_success "Documentation test completed."
  else
    print_error "Documentation test failed."
  fi
  
  echo ""
}

# Function to test deployment scripts
test_deployment_scripts() {
  print_status "Testing deployment scripts..."
  
  # Check if deployment scripts exist
  if [ ! -f scripts/deploy.sh ]; then
    print_error "deploy.sh not found"
    exit 1
  fi
  print_status "deploy.sh exists"
  
  if [ ! -f scripts/docker-deploy.sh ]; then
    print_error "docker-deploy.sh not found"
    exit 1
  fi
  print_status "docker-deploy.sh exists"
  
  # Check if scripts are executable
  if [ ! -x scripts/deploy.sh ]; then
    print_error "deploy.sh is not executable"
    exit 1
  fi
  print_status "deploy.sh is executable"
  
  if [ ! -x scripts/docker-deploy.sh ]; then
    print_error "docker-deploy.sh is not executable"
    exit 1
  fi
  print_status "docker-deploy.sh is executable"
  
  # Check if deploy.sh contains required functions
  if ! grep -q "check_prerequisites" scripts/deploy.sh; then
    print_error "deploy.sh is missing check_prerequisites function"
    exit 1
  fi
  
  if ! grep -q "load_environment" scripts/deploy.sh; then
    print_error "deploy.sh is missing load_environment function"
    exit 1
  fi
  
  if ! grep -q "install_dependencies" scripts/deploy.sh; then
    print_error "deploy.sh is missing install_dependencies function"
    exit 1
  fi
  
  if ! grep -q "initialize_database" scripts/deploy.sh; then
    print_error "deploy.sh is missing initialize_database function"
    exit 1
  fi
  
  # Check if docker-deploy.sh contains required functions
  if ! grep -q "create_dockerfile" scripts/docker-deploy.sh; then
    print_error "docker-deploy.sh is missing create_dockerfile function"
    exit 1
  fi
  
  if ! grep -q "create_docker_compose" scripts/docker-deploy.sh; then
    print_error "docker-deploy.sh is missing create_docker_compose function"
    exit 1
  fi
  
  if ! grep -q "build_docker_image" scripts/docker-deploy.sh; then
    print_error "docker-deploy.sh is missing build_docker_image function"
    exit 1
  fi
  
  print_success "Deployment scripts test completed."
  echo ""
}

# Function to run all tests
run_all_tests() {
  print_status "Running all tests..."
  
  test_database_abstraction
  test_sdk
  test_link_validation
  test_visualization_components
  test_user_flow_tracking
  test_analytics_features
  test_documentation
  test_deployment_scripts
  
  print_success "All tests completed."
  echo ""
}

# Main function
main() {
  # Parse command line arguments
  if [ $# -eq 0 ]; then
    run_all_tests
  else
    for arg in "$@"; do
      case $arg in
        --db-abstraction)
          test_database_abstraction
          ;;
        --sdk)
          test_sdk
          ;;
        --link-validation)
          test_link_validation
          ;;
        --visualizations)
          test_visualization_components
          ;;
        --user-flow)
          test_user_flow_tracking
          ;;
        --analytics)
          test_analytics_features
          ;;
        --docs)
          test_documentation
          ;;
        --deployment)
          test_deployment_scripts
          ;;
        --help)
          echo "Usage: $0 [options]"
          echo ""
          echo "Options:"
          echo "  --db-abstraction   Test database abstraction layer"
          echo "  --sdk              Test SDK"
          echo "  --link-validation  Test link validation system"
          echo "  --visualizations   Test visualization components"
          echo "  --user-flow        Test user flow tracking"
          echo "  --analytics        Test analytics features"
          echo "  --docs             Test documentation"
          echo "  --deployment       Test deployment scripts"
          echo "  --help             Display this help message"
          exit 0
          ;;
        *)
          print_error "Unknown option: $arg"
          echo "Use --help for usage information."
          exit 1
          ;;
      esac
    done
  fi
}

# Run the main function
main "$@"
