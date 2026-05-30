const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export async function generateConfig(prompt) {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();

  if (!res.ok) {
    // 422 = clarification needed, 500 = pipeline failed
    throw { status: res.status, detail: data.detail };
  }

  return data;
}

export async function generateConfigStream(prompt, onStageUpdate) {
  const res = await fetch(`${BASE_URL}/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw { status: res.status, detail: data.detail };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events: each event is "data: {...}\n\n"
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // keep incomplete chunk

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      try {
        const eventData = JSON.parse(line.slice(6));
        onStageUpdate(eventData);

        if (eventData.stage === "complete") {
          finalResult = eventData;
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim().startsWith("data: ")) {
    try {
      const eventData = JSON.parse(buffer.trim().slice(6));
      onStageUpdate(eventData);
      if (eventData.stage === "complete") {
        finalResult = eventData;
      }
    } catch {
      // skip
    }
  }

  return finalResult;
}

// --- localStorage history helpers ---

export function getHistory() {
  return JSON.parse(localStorage.getItem("architex_history") || "[]");
}

export function addToHistory(entry) {
  const h = getHistory();
  h.unshift(entry);
  localStorage.setItem("architex_history", JSON.stringify(h.slice(0, 50)));
}

export function getLastRun() {
  const h = getHistory();
  return h.length > 0 ? h[0] : null;
}
