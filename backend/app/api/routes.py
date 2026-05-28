from fastapi import APIRouter, HTTPException
from app.schemas.input import UserPrompt
from app.schemas.output import AppConfig
from app.pipeline.stage1_intent import run_stage1
from app.pipeline.stage2_design import run_stage2
from app.pipeline.stage3_schema import run_stage3
from app.pipeline.stage4_repair import run_stage4
import time

router = APIRouter()


@router.post("/generate", response_model=AppConfig)
async def generate_config(body: UserPrompt):
    """
    Main endpoint — runs the full 4-stage pipeline.

    POST /generate
    Body: { "prompt": "Build a CRM with login..." }
    Returns: AppConfig JSON
    """
    start = time.time()

    try:
        # Stage 1 — Intent Extraction (Haiku)
        intent = await run_stage1(body.prompt)

        # If prompt too vague, return early with clarification questions
        if intent.clarification_needed:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "CLARIFICATION_NEEDED",
                    "questions": intent.clarification_questions,
                }
            )

        # Stage 2 — System Design (Haiku)
        design = await run_stage2(intent)

        # Stage 3 — Schema Generation (Sonnet)
        raw_config = await run_stage3(intent, design)

        # Stage 4 — Validation + Repair (Sonnet)
        config = await run_stage4(raw_config)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PIPELINE_FAILED",
                "message": str(e),
            }
        )

    latency_ms = int((time.time() - start) * 1000)

    # Attach latency as response header for eval framework
    return config