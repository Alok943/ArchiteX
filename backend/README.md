---
title: ArchiteX Backend
emoji: 🚀
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# ArchiteX Backend API

This is the multi-stage AI compilation pipeline backend for **ArchiteX**, running on FastAPI. It compiles natural language prompts into high-fidelity web application schemas (UI, API, Database, and Security) through an intent-aware, self-repairing agent loop.

## Deployment to Hugging Face Spaces

This repository is optimized for deployment as a **Hugging Face Docker Space**:

- **SDK**: Docker
- **Port**: `7860` (automatically exposed by Hugging Face)
- **User**: Runs under UID `1000` (non-root)

### Environment Variables

To run correctly, make sure to add the following Secrets in your Hugging Face Space Settings:

1. `GEMINI_API_KEY`: Your Google Gemini API Key.
2. `ZHIPU_API_KEY`: Your Zhipu AI / GLM Key (for fallback).

### API Endpoints

- `POST /api/v1/generate` (Sync JSON generation)
- `POST /api/v1/generate/stream` (SSE streaming completion events)
