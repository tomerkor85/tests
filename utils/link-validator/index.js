/**
 * RadixInsight Analytics Platform
 * Link Validation System
 * 
 * This module provides functionality to validate links in HTML and Markdown files.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const marked = require('marked');
const glob = require('glob');

// Logger module
const logger = require('./logger');

/**
 * Validates links in the specified directories
 * @param {Object} options - Validation options
 * @param {Array<string>} options.directories - Directories to scan for files
 * @param {Array<string>} [options.excludePatterns] - Patterns to exclude from scanning
 * @param {Array<string>} [options.fileTypes] - File types to scan (default: ['.html', '.md'])
 * @param {boolean} [options.checkExternal] - Whether to check external links (default: false)
 * @param {number} [options.timeout] - Timeout for external link checks in ms (default: 3000)
 * @param {number} [options.concurrency] - Number of concurrent requests (default: 3)
 * @returns {Promise<Object>} - Validation results
 */
async function validateLinks(options) {
  const {
    directories,
    excludePatterns = ['node_modules', '.git'],
    fileTypes = ['.html', '.md'],
    checkExternal = false,
    timeout = 3000,
    concurrency = 3
  } = options;

  logger.info('Starting link validation');
  logger.info(`Scanning directories: ${directories.join(', ')}`);
  logger.info(`Excluding patterns: ${excludePatterns.join(', ')}`);
  logger.info(`File types: ${fileTypes.join(', ')}`);
  logger.info(`Check external links: ${checkExternal}`);

  // Find all files
  const files = [];
  for (const directory of directories) {
    const pattern = `${directory}/**/*+(${fileTypes.join('|')})`;
    const matches = glob.sync(pattern, {
      ignore: excludePatterns.map(p => `**/${p}/**`)
    });
    files.push(...matches);
  }

  logger.info(`Found ${files.length} files to scan`);

  // Extract links from files
  const links = [];
  for (const file of files) {
    const fileLinks = await extractLinksFromFile(file, fileTypes);
    links.push(...fileLinks.map(link => ({
      ...link,
      file
    })));
  }

  logger.info(`Extracted ${links.length} links from ${files.length} files`);

  // Validate links
  const results = {
    totalLinks: links.length,
    validLinks: 0,
    brokenLinks: 0,
    links: []
  };

  // Process internal links first
  const internalLinks = links.filter(link => !isExternalLink(link.url));
  const externalLinks = links.filter(link => isExternalLink(link.url));

  logger.info(`Found ${internalLinks.length} internal links and ${externalLinks.length} external links`);

  // Validate internal links
  for (const link of internalLinks) {
    const isValid = await validateInternalLink(link, directories);
    results.links.push({
      ...link,
      valid: isValid,
      error: isValid ? null : 'Link target not found'
    });

    if (isValid) {
      results.validLinks++;
    } else {
      results.brokenLinks++;
    }
  }

  logger.info(`Validated ${internalLinks.length} internal links`);

  // Validate external links if requested
  if (checkExternal && externalLinks.length > 0) {
    logger.info(`Validating ${externalLinks.length} external links`);

    // Process in batches for concurrency control
    const batches = [];
    for (let i = 0; i < externalLinks.length; i += concurrency) {
      batches.push(externalLinks.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(link => validateExternalLink(link, timeout));
      const batchResults = await Promise.all(batchPromises);

      for (let i = 0; i < batch.length; i++) {
        const { valid, error } = batchResults[i];
        results.links.push({
          ...batch[i],
          valid,
          error
        });

        if (valid) {
          results.validLinks++;
        } else {
          results.brokenLinks++;
        }
      }

      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info(`Validated ${externalLinks.length} external links`);
  } else if (externalLinks.length > 0) {
    logger.info('Skipping external link validation');

    // Mark external links as valid when not checking
    for (const link of externalLinks) {
      results.links.push({
        ...link,
        valid: true,
        error: null,
        skipped: true
      });
      results.validLinks++;
    }
  }

  logger.info('Link validation completed');
  logger.info(`Total links: ${results.totalLinks}`);
  logger.info(`Valid links: ${results.validLinks}`);
  logger.info(`Broken links: ${results.brokenLinks}`);

  return results;
}

/**
 * Extracts links from a file
 * @param {string} filePath - Path to the file
 * @param {Array<string>} fileTypes - File types to scan
 * @returns {Promise<Array<Object>>} - Extracted links
 */
async function extractLinksFromFile(filePath, fileTypes) {
  const content = fs.readFileSync(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();
  const links = [];

  if (extension === '.html') {
    const $ = cheerio.load(content);
    
    // Extract links from <a> tags
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#')) {
        links.push({
          url: href,
          text: $(el).text().trim(),
          type: 'a'
        });
      }
    });
    
    // Extract links from <img> tags
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        links.push({
          url: src,
          text: $(el).attr('alt') || '',
          type: 'img'
        });
      }
    });
    
    // Extract links from <script> tags
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        links.push({
          url: src,
          text: '',
          type: 'script'
        });
      }
    });
    
    // Extract links from <link> tags
    $('link').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        links.push({
          url: href,
          text: '',
          type: 'link'
        });
      }
    });
  } else if (extension === '.md') {
    // Extract links from Markdown
    const tokens = marked.lexer(content);
    
    function extractLinksFromTokens(tokens) {
      for (const token of tokens) {
        if (token.type === 'link') {
          links.push({
            url: token.href,
            text: token.text,
            type: 'md-link'
          });
        } else if (token.type === 'image') {
          links.push({
            url: token.href,
            text: token.text,
            type: 'md-image'
          });
        } else if (token.tokens) {
          extractLinksFromTokens(token.tokens);
        } else if (token.items) {
          for (const item of token.items) {
            if (item.tokens) {
              extractLinksFromTokens(item.tokens);
            }
          }
        }
      }
    }
    
    extractLinksFromTokens(tokens);
  }

  return links;
}

