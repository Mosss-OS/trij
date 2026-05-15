import { getDB } from "@/lib/db";
import type { ErrorLog } from "@/lib/db";

export async function logError(error: unknown, route?: string): Promise<void> {
  try {
    const db = getDB();
    const entry: ErrorLog = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      route,
      timestamp: Date.now(),
    };
    await db.errorLogs.add(entry);
  } catch {
    // error logger must never throw
  }
}

export async function getRecentErrors(limit = 20): Promise<ErrorLog[]> {
  try {
    const db = getDB();
    return await db.errorLogs.orderBy("timestamp").reverse().limit(limit).toArray();
  } catch {
    return [];
  }
}

export async function clearErrorLogs(): Promise<void> {
  try {
    const db = getDB();
    await db.errorLogs.clear();
  } catch {
    // clearing logs must never throw
  }
}
