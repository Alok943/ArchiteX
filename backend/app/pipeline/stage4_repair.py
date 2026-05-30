import json
import logging
from pydantic import ValidationError
from app.core.llm_client import call_llm
from app.schemas.output import AppConfig
from app.pipeline.business_validators import (
    validate_feature_coverage,
    validate_entity_coverage,
    validate_crud_completeness,
    validate_fk_references,
    validate_premium_gating,
    validate_analytics,
    validate_auth_completeness,
)

logger = logging.getLogger(__name__)
MAX_RETRIES = 3

REPAIR_SYSTEM_PROMPT = """
You are an expert at fixing inconsistent application schema JSON.
You will receive a broken AppConfig JSON and a list of specific validation errors.
Your job is to fix ONLY the broken parts — do not regenerate the entire schema.

CRITICAL RULES:
- NEVER introduce features, roles, pages, endpoints, or tables that were not present in the original schema or explicitly requested in the errors.
- Do NOT add premium roles, analytics charts, payment endpoints, or any other functionality unless the error message SPECIFICALLY asks for it.
- If an error says "Feature X missing", only add the minimal implementation for X. Do not add related features.
- Your fix must be surgical. Change the minimum number of fields to resolve each error.

STRUCTURAL RULES:
- Return the complete fixed AppConfig JSON. No explanation, no markdown, no extra text.
- Fix only what the errors describe. Do not change anything else.
- All cross-layer references must be consistent after your fix:
  * API request_fields/response_fields must use "table.field" format and exist in db_schema
  * UIComponent.bound_api must match an APIEndpoint.path exactly
  * AuthRule.allowed_pages must match UIPage.name values exactly
  * AuthRule.allowed_endpoints must match APIEndpoint.path values exactly
  * Roles in API endpoints must exist in auth_rules
  * Role-restricted pages must have auth_required: true on their endpoints
  * Foreign key is_fk values must reference existing "table.field"

AUTH REFERENCE RESOLUTION RULES (apply in this order):
- If an AuthRule.allowed_pages references a page that does NOT exist in ui_schema:
  1. PREFER: Create the missing page in ui_schema if the page name is clearly implied by the role
     (e.g. admin role referencing "admin_dashboard" → create a minimal admin_dashboard page)
  2. FALLBACK: Remove the invalid page name from allowed_pages if the page cannot be inferred
  Never leave a dangling page reference in allowed_pages.
- If an AuthRule.allowed_endpoints references an endpoint that does NOT exist in api_schema:
  1. PREFER: Create the missing endpoint if its purpose is clear from the path name
  2. FALLBACK: Remove the invalid endpoint from allowed_endpoints
  Never leave a dangling endpoint reference in allowed_endpoints.
- After resolving dangling references, ensure the full schema is still internally consistent.
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


def _strip_metadata(config_dict: dict) -> dict:
    """Remove metadata fields that shouldn't be sent to the LLM for repair."""
    clean = dict(config_dict)
    clean.pop("validation_errors", None)
    clean.pop("retry_count", None)
    return clean


async def run_stage4(raw_config: dict, intent) -> AppConfig:
    """
    Stage 4 — Validation + Surgical Repair
    Model: Sonnet (reasoning required)
    Input: raw dict from Stage 3 and intent from Stage 1
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
        logger.info(f"Stage 4 — Attempt {attempt}/{MAX_RETRIES}")

        try:
            config = AppConfig.model_validate(current)
            logger.info("Pydantic structural validation passed.")

            # Run all business validators
            business_errors = []
            business_errors.extend(validate_feature_coverage(config, intent))
            business_errors.extend(validate_entity_coverage(config, intent))
            business_errors.extend(validate_crud_completeness(config, intent))
            business_errors.extend(validate_fk_references(config))
            business_errors.extend(validate_premium_gating(config, intent))
            business_errors.extend(validate_analytics(config, intent))
            business_errors.extend(validate_auth_completeness(config, intent))

            if business_errors:
                logger.warning(f"Business validation failed with {len(business_errors)} error(s).")
                if attempt == MAX_RETRIES:
                    logger.error("Max retries reached. Returning config with business errors.")
                    config.validation_errors = business_errors
                    config.retry_count = attempt
                    return config

                repair_message = f"""
The schema is structurally valid but failed business validation.

BUSINESS ERRORS:
{json.dumps(business_errors, indent=2)}

CURRENT CONFIG:
{json.dumps(_strip_metadata(config.model_dump()), indent=2)}

Fix ONLY these issues.
Return complete AppConfig JSON.
"""

                logger.info(f"Sending business repair prompt to LLM (attempt {attempt})...")
                current = await call_llm(
                    stage=4,
                    system_prompt=REPAIR_SYSTEM_PROMPT,
                    user_message=repair_message,
                    max_tokens=8192,
                )
                continue

            config.retry_count = attempt - 1
            logger.info(f"All validations passed after {attempt - 1} repair(s).")
            return config

        except ValidationError as exc:
            last_errors = _extract_pydantic_errors(exc)
            logger.warning(f"Pydantic validation failed with {len(last_errors)} error(s).")

            if attempt == MAX_RETRIES:
                logger.error("Max retries reached. Returning best-effort config.")
                break

            repair_message = f"""
Fix this AppConfig JSON. It has the following validation errors:

ERRORS:
{json.dumps(last_errors, indent=2)}

BROKEN CONFIG:
{json.dumps(current, indent=2)}

Return the complete fixed JSON.
"""
            logger.info(f"Sending structural repair prompt to LLM (attempt {attempt})...")
            current = await call_llm(
                stage=4,
                system_prompt=REPAIR_SYSTEM_PROMPT,
                user_message=repair_message,
                max_tokens=8192,
            )

    # All retries exhausted — return best-effort config with errors documented
    fallback = dict(current)
    fallback.pop("validation_errors", None)
    fallback.pop("retry_count", None)
    return AppConfig.model_construct(
        **fallback,
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