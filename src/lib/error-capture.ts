// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

async function handleError(error: unknown) {
  record(error);
  try {
    const { logError } = await import("./error-logger");
    await logError(error);
  } catch {
    // error logger must never throw
  }
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) =>
    handleError((event as ErrorEvent).error ?? event),
  );
  globalThis.addEventListener("unhandledrejection", (event) =>
    handleError((event as PromiseRejectionEvent).reason),
  );
}

if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("uncaughtException", (err) => handleError(err));
  process.on("unhandledRejection", (reason) => handleError(reason));
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
