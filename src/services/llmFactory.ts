import { GoogleGenAI, Type, Schema as GoogleSchema } from "@google/genai";
import OpenAI from "openai";
import { LlmProvider, ResponseSchema, SchemaType } from "../types";

export interface GenerateContentParams {
  model: string;
  systemInstruction?: string;
  prompt: string;
  responseSchema?: ResponseSchema; 
  responseMimeType?: string;
}

export interface GenerateContentResult {
  text: string;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface ILlmClient {
  generateContent(params: GenerateContentParams): Promise<GenerateContentResult>;
}

// --- Mapper: Generic Schema -> Google Schema ---
const mapToGoogleSchema = (schema: ResponseSchema): GoogleSchema => {
  const googleTypeMap: Record<SchemaType, Type> = {
    [SchemaType.STRING]: Type.STRING,
    [SchemaType.NUMBER]: Type.NUMBER,
    [SchemaType.INTEGER]: Type.INTEGER,
    [SchemaType.BOOLEAN]: Type.BOOLEAN,
    [SchemaType.ARRAY]: Type.ARRAY,
    [SchemaType.OBJECT]: Type.OBJECT
  };

  const out: GoogleSchema = {
    type: googleTypeMap[schema.type]
  };

  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;
  
  if (schema.properties) {
    out.properties = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      out.properties[key] = mapToGoogleSchema(prop);
    }
  }

  if (schema.items) {
    out.items = mapToGoogleSchema(schema.items);
  }

  return out;
};

// --- Google Implementation ---

class GoogleLlmClient implements ILlmClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResult> {
    const config: any = {};
    let finalPrompt = params.prompt;

    // FIX: Google's Gemma models crash if systemInstruction is set in config.
    const isGemma = params.model.toLowerCase().includes("gemma");

    if (params.systemInstruction) {
      if (isGemma) {
        finalPrompt = `SYSTEM INSTRUCTION: ${params.systemInstruction}\n\nUSER PROMPT: ${params.prompt}`;
      } else {
        config.systemInstruction = params.systemInstruction;
      }
    }

    if (params.responseSchema) {
      config.responseSchema = mapToGoogleSchema(params.responseSchema);
    }
    if (params.responseMimeType) {
      config.responseMimeType = params.responseMimeType;
    }

    try {
      const response = await this.client.models.generateContent({
        model: params.model,
        contents: finalPrompt,
        config: config,
      });

      const usage = response.usageMetadata ? {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0
      } : undefined;

      return {
        text: response.text || '',
        usage
      };
    } catch (error: any) {
      console.error("Google AI Error:", error);
      throw new Error(`Google AI Error (${params.model}): ${error.message || JSON.stringify(error)}`);
    }
  }
}

// --- Mapper: Generic Schema -> JSON Schema (OpenAI/Standard) ---
const mapToJsonSchema = (schema: ResponseSchema): any => {
  const out: any = {
    type: schema.type.toLowerCase() // JSON Schema uses lowercase types
  };

  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;

  if (schema.properties) {
    out.properties = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      out.properties[key] = mapToJsonSchema(prop);
    }
    // JSON Schema strict mode often requires additionalProperties: false
    out.additionalProperties = false;
  }

  if (schema.items) {
    out.items = mapToJsonSchema(schema.items);
  }

  return out;
};

// --- OpenRouter (OpenAI) Implementation ---

class OpenRouterLlmClient implements ILlmClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Portfolio Demo only!
    });
  }

  async generateContent(params: GenerateContentParams): Promise<GenerateContentResult> {
    const messages: any[] = [];
    
    let systemContent = params.systemInstruction || "You are a helpful AI assistant.";
    
    // Strict JSON enforcement
    if (params.responseMimeType === "application/json") {
        systemContent += `\n\nCRITICAL INSTRUCTION: You MUST respond with valid, raw JSON only. Do not wrap in markdown code blocks. Do not add explanations.`;
        
        if (params.responseSchema) {
             const jsonSchema = mapToJsonSchema(params.responseSchema);
             // We inject the schema into the system prompt because passing it to the API
             // is not supported by all OpenRouter models (especially smaller OSS ones).
             systemContent += `\n\nSchema to follow:\n${JSON.stringify(jsonSchema, null, 2)}`;
        }
    }

    messages.push({ role: "system", content: systemContent });
    messages.push({ role: "user", content: params.prompt });

    try {
      // NOTE: We deliberately do NOT use response_format: { type: "json_object" } here
      // because many OpenRouter models (Llama 3, Mistral) throw 400 errors with it.
      // We rely on the System Prompt "Vorschlaghammer" method for maximum compatibility.
      const completion = await this.client.chat.completions.create({
        model: params.model,
        messages: messages,
      });

      const choice = completion.choices[0];
      return {
        text: choice.message?.content || '',
        usage: completion.usage ? {
            input: completion.usage.prompt_tokens,
            output: completion.usage.completion_tokens,
            total: completion.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      console.error("OpenRouter Error:", error);
      const msg = error?.error?.message || error.message || "Unknown error";
      throw new Error(`OpenRouter Error (${params.model}): ${msg}`);
    }
  }
}

// --- Factory ---

export const createLlmClient = (provider: LlmProvider, apiKey?: string): ILlmClient => {
  if (provider === 'google') {
    const key = apiKey || process.env.API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!key) throw new Error("Google API Key missing.");
    return new GoogleLlmClient(key);
  } 
  else if (provider === 'openrouter') {
    const key = apiKey || process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!key) throw new Error("OpenRouter API Key missing.");
    return new OpenRouterLlmClient(key);
  }
  throw new Error(`Unsupported provider: ${provider}`);
};