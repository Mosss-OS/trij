import { getDB } from "./db";

export interface PinRecord {
  userId: string;
  email: string;
  pinHash: string;
  salt: string;
  failedAttempts: number;
  lastFailedAttempt: string | null;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;

function base64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function pbkdf2Hash(pin: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH
  );
  return base64(bits);
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export async function setupPin(
  userId: string,
  email: string,
  pin: string
): Promise<void> {
  if (pin.length < 4 || pin.length > 6) {
    throw new Error("PIN must be 4-6 digits");
  }
  if (!/^\d+$/.test(pin)) {
    throw new Error("PIN must contain only digits");
  }
  const salt = generateSalt();
  const pinHash = await pbkdf2Hash(pin, salt);
  const db = getDB();
  await db.pinAuth.put({
    userId,
    email,
    pinHash,
    salt: base64(salt),
    failedAttempts: 0,
    lastFailedAttempt: null,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function verifyPin(
  userId: string,
  pin: string
): Promise<boolean> {
  const db = getDB();
  const record = await db.pinAuth.get(userId);
  if (!record) return false;
  if (record.locked) return false;
  const salt = fromBase64(record.salt);
  const hash = await pbkdf2Hash(pin, salt);
  return hash === record.pinHash;
}

export async function hasPinForUser(userId: string): Promise<boolean> {
  const db = getDB();
  const record = await db.pinAuth.get(userId);
  return !!record;
}

export async function getPinInfo(
  userId: string
): Promise<{ locked: boolean; failedAttempts: number } | null> {
  const db = getDB();
  const record = await db.pinAuth.get(userId);
  if (!record) return null;
  return {
    locked: record.locked,
    failedAttempts: record.failedAttempts,
  };
}

export async function recordFailedAttempt(userId: string): Promise<boolean> {
  const db = getDB();
  const record = await db.pinAuth.get(userId);
  if (!record) return false;
  const attempts = record.failedAttempts + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  await db.pinAuth.update(userId, {
    failedAttempts: attempts,
    lastFailedAttempt: new Date().toISOString(),
    locked,
    updatedAt: new Date().toISOString(),
  });
  return locked;
}

export async function resetLockout(userId: string): Promise<void> {
  const db = getDB();
  await db.pinAuth.update(userId, {
    failedAttempts: 0,
    lastFailedAttempt: null,
    locked: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearPin(userId: string): Promise<void> {
  const db = getDB();
  await db.pinAuth.delete(userId);
}
