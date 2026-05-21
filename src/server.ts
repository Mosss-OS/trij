import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

let serverEntryHandler: ((request: Request) => Promise<Response>) | undefined;

async function ensureHandler(): Promise<(request: Request) => Promise<Response>> {
  if (!serverEntryHandler) {
    const mod = await import("@tanstack/react-start/server-entry");
    const entry = (mod as { default?: unknown }).default ?? mod;
    if (typeof entry === "function") {
      serverEntryHandler = entry as (request: Request) => Promise<Response>;
    } else if (entry && typeof entry === "object" && "fetch" in entry) {
      const obj = entry as { fetch: (...args: unknown[]) => Promise<Response> };
      serverEntryHandler = (request: Request) => obj.fetch(request);
    } else {
      throw new Error("Unsupported server entry format");
    }
  }
  return serverEntryHandler;
}

function securityHeaders(): Record<string, string> {
  return {
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(self), microphone=(self), gyroscope=()",
    "content-security-policy": [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:11434 ws://localhost:11434",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
    ].join("; "),
  };
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: securityHeaders(),
  });
}

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) {
    if (key !== "content-type" && !headers.has(key)) {
      headers.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function handler(request: Request): Promise<Response> {
  try {
    const entryHandler = await ensureHandler();
    const response = await entryHandler(request);
    return addSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
  } catch (error) {
    console.error(error);
    return brandedErrorResponse();
  }
}

export default {
  fetch: handler,
};
