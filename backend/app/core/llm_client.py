import os
import json
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

from groq import AsyncGroq

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

STAGE_MODEL_MAP = {
    1: "meta-llama/llama-4-scout-17b-16e-instruct",
    2: "meta-llama/llama-4-scout-17b-16e-instruct",
    3: "llama-3.3-70b-versatile",
    4: "llama-3.3-70b-versatile",
}
async def call_llm(
    stage: int,
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
) -> dict:
    """
    Call Claude with the appropriate model for the given stage.
    Always returns parsed JSON dict.
    Raises ValueError if response cannot be parsed as JSON.
    """
    model = STAGE_MODEL_MAP[stage]

    response = await client.chat.completions.create(
    model=model,
    max_tokens=max_tokens,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ],
)
    raw_text = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Stage {stage} ({model}) returned invalid JSON: {e}\n"
            f"Raw response:\n{raw_text[:500]}"
        )