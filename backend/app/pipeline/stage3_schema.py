import logging
from app.core.llm_client import call_llm
from app.schemas.intermediate import IntentOutput, DesignOutput
from app.schemas.output import AppConfig

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert software architect specializing in generating complete application schemas.
You receive structured intent and design objects and generate a full AppConfig JSON.

RULES:
- Always return valid JSON. No explanation, no markdown, no extra text.
- Every DB table must have exactly one primary key field named "id" of type "uuid".
- Every API endpoint request_fields and response_fields must use "table.field" format (e.g. "users.email").
- Every field referenced in API must exist in the DB schema.
- Every UIComponent.bound_api must match an APIEndpoint.path exactly.
- Every AuthRule.allowed_pages must match a UIPage.name exactly.
- Every AuthRule.allowed_endpoints must match an APIEndpoint.path exactly.
- Roles in API endpoints must match roles defined in auth_rules.
- Pages restricted to specific roles must use auth_required: true on their endpoints.
- Document every assumption you make in the assumptions array.

Return exactly this JSON structure:
{
  "app_name": "string",
  "db_schema": [
    {
      "name": "string",
      "fields": [
        {
          "name": "string",
          "type": "string|uuid|int|bool|timestamp|text|float",
          "nullable": false,
          "is_pk": false,
          "is_fk": null
        }
      ]
    }
  ],
  "api_schema": [
    {
      "path": "string",
      "method": "GET|POST|PUT|DELETE",
      "auth_required": true,
      "roles": ["string"],
      "request_fields": ["table.field"],
      "response_fields": ["table.field"],
      "description": "string"
    }
  ],
  "ui_schema": [
    {
      "name": "string",
      "route": "string",
      "roles": ["string"],
      "components": [
        {
          "id": "string",
          "type": "form|table|chart|card|navbar|modal",
          "bound_api": "string",
          "fields": ["string"],
          "label": "string"
        }
      ]
    }
  ],
  "auth_rules": [
    {
      "role": "string",
      "allowed_pages": ["string"],
      "allowed_endpoints": ["string"]
    }
  ],
  "assumptions": ["string"],
  "validation_errors": [],
  "retry_count": 0
}
"""


async def run_stage3(intent: IntentOutput, design: DesignOutput) -> dict:
    """
    Stage 3 — Schema Generation
    Model: Sonnet (complex, must be precise)
    Input: IntentOutput + DesignOutput from Stages 1 & 2
    Output: raw dict (NOT validated yet — Stage 4 handles validation)
    """
    user_message = f"""
Generate the complete AppConfig schema for this application.

INTENT:
{intent.model_dump_json(indent=2)}

DESIGN:
{design.model_dump_json(indent=2)}

Be precise. Every cross-layer reference must be consistent.
"""

    logger.info("Stage 3 — Generating full AppConfig schema")
    raw = await call_llm(
        stage=3,
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=8192,
    )
    logger.info(f"Stage 3 — Generated schema with {len(raw.get('db_schema', []))} tables, {len(raw.get('api_schema', []))} endpoints, {len(raw.get('ui_schema', []))} pages")
    return raw  # raw dict — Pydantic validation happens in Stage 4