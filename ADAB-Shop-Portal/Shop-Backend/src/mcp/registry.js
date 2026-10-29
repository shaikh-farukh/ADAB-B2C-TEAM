/**
 * ADAB Model Context Protocol (MCP) Tool Registry
 * Manages tool registration, Gemini function declaration formatting,
 * and secure tenant-scoped tool dispatch.
 */

class McpRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool into the registry
   * @param {Object} tool
   * @param {string} tool.name
   * @param {string} tool.description
   * @param {Object} tool.parameters - JSON schema format for Gemini API
   * @param {'TIER_1_READ' | 'TIER_2_MUTATIVE' | 'TIER_3_HIGH_RISK'} tool.tier
   * @param {Function} tool.handler - async (args, authContext) => result
   */
  register(tool) {
    if (!tool.name || typeof tool.handler !== 'function') {
      throw new Error(`Invalid tool registration for '${tool.name || 'unknown'}'`);
    }
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      tier: tool.tier || 'TIER_1_READ',
      handler: tool.handler
    });
  }

  registerTool(tool) {
    return this.register(tool);
  }

  /**
   * Returns Gemini-compatible function declarations array
   */
  getGeminiFunctionDeclarations() {
    const declarations = [];
    for (const [name, tool] of this.tools.entries()) {
      declarations.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      });
    }
    return declarations;
  }

  /**
   * Dispatches a tool execution with guaranteed tenant scoping
   * @param {string} toolName
   * @param {Object} args
   * @param {Object} authContext - { storeId, userId, role }
   */
  async execute(toolName, args, authContext) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`ToolNotFound: '${toolName}' is not registered in the ADAB MCP registry`);
    }

    const startTime = Date.now();
    try {
      if (!authContext || !authContext.storeId) {
        throw new Error(`SecurityException: Missing authenticated store context for tool execution '${toolName}'`);
      }

      const result = await tool.handler(args || {}, authContext);
      const durationMs = Date.now() - startTime;

      // Asynchronous audit logging (write-once audit trail)
      this._recordAuditLog({
        storeId: authContext.storeId,
        userId: authContext.userId || null,
        prompt: authContext.prompt || null,
        toolName,
        toolTier: tool.tier,
        arguments: args,
        result,
        success: true,
        durationMs
      }).catch(() => {});

      return {
        success: true,
        tool: toolName,
        tier: tool.tier,
        durationMs,
        data: result
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      this._recordAuditLog({
        storeId: authContext?.storeId || '00000000-0000-0000-0000-000000000000',
        userId: authContext?.userId || null,
        prompt: authContext?.prompt || null,
        toolName,
        toolTier: tool.tier,
        arguments: args,
        result: { error: err.message },
        success: false,
        durationMs
      }).catch(() => {});

      return {
        success: false,
        tool: toolName,
        tier: tool.tier,
        durationMs,
        error: err.message || 'Tool execution failed'
      };
    }
  }

  async _recordAuditLog({ storeId, userId, prompt, toolName, toolTier, arguments: toolArgs, result, success, durationMs }) {
    try {
      const pool = require('../../db');
      if (pool && typeof pool.query === 'function') {
        await pool.query(
          `INSERT INTO ai_audit_logs (store_id, user_id, prompt, tool_name, tool_tier, arguments, result, success, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            storeId,
            userId,
            prompt,
            toolName,
            toolTier,
            JSON.stringify(toolArgs || {}),
            JSON.stringify(result || {}),
            success,
            durationMs
          ]
        );
      }
    } catch (_) {
      // Non-fatal if DB table is initializing or in mocked test environment
    }
  }
}

// Global singleton instance
const defaultRegistry = new McpRegistry();

module.exports = {
  McpRegistry,
  defaultRegistry
};
