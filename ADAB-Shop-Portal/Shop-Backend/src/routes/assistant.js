const express = require('express');
const router = express.Router();
const { requireSellerAuth } = require('../middlewares/auth');
const { defaultRegistry } = require('../mcp/registry');
const { defaultGeminiClient } = require('../mcp/geminiClient');
const { registerAllTools } = require('../mcp/tools');

// Ensure the full ADAB MCP tool suite is registered across all domains
registerAllTools(defaultRegistry);

// Require authenticated seller context for all assistant operations
router.use(requireSellerAuth);

/**
 * GET /api/v1/assistant/tools
 * Discover registered MCP tools and their safety tiers
 */
router.get('/tools', (req, res) => {
  const tools = [];
  for (const [name, tool] of defaultRegistry.tools.entries()) {
    tools.push({
      name: tool.name,
      description: tool.description,
      tier: tool.tier,
      parameters: tool.parameters
    });
  }
  res.json({
    success: true,
    count: tools.length,
    tools
  });
});

/**
 * POST /api/v1/assistant/chat
 * Primary conversational turn with Gemini 3.5 Flash and MCP tool execution
 */
router.post('/chat', async (req, res) => {
  const { prompt, history = [] } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "prompt" string is required.'
    });
  }

  const authContext = {
    storeId: req.sellerContext.storeId,
    userId: req.sellerContext.userId,
    storeName: req.sellerContext.storeName || 'My Store',
    language: req.headers['accept-language']?.includes('hi') ? 'hi' :
              req.headers['accept-language']?.includes('gu') ? 'gu' : 'en'
  };

  if (!authContext.storeId) {
    return res.status(403).json({
      success: false,
      error: 'STORE_NOT_CONFIGURED: Complete your store profile before using the AI Assistant.'
    });
  }

  try {
    const outcome = await defaultGeminiClient.chat({
      userPrompt: prompt.trim(),
      history,
      authContext
    });

    res.json({
      success: true,
      reply: outcome.reply,
      toolExecutions: outcome.toolExecutions
    });
  } catch (err) {
    console.error('Assistant chat error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal AI assistant error'
    });
  }
});

module.exports = router;
