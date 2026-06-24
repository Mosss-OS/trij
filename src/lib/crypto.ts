/**
 * Client-side encryption module using AES-256-GCM with PBKDF2 key derivation.
 *
 * Provides encrypt/decrypt for patient data at rest. The key is derived from
 * the user's PIN via PBKDF2 with 600,000 iterations. Salt is generated as a
 * random hex string and decoded to raw bytes for the Web Crypto API.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;

let cachedKey: CryptoKey | null = null;

/** Convert an ArrayBuffer to a hex string. */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Convert a hex string to an ArrayBuffer (raw bytes). */
function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Derive an AES-256-GCM key from a PIN and salt using PBKDF2.
 *
 * The salt is expected as a hex string (from generateSalt()) and is decoded
 * to raw bytes before being passed to the Web Crypto API.
 */
export async function deriveKey(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToBuf(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Generate a cryptographically random salt as a hex string. */
export function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return bufToHex(salt.buffer);
}

/** Cache the derived key in memory for subsequent encrypt/decrypt calls. */
export function cacheKey(key: CryptoKey) {
  cachedKey = key;
}

/** Clear the cached key from memory (e.g. on lock or sign-out). */
export function clearKey() {
  cachedKey = null;
}

const BIOMETRIC_SALT_KEY = "trij_bio_wrap_salt";
const BIOMETRIC_WRAPPED_KEY = "trij_bio_wrapped_key";

export async function createBiometricKeyWrap(credentialId: string): Promise<void> {
  const key = cachedKey;
  if (!key) return;
  const salt = generateSalt();
  const wrappingKey = await deriveWrappingKey(credentialId, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrappedKey = await crypto.subtle.wrapKey("raw", key, wrappingKey, { name: ALGORITHM, iv });
  localStorage.setItem(BIOMETRIC_SALT_KEY, salt);
  localStorage.setItem(BIOMETRIC_WRAPPED_KEY, bufToHex(iv.buffer) + ":" + bufToHex(wrappedKey));
}

export async function unwrapBiometricKey(credentialId: string): Promise<CryptoKey> {
  const salt = localStorage.getItem(BIOMETRIC_SALT_KEY);
  const stored = localStorage.getItem(BIOMETRIC_WRAPPED_KEY);
  if (!salt || !stored) throw new Error("No biometric key wrap found");
  const wrappingKey = await deriveWrappingKey(credentialId, salt);
  const [ivHex, dataHex] = stored.split(":");
  if (!ivHex || !dataHex) throw new Error("Invalid biometric wrapped key");
  const iv = new Uint8Array(hexToBuf(ivHex));
  const data = hexToBuf(dataHex);
  return crypto.subtle.unwrapKey(
    "raw", data, wrappingKey, { name: ALGORITHM, iv },
    { name: ALGORITHM, length: KEY_LENGTH },
    true, ["encrypt", "decrypt"],
  );
}

async function deriveWrappingKey(credentialId: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(credentialId), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: hexToBuf(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export function hasBiometricKeyWrap(): boolean {
  return !!localStorage.getItem(BIOMETRIC_WRAPPED_KEY);
}

export function clearBiometricKeyWrap(): void {
  localStorage.removeItem(BIOMETRIC_SALT_KEY);
  localStorage.removeItem(BIOMETRIC_WRAPPED_KEY);
}

/** Check whether a key is currently cached. */
export function isKeyCached(): boolean {
  return cachedKey !== null;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-delimited hex string: iv:ciphertext.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = cachedKey;
  if (!key) throw new Error("Encryption key not available");

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(plaintext),
  );

  return bufToHex(iv.buffer) + ":" + bufToHex(ciphertext);
}

/**
 * Decrypt a payload created by encrypt().
 * Expects the format iv:ciphertext as hex strings.
 */
export async function decrypt(payload: string): Promise<string> {
  const key = cachedKey;
  if (!key) throw new Error("Encryption key not available");

  const [ivHex, dataHex] = payload.split(":");
  if (!ivHex || !dataHex) throw new Error("Invalid encrypted payload");

  const iv = new Uint8Array(hexToBuf(ivHex));
  const data = hexToBuf(dataHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}
