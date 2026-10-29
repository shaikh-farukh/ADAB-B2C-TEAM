const { defaultRegistry } = require('./registry');
const { registerOrderTools } = require('./tools/orders');

// Ensure tools are registered
registerOrderTools(defaultRegistry);

/**
 * Masks customer phone numbers to comply with India DPDP Act 2023
 * @param {string} text
 */
function scrubPII(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/(\+?91[\s-]?)?([6-9]\d{1})\d{6}(\d{2})/g, '$1$2******$3');
}

class GeminiMcpClient {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-3.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  getApiKey() {
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }
    return key;
  }

  /**
   * Conversational turn with tool execution loop
   * @param {Object} options
   * @param {string} options.userPrompt - User prompt (text or speech transcript)
   * @param {Array} options.history - Prior conversational messages (optional)
   * @param {Object} options.authContext - { storeId, userId, storeName, language }
   * @param {string} [options.model] - Optional model override
   */
  async chat({ userPrompt, history = [], authContext, model }) {
    if (!authContext || !authContext.storeId) {
      throw new Error('authContext with valid storeId is required');
    }

    const key = this.getApiKey();
    const activeModel = model || this.model;
    const systemPrompt = `You are the ADAB Store Copilot, an expert retail operations assistant embedded in the ADAB Seller Portal for Indian kirana & retail store owners.
You speak Hindi, Gujarati, and English fluently (including Hinglish).
Your store name is "${authContext.storeName || 'My Store'}".
Your store ID is "${authContext.storeId}".
Preferred merchant language: "${authContext.language || 'en'}".

You have access to 10 real-time store management tools:
1. Customer Orders: 'adab_list_orders' (view pending/delivered orders), 'adab_update_order_state' (pack, dispatch, deliver, cancel).
2. Catalog & Stock: 'adab_check_low_stock' (find items running out), 'adab_update_stock_qty' (restock quantities), 'adab_modify_pricing' (change selling price or MRP), 'adab_toggle_listing_status' (activate/pause items).
3. Finance & Taxes: 'adab_get_sales_performance' (sales revenue, orders, AOV, net payout for today/week/month), 'adab_get_multi_slab_gstr' (GSTR-1 multi-slab tax breakdown).
4. B2B Procurement: 'adab_query_b2b_wholesalers' (search nearby wholesalers, bulk pricing, credit terms), 'adab_draft_b2b_restock_po' (draft purchase order).
5. Store Operations: 'adab_get_store_info' (check if store is open, hours, soundbox state), 'adab_update_store_status' (open/close shop, toggle soundbox).

CRITICAL OPERATIONAL RULES:
- ALWAYS invoke the appropriate tool before answering questions about orders, products, inventory, revenue, taxes, or store settings.
- Never invent or hallucinate numbers or order IDs. Rely strictly on data returned by the tools.
- Keep your conversational replies clear, polite, and actionable. Greet the merchant warmly (e.g. Namaste 🙏) if starting a conversation.
- If the merchant speaks Hindi or Gujarati, reply in their language while keeping numbers, order IDs, and monetary amounts (₹) crystal clear.`;

    const contents = [];

    // Append prior history if provided
    for (const h of history) {
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: scrubPII(h.text) }]
      });
    }

    // Append current user message (with PII scrubbing for DPDP compliance)
    contents.push({
      role: 'user',
      parts: [{ text: scrubPII(userPrompt) }]
    });

    const declarations = defaultRegistry.getGeminiFunctionDeclarations();
    const tools = declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools
    };

    // First LLM call
    const firstRes = await this._postGenerate(payload, key, activeModel);
    const candidate = firstRes.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error(`LLM Error: Empty response from Gemini API (${JSON.stringify(firstRes)})`);
    }

    const parts = candidate.content.parts || [];
    const functionCallPart = parts.find(p => p.functionCall);

    // If no tool was called, return the direct text
    if (!functionCallPart) {
      const text = parts.map(p => p.text).filter(Boolean).join('\n');
      return {
        reply: text.trim(),
        toolExecutions: []
      };
    }

    // Execute Tool Call
    const { name: toolName, args: toolArgs } = functionCallPart.functionCall;
    const toolResult = await defaultRegistry.execute(toolName, toolArgs, {
      ...authContext,
      prompt: userPrompt
    });

    // Feed tool result back to Gemini for final natural language synthesis
    contents.push({
      role: 'model',
      parts: candidate.content.parts
    });

    contents.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name: toolName,
          response: toolResult
        }
      }]
    });

    const secondPayload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools
    };

    const secondRes = await this._postGenerate(secondPayload, key, activeModel);
    const finalCandidate = secondRes.candidates?.[0];
    const finalParts = finalCandidate?.content?.parts || [];
    const finalText = finalParts.map(p => p.text).filter(Boolean).join('\n');

    return {
      reply: finalText.trim(),
      toolExecutions: [
        {
          tool: toolName,
          args: toolArgs,
          result: toolResult
        }
      ]
    };
  }

  async _postGenerate(payload, apiKey, candidateModel = this.model, retryCount = 0) {
    const url = `${this.baseUrl}/models/${candidateModel}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const isRateOrBusy = res.status === 429 || res.status === 503;

      // Model fallback cascade if primary model hits quota/busy
      if (isRateOrBusy && candidateModel === 'gemini-3.5-flash') {
        console.warn(`[GeminiClient] gemini-3.5-flash busy (HTTP ${res.status}). Cascading to gemini-2.5-flash...`);
        return this._postGenerate(payload, apiKey, 'gemini-2.5-flash', 0);
      }
      if (isRateOrBusy && candidateModel === 'gemini-2.5-flash') {
        console.warn(`[GeminiClient] gemini-2.5-flash busy (HTTP ${res.status}). Cascading to gemini-3.1-flash-lite...`);
        return this._postGenerate(payload, apiKey, 'gemini-3.1-flash-lite', 0);
      }
      if (isRateOrBusy && candidateModel === 'gemini-3.1-flash-lite') {
        console.warn(`[GeminiClient] gemini-3.1-flash-lite busy (HTTP ${res.status}). Cascading to gemini-2.5-flash-lite...`);
        return this._postGenerate(payload, apiKey, 'gemini-2.5-flash-lite', 0);
      }

      // Key failover if configured
      const backupKey = process.env.GEMINI_BACKUP_KEY;
      if (isRateOrBusy && apiKey !== backupKey && backupKey) {
        console.warn(`[GeminiClient] Primary key rate-limited. Trying backup API key...`);
        return this._postGenerate(payload, backupKey, 'gemini-2.5-flash', 0);
      }

      throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(data.error || data)}`);
    }
    return data;
  }
}

module.exports = {
  GeminiMcpClient,
  defaultGeminiClient: new GeminiMcpClient()
};
