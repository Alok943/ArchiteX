from app.core.llm_client import call_llm
from app.schemas.intermediate import IntentOutput

SYSTEM_PROMPT = """
You are an expert software architect specializing in intent extraction.
Your job is to parse a natural language app description into a structured JSON object.

RULES:
- Always return valid JSON. No explanation, no markdown, no extra text.
- If the prompt is too vague to extract meaningful intent, set clarification_needed to true.
- Make reasonable assumptions and document them in the assumptions array.
- Roles must always include at least one role (default: ["user"]).
- Features must be atomic (e.g. "auth", "dashboard", not "auth and dashboard").

Return exactly this JSON structure:
{
  "entities": ["string"],
  "roles": ["string"],
  "features": ["string"],
  "access_rules": [
    { "feature": "string", "allowed_roles": ["string"] }
  ],
  "assumptions": ["string"],
  "clarification_needed": false,
  "clarification_questions": []
}
"""


async def run_stage1(prompt: str) -> IntentOutput:
    """
    Stage 1 — Intent Extraction
    Model: Haiku (fast, cheap)
    Input: raw user prompt
    Output: IntentOutput (validated Pydantic model)
    """
    raw = await call_llm(
        stage=1,
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Extract the intent from this app description:\n\n{prompt}",
    )

    return IntentOutput(**raw)