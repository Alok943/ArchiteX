# ArchiteX — Project Documentation

> **Natural Language → App Config Compiler**
> A multi-stage AI pipeline that transforms plain English into structurally consistent, cross-referenced application configurations.

---

## Table of Contents

- [1. Vision & Motivation](#1-vision--motivation)
- [2. Core Architecture](#2-core-architecture)
- [3. Pipeline Deep Dive](#3-pipeline-deep-dive)
- [4. Validation System](#4-validation-system)
- [5. Repair Engine](#5-repair-engine)
- [6. LLM Strategy](#6-llm-strategy)
- [7. Frontend Application](#7-frontend-application)
- [8. Deployment Architecture](#8-deployment-architecture)
- [9. Evaluation Framework](#9-evaluation-framework)
- [10. Known Limitations](#10-known-limitations)
- [11. Future Roadmap](#11-future-roadmap)

---

## 1. Vision & Motivation

### The Problem

When you ask an LLM to "build me a task management app with auth and teams," it will generate code — but that code will be internally **inconsistent**:

- An API endpoint references `users.team_id`, but the `users` table has no `team_id` field
- A UI page binds to `/api/tasks`, but the endpoint is actually named `/api/v1/task-list`
- Auth rules grant the `admin` role access to a `ManageTeams` page that was never created
- The prompt asked for analytics, but no chart components exist anywhere

These are not hallucinations. They are **cross-layer reference errors** — the exact same class of bugs that compilers catch with linker passes. LLMs have no linker.

### The Insight

ArchiteX treats natural-language-to-config generation as a **compiler problem**, not a prompt engineering problem. Instead of one giant prompt that tries to do everything, ArchiteX decomposes the task into four discrete stages — each with its own specialized prompt, output schema, and validation layer.

The key innovation is the **two-tier validation + surgical repair loop**: 6 structural validators (enforced by Pydantic model validators) ensure cross-layer references are correct, while 7 business validators (custom Python functions) ensure the output actually satisfies the user's intent. When validation fails, the repair engine sends only the specific errors back to the LLM for surgical fixes — never regenerating the entire schema.

---

## 2. Core Architecture

```
                    ┌───────────────────────┐
                    │   Natural Language     │
                    │   User Prompt          │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Stage 1: INTENT      │  Gemini 2.5 Flash Lite
                    │  (Lexer)              │
                    │                       │
                    │  Extracts:            │
                    │  • Entities           │
                    │  • Roles              │
                    │  • Features           │
                    │  • Access Rules       │
                    │  • Assumptions        │
                    └───────────┬───────────┘
                                │ IntentOutput (Pydantic)
                    ┌───────────▼───────────┐
                    │  Stage 2: DESIGN      │  Gemini 2.5 Flash Lite
                    │  (Parser)             │
                    │                       │
                    │  Maps to:             │
                    │  • Pages              │
                    │  • API Groups         │
                    │  • DB Tables          │
                    │  • User Flows         │
                    │  • Premium Gates      │
                    └───────────┬───────────┘
                                │ DesignOutput (Pydantic)
                    ┌───────────▼───────────┐
                    │  Stage 3: SCHEMA      │  Gemini 3.1 Flash Lite
                    │  (Semantic Analysis)   │
                    │                       │
                    │  Generates:           │
                    │  • db_schema          │
                    │  • api_schema         │
                    │  • ui_schema          │
                    │  • auth_rules         │
                    └───────────┬───────────┘
                                │ Raw JSON dict (unvalidated)
                    ┌───────────▼───────────┐
                    │  Stage 4: VALIDATE    │  Gemini 3.1 Flash Lite
                    │  + REPAIR (Linker)    │
                    │                       │
                    │  • 6 structural rules │
                    │  • 7 business rules   │
                    │  • Up to 3 repair     │
                    │    iterations         │
                    └───────────┬───────────┘
                                │ AppConfig (validated)
                    ┌───────────▼───────────┐
                    │   Production-Ready    │
                    │   Application Config  │
                    └───────────────────────┘
```

### Output Schema — Four Synchronized Layers

The final `AppConfig` contains four layers that are **cross-referenced by design**:

| Layer | Model | Contents |
|-------|-------|----------|
| `db_schema` | `list[DBTable]` | Tables with typed fields, primary keys, foreign keys |
| `api_schema` | `list[APIEndpoint]` | REST endpoints with method, auth, request/response fields |
| `ui_schema` | `list[UIPage]` | Pages with routes, role access, bound UI components |
| `auth_rules` | `list[AuthRule]` | Role-based access control for pages and endpoints |

**Cross-references enforced:**
- Every API `request_fields` / `response_fields` entry → must exist as `table.field` in `db_schema`
- Every UI component `bound_api` → must match an `APIEndpoint.path`
- Every `AuthRule.allowed_pages` → must match a `UIPage.name`
- Every `AuthRule.allowed_endpoints` → must match an `APIEndpoint.path`
- Every role in API endpoints → must be defined in `auth_rules`
- Role-restricted pages → their bound endpoints must have `auth_required: true`

---

## 3. Pipeline Deep Dive

### Stage 1 — Intent Extraction

**File:** `backend/app/pipeline/stage1_intent.py`
**Model:** `gemini-2.5-flash-lite`
**Purpose:** Parse natural language into structured intent.

The system prompt instructs the LLM to act as an "expert software architect specializing in intent extraction." Key rules:
- Extract atomic features (e.g., `"auth"`, not `"auth and dashboard"`)
- Always include at least one role (default: `["user"]`)
- If the prompt is too vague, set `clarification_needed: true` with specific questions
- Make reasonable assumptions and document them

**Output schema (`IntentOutput`):**
```python
{
    "entities": ["user", "task", "project"],
    "roles": ["user", "admin"],
    "features": ["auth", "task_management", "project_management"],
    "access_rules": [{"feature": "task_management", "allowed_roles": ["user", "admin"]}],
    "assumptions": ["Users can only see their own tasks"],
    "clarification_needed": false,
    "clarification_questions": []
}
```

### Stage 2 — System Design

**File:** `backend/app/pipeline/stage2_design.py`
**Model:** `gemini-2.5-flash-lite`
**Purpose:** Convert structured intent into concrete architecture.

Rules enforced in the prompt:
- Every feature → at least one page + one API group
- Every role → at least one accessible page
- DB table names must be `snake_case`
- API endpoints must start with `/api/`
- Premium/payment features → added to `premium_gated` array

**Output schema (`DesignOutput`):**
```python
{
    "pages": ["Dashboard", "TaskList", "Login"],
    "api_groups": [{"name": "tasks", "endpoints": ["/api/tasks"]}],
    "db_tables": [{"name": "tasks", "relates_to": ["users"]}],
    "flows": ["user_login", "create_task"],
    "premium_gated": []
}
```

### Stage 3 — Schema Generation

**File:** `backend/app/pipeline/stage3_schema.py`
**Model:** `gemini-3.1-flash-lite` (heavier model — this is the most complex stage)
**Purpose:** Generate the complete `AppConfig` JSON from intent + design.

This stage has the **most detailed system prompt** in the pipeline, with explicit rules for cross-layer consistency:
- Every DB table must have exactly one PK field named `"id"` of type `"uuid"`
- API fields must use `"table.field"` format
- Every `UIComponent.bound_api` must match an `APIEndpoint.path` exactly
- Auth rules must be consistent with roles used in API endpoints

**Token limit:** 8192 (vs 4096 default) — the output is a large JSON object.

**Key design decision:** Stage 3 returns a **raw dict**, not a validated Pydantic model. Validation is entirely deferred to Stage 4. This separation means the LLM can produce "close enough" output that the repair engine can fix, rather than failing hard.

### Stage 4 — Validation + Repair

**File:** `backend/app/pipeline/stage4_repair.py`
**Purpose:** Validate the raw schema and surgically repair any inconsistencies.

This is the most complex stage. See sections 4 and 5 below for details.

---

## 4. Validation System

ArchiteX uses a **two-tier validation system**: structural validators (Pydantic) and business validators (custom Python).

### Tier 1 — Structural Validators (Pydantic)

Defined as `@model_validator(mode="after")` on the `AppConfig` class in `backend/app/schemas/output.py`.

| ID | Validator Name | What It Enforces |
|----|---------------|------------------|
| R1 | `api_fields_exist_in_db` | Every API `request_fields` / `response_fields` entry references a real `table.field` in `db_schema` |
| R2 | `ui_bound_apis_exist` | Every `UIComponent.bound_api` matches an `APIEndpoint.path` |
| R3 | `auth_pages_exist` | Every `AuthRule.allowed_pages` entry matches a `UIPage.name` |
| R4 | `auth_endpoints_exist` | Every `AuthRule.allowed_endpoints` entry matches an `APIEndpoint.path` |
| R5 | `roles_are_consistent` | Every role used in API `roles` field is defined in `auth_rules` |
| R6 | `gated_pages_require_auth` | Role-restricted pages (roles ≠ `["public"]`) must have `auth_required=True` on bound endpoints |

Additionally, each `DBTable` has a per-model validator `must_have_primary_key` ensuring at least one field has `is_pk: true`.

### Tier 2 — Business Validators (Custom)

Defined in `backend/app/pipeline/business_validators.py`. These are **intent-aware** — they only fire when the user's prompt actually requests the relevant capability.

| # | Function | Rule Name | Intent-Aware? | Description |
|---|----------|-----------|---------------|-------------|
| 1 | `validate_feature_coverage` | `FEATURE_COVERAGE` | Yes | Every feature from intent exists somewhere in the schema |
| 2 | `validate_entity_coverage` | `ENTITY_API_MISSING` | Yes | Every entity has API endpoints |
| 3 | `validate_entity_coverage` | `ENTITY_UI_MISSING` | Yes | Every entity has UI pages |
| 4 | `validate_crud_completeness` | `CRUD_MISSING` | Yes | Every entity has full CRUD (GET/POST/PUT/DELETE) |
| 5 | `validate_fk_references` | `FK_REFERENCE_INVALID` | No (always) | FK references point to existing tables and fields |
| 6 | `validate_premium_gating` | `PREMIUM_GATING_MISSING` | Yes | Premium features → premium role in auth_rules |
| 7 | `validate_analytics` | `ANALYTICS_INCOMPLETE` | Yes | Analytics features → chart components in UI |
| 8 | `validate_auth_completeness` | `AUTH_INCOMPLETE` | Yes | Auth features → login/register endpoints + pages |

**Intent awareness** is implemented via a `_wants(intent, keywords)` helper that checks if any keyword appears in any intent feature using stemmed fuzzy matching. For example, `validate_premium_gating` only runs if the intent contains features matching `["premium", "paid", "subscription", "pro", "payment", "plan"]`.

**Stemming** is implemented via `_stems(word)` which generates variants by stripping common suffixes (`-ment`, `-tion`, `-ing`, `-ness`, `-ity`, `-able`, `-ible`, `-ed`, `-er`, `-es`, `-s`).

**Read-only exemptions:** Entities matching patterns like `report`, `analytic`, `audit`, `log`, `metric` are only required to have GET endpoints, not full CRUD.

**System tables excluded:** `sessions`, `migrations`, `logs`, `audit_logs`, `tokens`, `refresh_tokens` are skipped during entity coverage checks.

### Validation Error Format

```python
{
    "rule": "ENTITY_API_MISSING",
    "layer": "api",           # db | api | ui | auth | global
    "message": "'landlords' exists in DB but has no API endpoint",
    "field": "landlords"      # optional
}
```

---

## 5. Repair Engine

**File:** `backend/app/pipeline/stage4_repair.py`

The repair engine is the core differentiator of ArchiteX. When validation fails, it doesn't regenerate the entire schema — it sends **only the specific errors** back to the LLM for surgical fixes.

### Repair Loop (max 3 iterations)

```
Attempt 1:
  ├── Try Pydantic validation (structural)
  │   ├── PASS → Run business validators
  │   │           ├── PASS → Return validated AppConfig ✅
  │   │           └── FAIL → Send business errors to LLM for repair
  │   └── FAIL → Send structural errors to LLM for repair
  │
Attempt 2:
  ├── Same as above with repaired config
  │
Attempt 3 (final):
  ├── Same validation
  │   ├── PASS → Return ✅
  │   └── FAIL → Return best-effort config with errors documented
  │              (uses model_construct() to bypass Pydantic validation)
```

### Repair Prompt Strategy

The repair system prompt has strict rules:
- **Never introduce features, roles, or pages not in the original intent**
- **Surgical fixes only** — minimum changes to resolve errors
- Auth reference resolution follows a priority order:
  1. **PREFER:** Create missing pages/endpoints if clearly implied by the role
  2. **FALLBACK:** Remove invalid references
  3. **NEVER:** Leave dangling references

### Separate Prompts for Different Error Types

- **Structural errors** (Pydantic failures): Prompt includes the specific Pydantic error locations and messages
- **Business errors** (custom validator failures): Prompt includes the rule names, layers, and descriptive messages

### Graceful Degradation

If all 3 repair attempts fail:
- `AppConfig.model_construct()` bypasses Pydantic validation
- Returns the best-effort config with `validation_errors` array populated
- The frontend displays these errors in the Validation Engine page
- The `retry_count` field documents how many attempts were made

---

## 6. LLM Strategy

### Model Selection

| Stage | Primary Model | Rationale |
|-------|--------------|-----------|
| 1 — Intent | `gemini-2.5-flash-lite` | Simple classification task |
| 2 — Design | `gemini-2.5-flash-lite` | Structured but lightweight mapping |
| 3 — Schema | `gemini-3.1-flash-lite` | Complex generation, must be precise |
| 4 — Repair | `gemini-3.1-flash-lite` | Reasoning about structural errors |

### Automatic Fallback

If Gemini fails (network error, API quota, malformed response), the system automatically falls back to **Zhipu GLM** (`glm-4.7-lite`) via the OpenAI-compatible API at `https://open.bigmodel.cn/api/paas/v4/`.

### Structured Output

- Gemini: Uses `response_mime_type: "application/json"` for guaranteed JSON output
- Zhipu: Uses `response_format: {"type": "json_object"}`
- Safety fallback: Strips markdown code fences (` ```json...``` `) if present

---

## 7. Frontend Application

### Design System — "Kinetic Infrastructure"

A custom dark-mode design system built on Material Design 3 principles:

| Aspect | Implementation |
|--------|---------------|
| **Color Scheme** | MD3 Dark — primary blue (#b0c6ff) → purple (#d2bbff) gradient, neon cyan (#00daf8) accents |
| **Surface Hierarchy** | 5-level depth: #0e0e10 → #1b1b1d → #1f1f21 → #2a2a2c → #353437 |
| **Typography** | Geist (UI text), JetBrains Mono (code/labels) |
| **Effects** | Glassmorphism (backdrop-blur), inner glows, neon focus rings, gradient text |
| **Animations** | Flowing SVG dashed lines, pulsing status dots, hover lifts, fade-in page transitions |
| **Responsive** | Mobile bottom nav → tablet icon sidebar (64px) → desktop expandable sidebar (240px on hover) |

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | 6-stage pipeline visualization, KPI metrics, recent job history |
| **Playground** | `/playground` | Interactive compilation sandbox with SSE streaming, real-time stage progress |
| **Validation** | `/validation` | Error inspector with tagged violation cards, terminal-style repair engine log |
| **Metrics** | `/metrics` | Consistency score (7-dimension breakdown), latency charts, error distribution |

### SSE Streaming

The Playground uses `fetch()` + `ReadableStream` (not `EventSource`) because SSE requires a POST request. The stream is processed chunk-by-chunk with a text buffer that splits on `\n\n` boundaries. Each parsed event updates the 4-stage progress tracker in real-time.

### Client-Side History

All compilation results are stored in `localStorage` under the key `architex_history` (max 50 entries, FIFO). This powers the Dashboard metrics, Validation error inspector, and Metrics analytics — all without any server-side persistence.

---

## 8. Deployment Architecture

```
┌──────────────────┐          ┌──────────────────────┐
│                  │          │                      │
│   Vercel CDN     │  HTTPS   │  Hugging Face Space  │
│   (Frontend)     │ ───────▶ │  (Backend Docker)    │
│                  │          │                      │
│   React + Nginx  │          │  FastAPI + Uvicorn   │
│   Port 80        │          │  Port 7860           │
│                  │          │                      │
└──────────────────┘          └──────────────────────┘
  architex-app.                 alok8732-architex.
  vercel.app                    hf.space

  Build-time env:               Runtime secrets:
  VITE_API_URL ──────────────▶  GEMINI_API_KEY
                                ZHIPU_API_KEY
                                ALLOWED_ORIGINS
```

### Docker Configuration

| Service | Base Image | Port | Purpose |
|---------|-----------|------|---------|
| Backend | `python:3.11-slim` | 7860 (HF standard) | FastAPI server, non-root user (UID 1000) |
| Frontend | `node:20-alpine` → `nginx:alpine` | 80 | Multi-stage build, gzip + SPA routing |

### Local Development with Docker Compose

```bash
docker compose up --build -d
# Backend  → http://localhost:8000  (maps 8000 → 7860)
# Frontend → http://localhost:3000  (maps 3000 → 80)
```

---

## 9. Evaluation Framework

**Directory:** `evaluation/`

The evaluation framework (work-in-progress) provides automated quality assessment:

- **`evaluate.py`** — Pipeline evaluation harness that runs test prompts through the compiler and measures output quality
- **`metrics.py`** — Scoring functions for structural consistency, feature coverage, and schema correctness
- **`datasets/`** — Curated test prompts of varying complexity
- **`results/`** — Evaluation output storage

---

## 10. Known Limitations

| Limitation | Description | Impact |
|-----------|-------------|--------|
| **No persistent storage** | History is localStorage-only; no database | History lost on browser clear |
| **HF Space cold starts** | Free Spaces sleep after 48h inactivity | First request after sleep takes ~20s |
| **Model selector is cosmetic** | The frontend dropdown doesn't change the backend model | Backend always uses its configured model map |
| **No authentication** | The app has no user login or API keys | Anyone can use the deployed instance |
| **Single-user history** | localStorage is per-browser, not per-user | No cross-device history |
| **No syntax highlighting** | CodeBlock renders plain text | JSON output lacks color coding |
| **Prompt templates** | `prompts/` directory is empty (prompts are inlined) | Harder to A/B test different prompts |
| **Evaluation WIP** | The evaluation framework exists but is not fully integrated | No automated CI quality checks |

---

## 11. Future Roadmap

### Near-Term (High Priority)

#### 🔧 Externalize System Prompts
Move inlined LLM prompts from pipeline stage files to `prompts/system_prompts.py`. This enables:
- A/B testing different prompt strategies
- Version-controlled prompt iteration
- Per-model prompt customization

#### 📊 Full Intermediate Stage Tabs
Show the raw output of each pipeline stage (Intent, Design, Schema) in the Playground, not just the final config. The SSE stream already carries this data — it just needs UI tabs.

#### 🎨 Validation Severity Colors
Color-code validation errors by severity in the Validation Engine:
- 🔴 **Critical** — structural breaks (FK invalid, bound_api missing)
- 🟡 **Warning** — coverage gaps (feature not implemented, CRUD missing)
- 🔵 **Info** — suggestions (assumptions made, defaults applied)

#### 📈 Status Bar
A persistent footer showing system health:
- `Gemini Online` / `Gemini Down → GLM Fallback Active`
- Validator status
- Current model being used

### Mid-Term (Medium Priority)

#### 🧪 Automated Evaluation Pipeline
Integrate `evaluation/` into CI:
- Run a curated set of prompts on every backend change
- Measure consistency scores, repair rates, and latency
- Block merges if quality drops below threshold

#### 💾 Server-Side History
Replace localStorage with a lightweight DB (SQLite or Supabase):
- Cross-device history
- Shareable compilation results via URLs
- Aggregate analytics across all users

#### 🔌 Code Generation Stage (Stage 5)
Extend the pipeline to generate actual code from the validated `AppConfig`:
- Database migrations (SQL / Prisma / SQLAlchemy)
- API route stubs (Express / FastAPI / Django)
- UI component scaffolding (React / Next.js)

#### 🧠 Multi-Model Routing
Make the model selector functional:
- Route different stages to different providers based on user selection
- Support Claude, GPT-4, Llama, and local models via Ollama
- Cost-aware routing (cheaper models for simple stages)

### Long-Term (Exploratory)

#### 🔄 Iterative Refinement
Allow users to modify the generated schema and re-run validation:
- Edit individual fields, tables, or endpoints
- Add constraints or business rules
- Re-validate without re-generating

#### 📝 Natural Language Feedback Loop
Let users provide feedback in natural language:
- "Add a notifications table"
- "Remove the admin role"
- "Make the analytics page public"

The system would parse the feedback, identify the affected layers, and surgically update the schema.

#### 🌐 Multi-App Composition
Generate configs for multi-service architectures:
- Microservice decomposition from a monolith prompt
- Shared auth across services
- API gateway configuration
- Inter-service communication schemas

#### 🧬 Schema Diffing
Compare two compilations of the same prompt:
- Show what changed between versions
- Highlight improvements in consistency score
- Track prompt iteration effectiveness

---

## Appendix: Key File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/schemas/output.py` | ~180 | AppConfig schema + 6 structural validators |
| `backend/app/pipeline/business_validators.py` | ~300 | 7 intent-aware business rules |
| `backend/app/pipeline/stage4_repair.py` | ~170 | Surgical repair engine |
| `backend/app/core/llm_client.py` | ~90 | Dual-LLM abstraction layer |
| `frontend/src/pages/Playground.jsx` | ~310 | SSE streaming compilation UI |
| `frontend/src/pages/Validation.jsx` | ~280 | Error inspector + repair log |
| `frontend/src/pages/Metrics.jsx` | ~250 | Consistency score + analytics |
| `frontend/src/lib/api.js` | ~95 | API client + history management |
| `frontend/src/index.css` | ~140 | Design system tokens + effects |

---

*Last updated: May 2026*
*Developed by Alok Singh*
