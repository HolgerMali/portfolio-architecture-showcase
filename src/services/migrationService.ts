import { getStoredApiKey } from '../utils/settingsManager';
import { RefactorResult, AnalysisStep, AnalystPlan, FileMap, LogEntry, ModelConfig, ModelSelection, ApiKeys, SchemaType } from '../types';
import { createLlmClient } from './llmFactory';
import { PROMPTS } from './prompts';

// --- Helper Utilities ---

const cleanLlmOutput = (text: string): string => {
  // Entferne <think>...</think> Blöcke von DeepSeek/R1 Modellen
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // Entferne Markdown Code-Blöcke (falls das Modell alles in einen Block packt)
  return cleaned.replace(/```(json|python|bash)?/g, '').trim();
};

const createLog = (
  step: AnalysisStep, 
  type: LogEntry['type'], 
  content: string, 
  durationMs?: number,
  tokens?: LogEntry['tokens']
): LogEntry => ({
  step,
  type,
  content,
  timestamp: Date.now(),
  durationMs,
  tokens
});

// Robust API Key Resolution
const resolveApiKey = (provider: 'google' | 'openrouter', sessionKeys?: ApiKeys): string | undefined => {
  // 1. Try Session Keys (from UI Input)
  if (sessionKeys) {
    if (provider === 'google' && sessionKeys.google) return sessionKeys.google;
    if (provider === 'openrouter' && sessionKeys.openrouter) return sessionKeys.openrouter;
  }
  // 2. Fallback to LocalStorage
  return getStoredApiKey(provider);
};

// --- Step 1: Analyst ---
const runAnalyst = async (selection: ModelSelection, keys: ApiKeys, mainCode: string, log: (l: LogEntry) => void): Promise<AnalystPlan> => {
  const prompt = PROMPTS.ANALYST(mainCode);

  log(createLog(AnalysisStep.ANALYST, 'prompt', `Using Provider: ${selection.provider}, Model: ${selection.model}\n${prompt}`));

  const startTime = Date.now();
  
  const apiKey = resolveApiKey(selection.provider, keys);
  
  if (!apiKey) {
    throw new Error(`Missing API Key for ${selection.provider}. Please click 'Settings' (Zahnrad) and enter your Key.`);
  }

  const client = createLlmClient(selection.provider, apiKey);
  
  const response = await client.generateContent({
    model: selection.model,
    prompt: prompt,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING },
        variables: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        security_concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        migration_strategy: { type: SchemaType.STRING },
        required_files: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING },
          description: "List of filenames found in local imports/includes" 
        },
      },
      required: ["summary", "variables", "security_concerns", "migration_strategy", "required_files"],
    }
  });

  const durationMs = Date.now() - startTime;
  const rawText = cleanLlmOutput(response.text || '{}');
  log(createLog(AnalysisStep.ANALYST, 'response', rawText, durationMs, response.usage));

  try {
    return JSON.parse(rawText) as AnalystPlan;
  } catch (e: any) {
    log(createLog(AnalysisStep.ANALYST, 'error', `JSON Parse Error: ${e.message}`));
    throw new Error("Analyst failed to produce valid JSON.");
  }
};

// --- Step 2: Architect ---
const runArchitect = async (selection: ModelSelection, keys: ApiKeys, plan: AnalystPlan, allContext: FileMap, log: (l: LogEntry) => void): Promise<string> => {
  const contextStr = Object.entries(allContext)
    .map(([name, content]) => `--- FILE: ${name} ---
${content}
`)
    .join("\n");

  const prompt = PROMPTS.ARCHITECT(plan, contextStr);

  log(createLog(AnalysisStep.ARCHITECT, 'prompt', `Using Provider: ${selection.provider}, Model: ${selection.model}\n${prompt}`));

  const startTime = Date.now();
  const apiKey = resolveApiKey(selection.provider, keys);
  
  if (!apiKey) {
    throw new Error(`Missing API Key for ${selection.provider}. Check Settings.`);
  }

  const client = createLlmClient(selection.provider, apiKey);

  const response = await client.generateContent({
    model: selection.model,
    prompt: prompt,
  });

  const durationMs = Date.now() - startTime;
  const rawText = cleanLlmOutput(response.text || "Architect failed.");
  log(createLog(AnalysisStep.ARCHITECT, 'response', rawText, durationMs, response.usage));

  return rawText;
};

// --- Step 3: Coder ---
const runCoder = async (selection: ModelSelection, keys: ApiKeys, plan: AnalystPlan, architecture: string, allContext: FileMap, log: (l: LogEntry) => void): Promise<FileMap> => {
  const contextStr = Object.entries(allContext)
    .map(([name, content]) => `--- FILE: ${name} ---
${content}
`)
    .join("\n");

  const prompt = PROMPTS.CODER(architecture, contextStr);

  log(createLog(AnalysisStep.CODER, 'prompt', `Using Provider: ${selection.provider}, Model: ${selection.model}\n${prompt}`));

  const startTime = Date.now();
  const apiKey = resolveApiKey(selection.provider, keys);
  
  if (!apiKey) {
    throw new Error(`Missing API Key for ${selection.provider}. Check Settings.`);
  }

  const client = createLlmClient(selection.provider, apiKey);
  
  // We request JSON now!
  const response = await client.generateContent({
    model: selection.model,
    prompt: prompt,
    responseMimeType: "application/json", 
    // We intentionally don't force a strict schema object here to allow some flexibility,
    // but the Prompt (in PROMPTS.CODER) explicitly asks for JSON.
  });

  const durationMs = Date.now() - startTime;
  const text = response.text || '';
  log(createLog(AnalysisStep.CODER, 'response', text, durationMs, response.usage));

  const fileMap: FileMap = {};
  
  // Strategy 1: Try Parse JSON
  let jsonSuccess = false;
  try {
    const jsonRaw = cleanLlmOutput(text);
    const parsed = JSON.parse(jsonRaw);
    
    if (parsed.files && Array.isArray(parsed.files)) {
      parsed.files.forEach((f: any) => {
         if (f.filename && f.content) {
             fileMap[f.filename] = f.content;
         }
      });
      jsonSuccess = true;
    }
  } catch (e) {
    log(createLog(AnalysisStep.CODER, 'info', `Coder JSON Parse Failed: ${e}. Attempting Regex Fallback.`));
  }

  // Strategy 2: Regex Fallback (Hail Mary)
  if (!jsonSuccess || Object.keys(fileMap).length === 0) {
    const regex = new RegExp("###\\s+([a-zA-Z0-9_\\-\\.\/]+)\\s+`{3}(?:python|bash|json)?\\s*([\\s\\S]*?)`{3}", "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      const filename = match[1].trim();
      const content = match[2].trim();
      fileMap[filename] = content;
    }
  }

  if (Object.keys(fileMap).length === 0) {
    throw new Error("Coder failed to generate files. Neither JSON parser nor Regex could find valid code blocks.");
  }
    
  return fileMap;
};

// --- Step 4: Auditor ---
const runAuditor = async (selection: ModelSelection, keys: ApiKeys, originalContext: FileMap, generatedFiles: FileMap, log: (l: LogEntry) => void): Promise<any> => {
  const originalStr = Object.entries(originalContext).map(([n, c]) => `${n}: ${c.substring(0, 500)}...`).join('\n');
  const newStr = Object.entries(generatedFiles).map(([n, c]) => `--- ${n} ---
${c}`).join('\n');

  const prompt = PROMPTS.AUDITOR(originalStr, newStr);

  log(createLog(AnalysisStep.AUDITOR, 'prompt', `Using Provider: ${selection.provider}, Model: ${selection.model}\n${prompt}`));

  const startTime = Date.now();
  const apiKey = resolveApiKey(selection.provider, keys);
  
  if (!apiKey) {
    throw new Error(`Missing API Key for ${selection.provider}. Check Settings.`);
  }

  const client = createLlmClient(selection.provider, apiKey);

  const response = await client.generateContent({
    model: selection.model,
    prompt: prompt,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        comments: { type: SchemaType.STRING },
        security_issues: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              severity: { type: SchemaType.STRING, enum: ["Critical", "High", "Medium", "Low"] },
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              location: { type: SchemaType.STRING },
            },
            required: ["severity", "title", "description", "location"],
          },
        },
      },
      required: ["comments", "security_issues"],
    }
  });

  const durationMs = Date.now() - startTime;
  const rawText = cleanLlmOutput(response.text || '{}');
  log(createLog(AnalysisStep.AUDITOR, 'response', rawText, durationMs, response.usage));

  return JSON.parse(rawText);
};

// --- Pipeline Functions ---

export const startAnalysis = async (
  mainCode: string,
  modelConfig: ModelConfig,
  apiKeys: ApiKeys,
  onProgress: (step: AnalysisStep) => void,
  onLog: (entry: LogEntry) => void
): Promise<{ plan: AnalystPlan, needsFiles: boolean }> => {
  try {
    onProgress(AnalysisStep.ANALYST);
    const plan = await runAnalyst(modelConfig[AnalysisStep.ANALYST], apiKeys, mainCode, onLog);
    
    const needsFiles = plan.required_files && plan.required_files.length > 0;
    
    return { plan, needsFiles };
  } catch (error) {
    console.error("Analysis Failed:", error);
    onProgress(AnalysisStep.ERROR);
    throw error;
  }
};

export const completeMigration = async (
  plan: AnalystPlan,
  allContext: FileMap,
  modelConfig: ModelConfig,
  apiKeys: ApiKeys,
  onProgress: (step: AnalysisStep) => void,
  onLog: (entry: LogEntry) => void
): Promise<RefactorResult> => {
  try {
    onProgress(AnalysisStep.ARCHITECT);
    const arch = await runArchitect(modelConfig[AnalysisStep.ARCHITECT], apiKeys, plan, allContext, onLog);

    onProgress(AnalysisStep.CODER);
    const generatedFiles = await runCoder(modelConfig[AnalysisStep.CODER], apiKeys, plan, arch, allContext, onLog);

    onProgress(AnalysisStep.AUDITOR);
    const auditResult = await runAuditor(modelConfig[AnalysisStep.AUDITOR], apiKeys, allContext, generatedFiles, onLog);

    onProgress(AnalysisStep.COMPLETE);

    return {
      plan,
      generatedFiles,
      securityReport: auditResult.security_issues || [],
      auditorComments: auditResult.comments || "Audit completed.",
      modelConfig: modelConfig
    };
  } catch (error) {
     console.error("Migration Completion Failed:", error);
     onProgress(AnalysisStep.ERROR);
     throw error;
  }
};