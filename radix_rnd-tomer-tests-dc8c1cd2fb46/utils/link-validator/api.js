/**
 * Link Validator - API module
 * 
 * This module provides an API for integrating the link validator into other applications.
 */

const LinkValidator = require('./index');

/**
 * Run link validation with the given options
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation results
 */
async function validateLinks(options = {}) {
  const validator = new LinkValidator(options);
  return await validator.validate();
}

/**
 * Validate a specific URL
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
async function validateUrl(url, options = {}) {
  const validator = new LinkValidator(options);
  const link = { url, text: url, source: 'API call', type: 'url' };
  return await validator.validateLink(link);
}

/**
 * Validate links in a specific file
 * @param {string} filePath - Path to file
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation results
 */
async function validateFile(filePath, options = {}) {
  const validator = new LinkValidator(options);
  let links = [];
  
  if (filePath.endsWith('.html')) {
    links = await validator.extractLinksFromHtmlFiles([filePath]);
  } else if (filePath.endsWith('.md')) {
    links = await validator.extractLinksFromMarkdownFiles([filePath]);
  } else {
    throw new Error('Unsupported file type. Only HTML and Markdown files are supported.');
  }
  
  return await validator.validateLinks(links);
}

module.exports = {
  validateLinks,
  validateUrl,
  validateFile
};
