
# LegacyRefactor AI 🚀

### Agentic Legacy-to-Cloud Transformation Pipeline
**Modernize. Secure. Scale.**

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%203.0-orange?logo=google)
![FastAPI](https://img.shields.io/badge/Target-FastAPI-009688?logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎥 See it in Action
**Watch the "Chain of Thought" agents migrate legacy PHP to Pydantic/FastAPI in real-time.**

https://github.com/user-attachments/assets/9beb99ee-f339-46d7-809e-5bc57daf3830

> *Note: The video showcases the full process including the **Auditor's security report** and **Raw LLM Logs** at the end (proving live agent interaction).*

---

## 📉 The Problem: The Silent Business Killer

In the enterprise landscape, 20-year-old legacy codebases (like the osCommerce PHP example included in this demo) represent a critical business risk. 

*   **Massive Technical Debt:** "Spaghetti code" with global variables, mixed logic/presentation, and zero type safety paralyse development teams.
*   **Security Vulnerabilities:** Deprecated patterns lead to SQL Injection, XSS, and PCI-DSS violations that modern security scanners often miss due to complex, non-standard control flows.
*   **Talent Gap:** Finding engineers willing (and able) to maintain PHP 4/5 style code is becoming impossible.

## 💡 The Solution: Multi-Agent Orchestration

**LegacyRefactor AI** is not a simple "find and replace" tool. It is an **Agentic Orchestration Engine** that simulates a full squad of senior engineers working in concert.

By leveraging **Google Gemini 3.0** (Flash/Pro) and **OpenRouter** (access to GPT-4o, Claude 3.5, Llama 3.1), the system deconstructs monolithic legacy files and reconstructs them into a pristine, modular **Python FastAPI** architecture with **Pydantic v2** strict typing.

---

## ✨ Key Features (v1.0)

### 1. 🔌 Multi-Provider "Model Mixing"
Why stick to one brain? Configure specific models for specific tasks via the **Settings Modal**.
*   Use **Gemini 3.0 Flash** for fast context analysis.
*   Switch to **GPT-4o** or **Claude 3.5 Sonnet** (via OpenRouter) for complex architectural design.
*   Use **Gemma 2 27B** or **Llama 3.1** for an unbiased security audit.

### 2. 🧩 Interactive Dependency Resolution
Legacy code is rarely a single file. 
*   If the **Analyst** detects `include('includes/functions.php')`, it halts the pipeline.
*   It prompts the user via a **Dependency Modal** to upload or paste the missing file.
*   The context is injected dynamically, ensuring the refactor is context-aware.

### 3. 🛡️ Auditor & "Paranoid Mode"
The final step isn't code generation—it's verification. The **Auditor** agent reads the original legacy code and the new Python output to:
*   Flag **Hallucinations** (missing business logic).
*   Verify security patches (e.g., ensuring `md5` is replaced with `bcrypt`).
*   Output a structured security report with severity levels.

### 4. 🔍 Deep Observability
Zero black boxes. The **LLM Logs** tab provides 100% transparency:
*   View raw prompts sent to the agents.
*   Analyze token usage, cost proxies, and latency metrics.
*   Debug the "Chain of Thought" reasoning.

---

## 🤖 The Pipeline Steps

The pipeline executes a deterministic, four-stage Chain-of-Thought (CoT) workflow:

1.  **🧠 The Analyst:** Maps business logic, variables, and identifies external dependencies.
2.  **📐 The Architect:** Designs a modular structure (Routers, Services, Schemas) based on Pydantic v2.
3.  **⚡ The Coder:** Implements the design using FastAPI and Dependency Injection.
4.  **🕵️ The Auditor:** Reviews the code for security flaws and logic gaps using a separate model context.

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons.
*   **Architecture:** Browser-native ESM (via `esm.sh` import maps)
*   **AI Core:** `@google/genai` SDK & `openai` SDK (for OpenRouter compatibility).
*   **Target Output:** Python 3.12+, FastAPI, Pydantic v2.

---

## 🚀 Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/HolgerMali/portfolio-architecture-showcase.git
    cd portfolio-architecture-showcase
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application (Development):**
    ```bash
    npm run dev
    ```
    *Open the link shown in the terminal (usually http://localhost:5173).*

### Configuration

You do not need to edit code to set API keys.

1.  Click the **Settings (Gear Icon)** in the top right.
2.  Enter your **Google Gemini API Key** (Required).
3.  (Optional) Enter your **OpenRouter API Key** to enable models like GPT-4o or Claude.
4.  Configure which model handles which step of the pipeline.

*Note: Keys are stored securely in your browser's LocalStorage.*

---

## 🧪 Demos Included

*   **osCommerce Checkout:** A classic 2012 PHP checkout logic file with mixed HTML and SQL.
*   **Admin Portal (Hard):** A simulated vulnerable login script containing SQL Injection, MD5 hashing, and logic bombs.

---

*Built with ❤️ for the future of software engineering.*
