import { useCallback } from "react";
import { getDB } from "@/lib/db";
import { encrypt, decrypt, isKeyCached } from "@/lib/crypto";
import type { Patient, Assessment } from "@/types/trij";

const PATIENT_FIELDS: (keyof Patient)[] = ["identifier", "notes"];
const ASSESSMENT_FIELDS: (keyof Assessment)[] = ["condition", "recommendation"];

async function encryptPatient(p: Patient): Promise<Patient> {
  for (const field of PATIENT_FIELDS) {
    const val = p[field];
    if (typeof val === "string" && val.length > 0) {
      (p as unknown as Record<string, unknown>)[field] = await encrypt(val);
    }
  }
  return p;
}

async function decryptPatient(p: Patient): Promise<Patient> {
  for (const field of PATIENT_FIELDS) {
    const val = p[field];
    if (typeof val === "string" && val.startsWith("0")) {
      try {
        (p as unknown as Record<string, unknown>)[field] = await decrypt(val);
      } catch {
        // leave as-is if not encrypted
      }
    }
  }
  return p;
}

async function encryptAssessment(a: Assessment): Promise<Assessment> {
  for (const field of ASSESSMENT_FIELDS) {
    const val = a[field];
    if (typeof val === "string" && val.length > 0) {
      (a as unknown as Record<string, unknown>)[field] = await encrypt(val);
    }
  }
  return a;
}

async function decryptAssessment(a: Assessment): Promise<Assessment> {
  for (const field of ASSESSMENT_FIELDS) {
    const val = a[field];
    if (typeof val === "string" && val.startsWith("0")) {
      try {
        (a as unknown as Record<string, unknown>)[field] = await decrypt(val);
      } catch {
        // leave as-is
      }
    }
  }
  return a;
}

export function useEncryptedDb() {
  const ready = isKeyCached();

  const savePatient = useCallback(async (p: Patient) => {
    const db = getDB();
    const encrypted = await encryptPatient({ ...p });
    await db.patients.put(encrypted);
  }, []);

  const getPatient = useCallback(async (id: string): Promise<Patient | undefined> => {
    const db = getDB();
    const p = await db.patients.get(id);
    if (!p) return undefined;
    return ready ? decryptPatient(p) : p;
  }, [ready]);

  const saveAssessment = useCallback(async (a: Assessment) => {
    const db = getDB();
    const encrypted = await encryptAssessment({ ...a });
    await db.assessments.put(encrypted);
  }, []);

  const getAssessment = useCallback(async (id: string): Promise<Assessment | undefined> => {
    const db = getDB();
    const a = await db.assessments.get(id);
    if (!a) return undefined;
    return ready ? decryptAssessment(a) : a;
  }, [ready]);

  const getPatientAssessments = useCallback(async (patientId: string): Promise<Assessment[]> => {
    const db = getDB();
    const items = await db.assessments.where("patientId").equals(patientId).reverse().sortBy("createdAt");
    if (!ready) return items;
    return Promise.all(items.map(decryptAssessment));
  }, [ready]);

  const getAllPatients = useCallback(async (): Promise<Patient[]> => {
    const db = getDB();
    const items = await db.patients.toArray();
    if (!ready) return items;
    return Promise.all(items.map(decryptPatient));
  }, [ready]);

  return { ready, savePatient, getPatient, saveAssessment, getAssessment, getPatientAssessments, getAllPatients };
}
