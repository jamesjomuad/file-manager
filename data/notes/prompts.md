<!-- ✅ Tip: After generating it once, start every AI session with: -->
Read /docs/ai/AI_CONTEXT.md before generating any code.
<!-- This makes the AI behave like it already knows your project. -->


<!-- Prompt to Generate /docs/ai Structure -->
You are a senior software architect.

Analyze this repository and generate an AI documentation system inside:

/docs/ai

Create the following files:

/docs/ai/AI_CONTEXT.md
/docs/ai/ARCHITECTURE.md
/docs/ai/SYSTEM_MODULES.md
/docs/ai/CODE_GUIDELINES.md
/docs/ai/API_SPEC.md
/docs/ai/CODEBASE_SUMMARY.md

Instructions:

1. Scan the entire repository structure.
2. Identify the framework, architecture, and modules.
3. Document backend and frontend responsibilities.
4. Summarize important models, services, and controllers.
5. Detect API endpoints from route definitions.
6. Describe the system architecture and data flow.

File requirements:

AI_CONTEXT.md
- Entry point for AI assistants
- Instructions for how to read the rest of the documentation

ARCHITECTURE.md
- High level architecture
- Data flow
- Technology stack
- Integration points

SYSTEM_MODULES.md
- Main business modules
- Responsibilities of each module

CODE_GUIDELINES.md
- Coding standards
- Architectural rules
- Folder responsibilities

API_SPEC.md
- API endpoints
- Request/response examples

CODEBASE_SUMMARY.md
- Summary of important folders
- Core models
- Core services
- Core controllers

Output format:

Provide the complete file contents for each file so they can be directly saved in the repository.

Do not rewrite application code.
Focus only on documentation for AI understanding.

<!------------------------ End ------------------------>



<!-- Even Better Version (Repository-Aware) -->
Analyze the repository before answering.

Then generate an AI context system inside /docs/ai.

Goal:
Allow AI assistants to understand the codebase in under 30 seconds.

Steps:

1. Inspect the project structure.
2. Detect frameworks and libraries.
3. Identify main modules and business logic.
4. Extract API endpoints.
5. Summarize architecture.

Then generate these files:

- /docs/ai/AI_CONTEXT.md
- /docs/ai/ARCHITECTURE.md
- /docs/ai/SYSTEM_MODULES.md
- /docs/ai/CODE_GUIDELINES.md
- /docs/ai/API_SPEC.md
- /docs/ai/CODEBASE_SUMMARY.md

Each file must be production-quality documentation.
<!-- End -->


<!-- Pro Prompt (Best for Large Projects) -->
Act as a senior staff engineer documenting a production system.

Create an AI-readable documentation system for this repository.

The goal is to allow AI coding assistants to instantly understand:

- system architecture
- modules
- API endpoints
- coding conventions
- repository layout

Generate the documentation inside:

/docs/ai

Files required:

AI_CONTEXT.md
ARCHITECTURE.md
SYSTEM_MODULES.md
CODE_GUIDELINES.md
API_SPEC.md
CODEBASE_SUMMARY.md

Ensure:

- concise but complete documentation
- no duplication
- easy for AI parsing
- clear module boundaries
<!-- End -->


