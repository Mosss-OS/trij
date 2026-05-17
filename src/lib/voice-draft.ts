import { getDB, type VoiceDraft } from "@/lib/db";

export async function saveVoiceDraft(
  draft: Omit<VoiceDraft, "updatedAt">,
): Promise<void> {
  const db = getDB();
  await db.voiceDrafts.put({ ...draft, updatedAt: new Date().toISOString() });
}

export async function getVoiceDraft(patientId: string): Promise<VoiceDraft | undefined> {
  const db = getDB();
  return db.voiceDrafts.get(patientId);
}

export async function clearVoiceDraft(patientId: string): Promise<void> {
  const db = getDB();
  await db.voiceDrafts.delete(patientId);
}

export async function listVoiceDrafts(chwUserId: string): Promise<VoiceDraft[]> {
  const db = getDB();
  return db.voiceDrafts.where("chwUserId").equals(chwUserId).reverse().sortBy("updatedAt");
}
