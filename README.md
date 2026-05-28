# 🏗️ Architex

*An intelligent, multi-stage compiler pipeline that transforms natural language into perfectly synchronized, production-ready application configurations.*

**Developed by Alok Singh**

---

## 🚀 The Vision

Modern LLMs are excellent at writing code, but they struggle with **cross-layer structural consistency**. When asked to generate a full application configuration in a single prompt, standard models hallucinate database fields, create broken API references, and mix up authentication rules. 

**Architex** solves this by stepping away from the standard "single-prompt wrapper" approach and going under the hood. It treats natural language as source code and processes it through a strict, 4-stage architecture modeled after a traditional software compiler:

1. **Intent Extraction (Lexer):** Parses plain English into structured entities, features, and roles.
2. **System Design (Parser):** Maps the architecture into pages, API groups, and database tables.
3. **Schema Generation (Semantic Analysis):** Builds the full JSON schema using the design blueprint.
4. **Validation & Repair (Linker):** A surgical repair engine that cross-checks the UI, API, DB, and Auth layers, automatically re-prompting only the broken layers until absolute consistency is achieved.

## ✨ Key Features

* **Surgical Repair Engine:** Unlike brute-force retry mechanisms, Architex identifies exact Pydantic v2 validation failures and re-prompts *only* the specific failing layer, saving tokens and reducing latency.
* **Strict Schema Contracts:** Cross-layer references (e.g., ensuring an API endpoint calls a field that actually exists in the database) are enforced at the model level.
* **Cost-Optimized Routing:** Utilizes faster, cheaper models (like Claude Haiku) for extraction and design, while routing complex schema generation and targeted repairs to more capable models (like Claude Sonnet).
* **Transparent Assumptions:** Every default architectural decision made by the system is explicitly documented in the final output.