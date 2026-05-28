import json
from pydantic import ValidationError
from app.core.llm_client import call_llm
from app.schemas.output import AppConfig

MAX_RETRIES = 3

REPAIR_SYSTEM_PROMPT = """
You are an expert at fixing inconsistent application schema JSON.
You will receive a broken AppConfig JSON and a list of specific validation errors.
Your job is to fix ONLY the broken parts — do not regenerate the entire schema.

RULES:
- Return the complete fixed AppConfig JSON. No explanation, no markdown, no extra text.
- Fix only what the errors describe. Do not change anything else.
- All cross-layer references must be consistent after your fix:
  * API request_fields/response_fields must use "table.field" format and exist in db_schema
  * UIComponent.bound_api must match an APIEndpoint.path exactly
  * AuthRule.allowed_pages must match UIPage.name values exactly
  * AuthRule.allowed_endpoints must match APIEndpoint.path values exactly
  * Roles in API endpoints must exist in auth_rules
  * Role-restricted pages must have auth_required: true on their endpoints
"""


def _extract_pydantic_errors(exc: ValidationError) -> list[dict]:
    """Convert Pydantic ValidationError into readable repair context."""
    errors = []
    for err in exc.errors():
        errors.append({
            "location": " -> ".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        })
    return errors


async def run_stage4(raw_config: dict) -> AppConfig:
    """
    Stage 4 — Validation + Surgical Repair
    Model: Sonnet (reasoning required)
    Input: raw dict from Stage 3
    Output: validated AppConfig or AppConfig with validation_errors populated

    Repair loop (max 3 iterations):
    1. Try AppConfig.model_validate(raw_config)
    2. If ValidationError -> extract broken fields
    3. Re-prompt Sonnet with ONLY the errors (surgical, not full retry)
    4. Merge repaired output -> retry validation
    5. After 3 failures -> return partial config with errors documented
    """
    current = raw_config
    last_errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            config = AppConfig.model_validate(current)
            config.retry_count = attempt - 1
            return config

        except ValidationError as exc:
            last_errors = _extract_pydantic_errors(exc)

            if attempt == MAX_RETRIES:
                break

            repair_message = f"""
Fix this AppConfig JSON. It has the following validation errors:

ERRORS:
{json.dumps(last_errors, indent=2)}

BROKEN CONFIG:
{json.dumps(current, indent=2)}

Return the complete fixed JSON.
"""
            current = await call_llm(
                stage=4,
                system_prompt=REPAIR_SYSTEM_PROMPT,
                user_message=repair_message,
                max_tokens=8192,
            )

    # All retries exhausted — return best-effort config with errors documented
    return AppConfig.model_construct(
        **current,
        validation_errors=[
            {
                "rule": "REPAIR_FAILED",
                "layer": _guess_layer(e["location"]),
                "message": e["message"],
                "field": e["location"],
            }
            for e in last_errors
        ],
        retry_count=MAX_RETRIES,
    )


def _guess_layer(location: str) -> str:
    """Infer which layer a validation error belongs to from its location string."""
    if "db_schema" in location:
        return "db"
    elif "api_schema" in location:
        return "api"
    elif "ui_schema" in location:
        return "ui"
    elif "auth_rules" in location:
        return "auth"
    return "db"