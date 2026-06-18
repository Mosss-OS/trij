const RP_NAME = "Trij";
const STORAGE_KEY = "trij_webauthn_credential_id";
const USER_KEY = "trij_webauthn_user_id";

export async function isBiometricAvailable(): Promise<boolean> {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function isBiometricRegistered(): Promise<boolean> {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return false;
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: base64ToBytes(id) as BufferSource, type: "public-key" }],
        timeout: 1000,
      },
      mediation: "silent",
    });
    return !!cred;
  } catch {
    return false;
  }
}

export function getBiometricUserId(): string | null {
  return localStorage.getItem(USER_KEY);
}

export async function registerBiometric(userId: string): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: "Trij User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 30000,
      },
    }) as PublicKeyCredential | null;

    if (!cred) return false;
    localStorage.setItem(STORAGE_KEY, bytesToBase64(new Uint8Array(cred.rawId)));
    localStorage.setItem(USER_KEY, userId);
    return true;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<{ userId: string | null; error: string | null }> {
  if (!(await isBiometricAvailable())) return { userId: null, error: "Biometric authentication not available on this device" };
  const credentialId = localStorage.getItem(STORAGE_KEY);
  if (!credentialId) return { userId: null, error: "No biometric credential registered" };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: base64ToBytes(credentialId) as BufferSource, type: "public-key" }],
        userVerification: "required",
        timeout: 30000,
      },
    });
    if (!cred) return { userId: null, error: "Biometric authentication was cancelled" };
    return { userId: localStorage.getItem(USER_KEY), error: null };
  } catch (err) {
    const msg = err instanceof DOMException
      ? err.name === "NotAllowedError"
        ? "Biometric match failed or was cancelled. Try again or sign in with your email."
        : err.name === "SecurityError"
          ? "Biometric authentication blocked by security policy"
          : `Biometric error: ${err.message}`
      : "Biometric authentication failed unexpectedly";
    return { userId: null, error: msg };
  }
}

export async function unregisterBiometric(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
