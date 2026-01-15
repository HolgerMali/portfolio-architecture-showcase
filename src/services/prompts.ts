
import { AnalystPlan, FileMap } from '../types';

export const PROMPTS = {
  ANALYST: (mainCode: string) => `
    Act as an expert Legacy Code Analyst.
    Analyze the following Legacy Code (PHP or Python) which is the main entry point. 
    
    1. Understand the business logic.
    2. Identify ALL external local file dependencies.
       - For PHP: 'include', 'require', 'include_once', 'require_once'.
       - For Python: 'import module', 'from module import ...' (exclude standard library and third-party packages).
    3. Map variables and security flaws.
    4. Outline a migration strategy to a modular FastAPI architecture.

    Legacy Code:
    ${mainCode}
  `,

  ARCHITECT: (plan: AnalystPlan, contextStr: string) => `
    Act as a Senior Software Architect.
    Design a Modular Python/FastAPI architecture based on the analysis.
    
    Instead of one large file, plan for a modular structure:
    - models.py (Pydantic models)
    - schemas.py (Request/Response schemas)
    - services.py (Business logic)
    - routers.py (API Endpoints)
    - dependencies.py (Auth, DB, etc.)
    - main.py (App entry)

    Output a text description of the modules and their responsibilities.
    
    Analysis Plan:
    ${JSON.stringify(plan)}

    Source Code Context:
    ${contextStr}
  `,

  CODER: (architecture: string, contextStr: string) => `
    Act as a Senior Python Backend Developer.
    Implement the planned Modular FastAPI architecture.
    
    Rules:
    1. Use Pydantic v2.
    2. Use FastAPI dependency injection.
    3. Ensure code is production-ready.
    4. Output STRICT JSON format.

    Architecture Plan:
    ${architecture}

    Legacy Source Context:
    ${contextStr}

    Response Format (JSON):
    {
      "files": [
        {
          "filename": "main.py",
          "content": "from fastapi import FastAPI..."
        },
        ...
      ]
    }
  `,

  AUDITOR: (originalStr: string, newStr: string) => `
    You are a paranoid Security Auditor. Audit the migration from Legacy Code (PHP or Python) to Modular Python. 
    Flag MISSING business logic, Verify Security fixes, Check for correct module imports. 
    Focus 90% of your attention on the NEW Python code. 
    Only reference the Legacy Code to confirm that old vulnerabilities have been fixed. 
    Do NOT list legacy vulnerabilities as current issues if they are fixed in Python. 
    Find NEW issues introduced by the migration.
    
    Legacy Summaries:
    ${originalStr}

    New Modular Python:
    ${newStr}
    
    Output your report strictly in JSON format.
  `
};
