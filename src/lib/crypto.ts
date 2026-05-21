const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;

let cachedKey: CryptoKey | null = null;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

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
      salt: enc.encode(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return bufToHex(salt.buffer);
}

export function cacheKey(key: CryptoKey) {
  cachedKey = key;
}

export function clearKey() {
  cachedKey = null;
}

export function isKeyCached(): boolean {
  return cachedKey !== null;
}

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
