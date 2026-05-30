import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from openai import AsyncOpenAI

load_dotenv()
logger = logging.getLogger(__name__)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

zhipu_api_key = os.getenv("ZHIPU_API_KEY", "")
zhipu_client = None
if zhipu_api_key:
    zhipu_client = AsyncOpenAI(
        api_key=zhipu_api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4/"
    )

# Simple tasks → Gemini 2.5 Flash | Complex tasks → Gemini 3.1 Flash Lite
STAGE_MODEL_MAP = {
    1: "gemini-2.5-flash-lite",       # Intent extraction — simple classification
    2: "gemini-2.5-flash-lite",       # System design — structured but lightweight
    3: "gemini-3.1-flash-lite",  # Schema generation — complex, must be precise
    4: "gemini-3.1-flash-lite",  # Repair engine — reasoning required
}

STAGE_FALLBACK_MODEL_MAP = {
    1: "glm-4.7-lite",
    2: "glm-4.7-lite",
    3: "glm-4.7-lite",
    4: "glm-4.7-lite",
}

async def call_llm(
    stage: int,
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
) -> dict:
    """
    Call Gemini with the appropriate model for the given stage.
    Falls back to Zhipu GLM-4-Flash if Gemini fails.
    Always returns parsed JSON dict.
    Raises ValueError if response cannot be parsed as JSON.
    """
    model_name = STAGE_MODEL_MAP[stage]

    try:
        response = await gemini_client.aio.models.generate_content(
            model=model_name,
            contents=user_message,
            config={
                "system_instruction": system_prompt,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json",
            },
        )
        raw_text = response.text.strip()
        
    except Exception as e:
        logger.warning(f"Gemini failed for stage {stage} ({model_name}): {e}. Attempting fallback...")
        if not zhipu_client:
            raise ValueError(f"Gemini failed and no ZHIPU_API_KEY is configured. Original error: {e}")
            
        fallback_model = STAGE_FALLBACK_MODEL_MAP[stage]
        fallback_response = await zhipu_client.chat.completions.create(
            model=fallback_model,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        raw_text = fallback_response.choices[0].message.content.strip()

    # Strip markdown code fences if present (safety fallback)
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Stage {stage} returned invalid JSON: {e}\n"
            f"Raw response:\n{raw_text[:500]}"
        )