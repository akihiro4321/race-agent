import "dotenv/config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterConfig = {
  apiKey: string;
  baseUrl: string;
  appName: string;
  referer: string;
  temperature: number;
};

export function loadConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    appName: process.env.OPENROUTER_APP_NAME ?? "race-agent-poc",
    referer: process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost",
    temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.2)
  };
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  throw new Error("No JSON object found in model output.");
}

export async function chatJson(params: {
  model: string;
  prompt: string;
  config: OpenRouterConfig;
}): Promise<{ text: string; jsonText: string; latencyMs: number }> {
  const started = Date.now();
  const response = await fetch(`${params.config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": params.config.referer,
      "X-Title": params.config.appName
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.config.temperature,
      messages: [{ role: "user", content: params.prompt }],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const jsonText = extractJsonBlock(text);

  return {
    text,
    jsonText,
    latencyMs: Date.now() - started
  };
}
