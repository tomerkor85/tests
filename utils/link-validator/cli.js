/**
 * Link Validator - CLI module
 * 
 * This module provides a command-line interface for the link validator.
 */

const path = require('path');
const LinkValidator = require('./index');

/**
 * Parse command line arguments
 * @returns {Object} - Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseDir: process.cwd(),
    htmlGlob: '**/*.html',
    mdGlob: '**/*.md',
    excludeDirs: ['node_modules', 'dist', '.git'],
    logFile: 'link-validation.log',
    timeout: 5000,
    concurrency: 5,
    apiEndpoints: []
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--base-dir' && i + 1 < args.length) {
      options.baseDir = path.resolve(args[++i]);
    } else if (arg === '--html-glob' && i + 1 < args.length) {
      options.htmlGlob = args[++i];
    } else if (arg === '--md-glob' && i + 1 < args.length) {
      options.mdGlob = args[++i];
    } else if (arg === '--exclude-dirs' && i + 1 < args.length) {
      options.excludeDirs = args[++i].split(',');
    } else if (arg === '--log-file' && i + 1 < args.length) {
      options.logFile = args[++i];
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--api-endpoints' && i + 1 < args.length) {
      options.apiEndpoints = args[++i].split(',');
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Link Validator - Check for broken links in HTML and Markdown files

Usage: node cli.js [options]

Options:
  --base-dir <dir>         Base directory to scan (default: current directory)
  --html-glob <pattern>    Glob pattern for HTML files (default: **/*.html)
  --md-glob <pattern>      Glob pattern for Markdown files (default: **/*.md)
  --exclude-dirs <dirs>    Comma-separated list of directories to exclude
                           (default: node_modules,dist,.git)
  --log-file <file>        Path to log file (default: link-validation.log)
  --timeout <ms>           Request timeout in milliseconds (default: 5000)
  --concurrency <num>      Number of concurrent requests (default: 5)
  --api-endpoints <urls>   Comma-separated list of API endpoints to validate
  --help, -h               Show this help message
  `);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  console.log('Link Validator');
  console.log('=============');
  console.log(`Base directory: ${options.baseDir}`);
  console.log(`HTML glob: ${options.htmlGlob}`);
  console.log(`Markdown glob: ${options.mdGlob}`);
  console.log(`Excluded directories: ${options.excludeDirs.join(', ')}`);
  console.log(`Log file: ${options.logFile}`);
  console.log(`Timeout: ${options.timeout}ms`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`API endpoints: ${options.apiEndpoints.length > 0 ? options.apiEndpoints.join(', ') : 'none'}`);
  console.log('');
  
  try {
    const validator = new LinkValidator(options);
    const results = await validator.validate();
    
    console.log('');
    console.log('Validation Results');
    console.log('=================');
    console.log(`Total links: ${results.total}`);
    console.log(`Valid links: ${results.valid}`);
    console.log(`Invalid links: ${results.invalid}`);
    console.log(`Skipped links: ${results.skipped}`);
    
    if (results.invalid > 0) {
      console.log('');
      console.log('Invalid Links');
      console.log('=============');
      
      for (const detail of results.details) {
        if (detail.status === 'invalid') {
          console.log(`- ${detail.url} (${detail.statusCode || 'N/A'}) in ${detail.source}: ${detail.reason}`);
        }
      }
      
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running link validator:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  main
};
