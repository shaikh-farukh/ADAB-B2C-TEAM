const { defaultRegistry } = require('./registry');
const { registerOrderTools } = require('./tools/orders');

// Ensure tools are registered
registerOrderTools(defaultRegistry);

class GeminiMcpClient {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = 'gemini-3.5-flash') {
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
   */
  async chat({ userPrompt, history = [], authContext }) {
    if (!authContext || !authContext.storeId) {
      throw new Error('authContext with valid storeId is required');
    }

    const key = this.getApiKey();
    const systemPrompt = `You are the ADAB Store Copilot, an intelligent retail assistant embedded in the ADAB Seller Portal for Indian kirana store owners.
You speak Hindi, Gujarati, and English fluently.
Your store name is "${authContext.storeName || 'My Store'}".
Your store ID is "${authContext.storeId}".
Preferred merchant language: "${authContext.language || 'en'}".

When the user asks you to check orders or update order statuses, ALWAYS invoke the appropriate tool.
After calling a tool, provide a clear, concise, friendly summary with key details (order IDs, amounts, customer names).
Never invent fake orders; rely entirely on tool outputs.`;

    const contents = [];

    // Append prior history if provided
    for (const h of history) {
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    const declarations = defaultRegistry.getGeminiFunctionDeclarations();
    const tools = declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools
    };

    // First LLM call
    const firstRes = await this._postGenerate(payload, key);
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
    const toolResult = await defaultRegistry.execute(toolName, toolArgs, authContext);

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

    const secondRes = await this._postGenerate(secondPayload, key);
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

  async _postGenerate(payload, apiKey) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(data.error || data)}`);
    }
    return data;
  }
}

module.exports = {
  GeminiMcpClient,
  defaultGeminiClient: new GeminiMcpClient()
};
