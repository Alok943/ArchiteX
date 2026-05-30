import logging
from app.core.llm_client import call_llm
from app.schemas.intermediate import IntentOutput, DesignOutput

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert software architect specializing in system design.
You receive a structured intent object and convert it into a concrete app architecture.

RULES:
- Always return valid JSON. No explanation, no markdown, no extra text.
- Every feature in the intent must map to at least one page and one API group.
- Every role must map to at least one page they can access.
- DB tables must be named in snake_case (e.g. "user_profiles" not "UserProfiles").
- API endpoints must start with /api/ (e.g. "/api/contacts").
- If premium/payment features exist, add them to premium_gated array.

Return exactly this JSON structure:
{
  "pages": ["string"],
  "api_groups": [
    { "name": "string", "endpoints": ["string"] }
  ],
  "db_tables": [
    { "name": "string", "relates_to": ["string"] }
  ],
  "flows": ["string"],
  "premium_gated": ["string"]
}
"""


async def run_stage2(intent: IntentOutput) -> DesignOutput:
    """
    Stage 2 — System Design
    Model: Haiku (fast, cheap)
    Input: IntentOutput from Stage 1
    Output: DesignOutput (validated Pydantic model)
    """
    logger.info(f"Stage 2 — Designing system architecture")
    raw = await call_llm(
        stage=2,
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Design the system architecture for this intent:\n\n{intent.model_dump_json(indent=2)}",
    )
    result = DesignOutput(**raw)
    logger.info(f"Stage 2 — Designed {len(result.pages)} pages, {len(result.api_groups)} API groups, {len(result.db_tables)} tables")
    return result