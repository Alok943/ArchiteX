from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.input import UserPrompt
from app.schemas.output import AppConfig
from app.pipeline.stage1_intent import run_stage1
from app.pipeline.stage2_design import run_stage2
from app.pipeline.stage3_schema import run_stage3
from app.pipeline.stage4_repair import run_stage4
import asyncio
import json
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=AppConfig)
async def generate_config(body: UserPrompt):
    """
    Main endpoint — runs the full 4-stage pipeline.

    POST /generate
    Body: { "prompt": "Build a CRM with login..." }
    Returns: AppConfig JSON
    """
    logger.info(f"Received generation request. Prompt length: {len(body.prompt)}")
    start = time.time()

    try:
        # Stage 1 — Intent Extraction (Haiku/Flash)
        logger.info("Running Stage 1 (Intent Extraction)...")
        intent = await run_stage1(body.prompt)

        # If prompt too vague, return early with clarification questions
        if intent.clarification_needed:
            logger.warning("Stage 1 requested clarification.")
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "CLARIFICATION_NEEDED",
                    "questions": intent.clarification_questions,
                }
            )

        # Stage 2 — System Design (Haiku/Flash)
        logger.info("Running Stage 2 (System Design)...")
        design = await run_stage2(intent)

        # Stage 3 — Schema Generation (Sonnet/Flash)
        logger.info("Running Stage 3 (Schema Generation)...")
        raw_config = await run_stage3(intent, design)

        # Stage 4 — Validation + Repair (Sonnet/Flash)
        logger.info("Running Stage 4 (Validation + Repair)...")
        config = await run_stage4(raw_config, intent)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PIPELINE_FAILED",
                "message": str(e),
            }
        )

    latency_ms = int((time.time() - start) * 1000)
    logger.info(f"Pipeline completed successfully in {latency_ms}ms")
    return config


# ─────────────────────────────────────────
# SSE STREAMING ENDPOINT
# ─────────────────────────────────────────

STAGE_NAMES = {
    1: "Intent Extraction",
    2: "System Design",
    3: "Schema Generation",
    4: "Validation + Repair",
}


def _sse_event(stage: int, name: str, status: str, data: dict | None = None) -> str:
    """Format a single SSE event line."""
    payload = {"stage": stage, "name": name, "status": status}
    if data is not None:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"


@router.post("/generate/stream")
async def generate_config_stream(body: UserPrompt):
    """
    Streaming endpoint — runs the same 4-stage pipeline but streams
    stage completion events as Server-Sent Events (SSE).

    POST /generate/stream
    Body: { "prompt": "Build a CRM with login..." }
    Returns: text/event-stream with per-stage JSON events
    """

    async def _event_generator():
        logger.info(f"[SSE] Received streaming request. Prompt length: {len(body.prompt)}")
        start = time.time()

        try:
            # ── Stage 1 — Intent Extraction ──
            yield _sse_event(1, STAGE_NAMES[1], "running")
            await asyncio.sleep(0)  # flush to client
            intent = await run_stage1(body.prompt)

            if intent.clarification_needed:
                logger.warning("[SSE] Stage 1 requested clarification.")
                yield _sse_event(1, STAGE_NAMES[1], "failed", {
                    "error": "CLARIFICATION_NEEDED",
                    "questions": intent.clarification_questions,
                })
                return

            yield _sse_event(1, STAGE_NAMES[1], "completed", intent.model_dump())

            # ── Stage 2 — System Design ──
            yield _sse_event(2, STAGE_NAMES[2], "running")
            await asyncio.sleep(0)
            design = await run_stage2(intent)
            yield _sse_event(2, STAGE_NAMES[2], "completed", design.model_dump())

            # ── Stage 3 — Schema Generation ──
            yield _sse_event(3, STAGE_NAMES[3], "running")
            await asyncio.sleep(0)
            raw_config = await run_stage3(intent, design)
            yield _sse_event(3, STAGE_NAMES[3], "completed", raw_config)

            # ── Stage 4 — Validation + Repair ──
            yield _sse_event(4, STAGE_NAMES[4], "running")
            await asyncio.sleep(0)
            config = await run_stage4(raw_config, intent)
            yield _sse_event(4, STAGE_NAMES[4], "completed")

            # ── Final complete event with full AppConfig ──
            latency_ms = int((time.time() - start) * 1000)
            logger.info(f"[SSE] Pipeline completed successfully in {latency_ms}ms")
            complete_payload = {
                "stage": "complete",
                "name": "Pipeline Complete",
                "status": "completed",
                "data": config.model_dump(),
                "latency_ms": latency_ms,
            }
            yield f"data: {json.dumps(complete_payload)}\n\n"

        except Exception as e:
            logger.error(f"[SSE] Pipeline failed: {e}", exc_info=True)
            error_payload = {
                "stage": "error",
                "name": "Pipeline Error",
                "status": "failed",
                "data": {"error": "PIPELINE_FAILED", "message": str(e)},
            }
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )