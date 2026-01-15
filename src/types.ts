export enum AnalysisStep {
  IDLE = 'IDLE',
  ANALYST = 'ANALYST',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  ARCHITECT = 'ARCHITECT',
  CODER = 'CODER',
  AUDITOR = 'AUDITOR',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface SecurityIssue {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  location: string;
}

export type LlmProvider = 'google' | 'openrouter';

export interface ApiKeys {
  google: string;
  openrouter: string;
}

export interface ModelSelection {
  provider: LlmProvider;
  model: string;
}

export interface ModelConfig {
  [AnalysisStep.ANALYST]: ModelSelection;
  [AnalysisStep.ARCHITECT]: ModelSelection;
  [AnalysisStep.CODER]: ModelSelection;
  [AnalysisStep.AUDITOR]: ModelSelection;
}

export interface AnalystPlan {
  summary: string;
  variables: string[];
  security_concerns: string[];
  migration_strategy: string;
  required_files: string[];
}

export type FileMap = Record<string, string>;

export interface RefactorResult {
  plan: AnalystPlan;
  generatedFiles: FileMap;
  securityReport: SecurityIssue[];
  auditorComments: string;
  modelConfig?: ModelConfig;
}

export interface LogEntry {
  step: AnalysisStep;
  type: 'prompt' | 'response' | 'info' | 'error';
  content: string;
  timestamp: number;
  durationMs?: number;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

export enum Tab {
  INPUT = 'INPUT',
  PLAN = 'PLAN',
  CODE = 'CODE',
  SECURITY = 'SECURITY',
  LOGS = 'LOGS'
}

// --- Generic Schema Definitions (Vendor Agnostic) ---

export enum SchemaType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT'
}

export interface ResponseSchema {
  type: SchemaType;
  description?: string;
  properties?: Record<string, ResponseSchema>;
  items?: ResponseSchema;
  enum?: string[];
  required?: string[];
}