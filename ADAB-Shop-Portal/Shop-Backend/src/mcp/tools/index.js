const { registerOrderTools } = require('./orders');
const { registerCatalogTools } = require('./catalog');
const { registerFinanceTools } = require('./finance');
const { registerB2BTools } = require('./b2b');
const { registerStoreTools } = require('./store');

/**
 * Registers the entire ADAB MCP Tool Suite into the provided registry.
 * Connects all operational endpoints across Orders, Catalog, Finance, B2B, and Store.
 * @param {import('../registry').McpRegistry} registry
 */
function registerAllTools(registry) {
  registerOrderTools(registry);
  registerCatalogTools(registry);
  registerFinanceTools(registry);
  registerB2BTools(registry);
  registerStoreTools(registry);
}

module.exports = {
  registerAllTools
};
