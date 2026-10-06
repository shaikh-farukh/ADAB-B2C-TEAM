/**
 * Service to handle LLM interactions via Groq API.
 * Defines tools for Command & Control actions with guardrails.
 */

const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
};

// Tools definitions
export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navigates the user to a specific page based on their natural language request. Use this for 'Read' or 'Open' actions.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "The target page. Valid options: 'dashboard', 'products', 'orders', 'requests', 'profile', 'signup', 'login'.",
            enum: ["dashboard", "products", "orders", "requests", "profile", "signup", "login"]
          }
        },
        required: ["target"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "start_registration",
      description: "Starts the registration flow by navigating to the signup page and optionally passing extracted user details.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "The user's email if provided." },
          company_name: { type: "string", description: "The user's company name if provided." },
          role: { type: "string", enum: ["manufacturer", "distributor"], description: "The user's desired role if provided." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_update_profile",
      description: "Proposes an update to the user's profile. This triggers a confirmation UI for safety.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string" },
          owner_name: { type: "string" },
          mobile: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_place_order",
      description: "Proposes placing a new order based on user input. This triggers a confirmation UI.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          quantity: { type: "number" }
        },
        required: ["quantity"]
      }
    }
  }
];

export const aiService = {
  async chat(messages: Message[]) {
    if (!GROQ_API_KEY) {
      throw new Error("Missing VITE_GROQ_API_KEY in environment");
    }

    const payload = {
      model: "llama-3.1-8b-instant", // Fast and cheap model on Groq, capable of tool calling
      messages: [
        {
          role: "system",
          content: "You are the ADAB AI Assistant. You help users navigate the B2B portal, place orders, update their profiles, and register. You can execute actions on behalf of the user using tools. Always try to match user intent to a tool if applicable."
        },
        ...messages
      ],
      tools: AI_TOOLS,
      tool_choice: "auto",
    };

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API Error:", errorText);
        throw new Error(`Groq API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message;
    } catch (error) {
      console.error("Failed to communicate with AI:", error);
      throw error;
    }
  }
};
