/**
 * Link Validator - Integration script
 * 
 * This script integrates the link validator into the RadixInsight platform.
 */

const path = require('path');
const fs = require('fs');
const { validateLinks } = require('./api');

// Configuration for the link validator
const config = {
  baseDir: path.resolve(__dirname, '../../'),
  htmlGlob: '**/*.html',
  mdGlob: '**/*.md',
  excludeDirs: ['node_modules', 'dist', '.git', 'data', 'clickhouse'],
  logFile: path.resolve(__dirname, '../../logs/link-validation.log'),
  timeout: 5000,
  concurrency: 5,
  apiEndpoints: [
    'http://localhost:3000/api/health',
    'http://localhost:3000/api/auth/login',
    'http://localhost:3000/api/projects',
    'http://localhost:3000/api/events',
    'http://localhost:3000/api/dashboards'
  ]
};

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Run link validation
 */
async function runValidation() {
  console.log('Starting link validation...');
  
  try {
    const results = await validateLinks(config);
    
    console.log('Link validation completed:');
    console.log(`- Total links: ${results.total}`);
    console.log(`- Valid links: ${results.valid}`);
    console.log(`- Invalid links: ${results.invalid}`);
    console.log(`- Skipped links: ${results.skipped}`);
    
    if (results.invalid > 0) {
      console.log('\nInvalid links found:');
      const invalidLinks = results.details.filter(detail => detail.status === 'invalid');
      
      for (const link of invalidLinks.slice(0, 10)) {
        console.log(`- ${link.url} (${link.statusCode || 'N/A'}) in ${link.source}`);
      }
      
      if (invalidLinks.length > 10) {
        console.log(`... and ${invalidLinks.length - 10} more. See log file for details.`);
      }
      
      console.log(`\nFull details available in: ${config.logFile}`);
    }
    
    return results;
  } catch (error) {
    console.error('Error running link validation:', error);
    throw error;
  }
}

// Export the validation function and configuration
module.exports = {
  runValidation,
  config
};

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation()
    .then(results => {
      process.exit(results.invalid > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