/**
 * Checks if a URL is external
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is external
 */
function isExternalLink(url) {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Validates an internal link
 * @param {Object} link - Link to validate
 * @param {Array<string>} directories - Base directories
 * @returns {Promise<boolean>} - Whether the link is valid
 */
async function validateInternalLink(link, directories) {
  const { url, file } = link;
  
  // Skip fragment-only links
  if (url.startsWith('#')) {
    return true;
  }
  
  // Skip mailto links
  if (url.startsWith('mailto:')) {
    return true;
  }
  
  // Skip tel links
  if (url.startsWith('tel:')) {
    return true;
  }
  
  // Handle relative paths
  let targetPath;
  if (url.startsWith('/')) {
    // Absolute path relative to project root
    // Try each directory as potential root
    for (const directory of directories) {
      const potentialPath = path.join(directory, url);
      if (fs.existsSync(potentialPath)) {
        return true;
      }
    }
    return false;
  } else {
    // Relative path
    const baseDir = path.dirname(file);
    targetPath = path.resolve(baseDir, url);
    
    // Remove hash fragment
    const hashIndex = targetPath.indexOf('#');
    if (hashIndex !== -1) {
      targetPath = targetPath.substring(0, hashIndex);
    }
    
    // Remove query string
    const queryIndex = targetPath.indexOf('?');
    if (queryIndex !== -1) {
      targetPath = targetPath.substring(0, queryIndex);
    }
    
    return fs.existsSync(targetPath);
  }
}

/**
 * Validates an external link
 * @param {Object} link - Link to validate
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} - Validation result
 */
async function validateExternalLink(link, timeout) {
  const { url } = link;
  
  try {
    const response = await axios.head(url, {
      timeout,
      maxRedirects: 5,
      validateStatus: status => status < 400
    });
    return { valid: true, error: null };
  } catch (error) {
    // Try GET request if HEAD fails
    try {
      const response = await axios.get(url, {
        timeout,
        maxRedirects: 5,
        validateStatus: status => status < 400
      });
      return { valid: true, error: null };
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error.response) {
        errorMessage = `HTTP status ${error.response.status}`;
      } else if (error.code) {
        errorMessage = error.code;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { valid: false, error: errorMessage };
    }
  }
}

module.exports = {
  validateLinks
};
