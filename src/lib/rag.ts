import kb from "@/data/medical-kb.json";

export interface KnowledgeEntry {
  id: string;
  condition: string;
  keywords: string[];
  cause: string;
  epidemiology: string;
  treatment: string;
  referral_criteria: string;
  prevention: string;
  who_guideline: string;
}

export interface RagResult {
  sources: KnowledgeEntry[];
  contextText: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function scoreEntry(entry: KnowledgeEntry, queryTokens: string[]): number {
  const entryTokens = new Set(entry.keywords.flatMap((k) => tokenize(k)));
  let score = 0;
  for (const token of queryTokens) {
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword.includes(token) || token.includes(normalizedKeyword)) {
        score += 2;
      }
    }
    if (tokenize(entry.condition).some((t) => t === token || t.includes(token))) {
      score += 3;
    }
  }
  return score;
}

let remoteKb: KnowledgeEntry[] | null = null;

export async function fetchRemoteKb(supabaseUrl?: string, supabaseAnonKey?: string): Promise<void> {
  if (!supabaseUrl || !supabaseAnonKey) return;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/medical-kb`, {
      headers: { Authorization: `Bearer ${supabaseAnonKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data: KnowledgeEntry[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        remoteKb = data;
      }
    }
  } catch {
    /* fallback to local KB */
  }
}

export function getCompactKbContext(topK = 51): string {
  const entries = remoteKb || (kb as KnowledgeEntry[]);
  const subset = entries.slice(0, topK);
  return subset
    .map(
      (e) =>
        `- ${e.condition}: ${e.keywords.join(", ")}. Treatment: ${e.treatment.split(".")[0]}. Refer if: ${e.referral_criteria.split(".")[0]}.`,
    )
    .join("\n");
}

export function retrieve(queryFeatures: string[], topK = 3): RagResult {
  const query = queryFeatures.join(" ");
  const queryTokens = tokenize(query);

  const entries = remoteKb || (kb as KnowledgeEntry[]);

  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const sources = scored.map((s) => s.entry);

  const contextText =
    sources.length > 0
      ? sources
          .map(
            (s) =>
              `[${s.condition}]\nCause: ${s.cause}\nEpidemiology: ${s.epidemiology}\nTreatment: ${s.treatment}\nReferral: ${s.referral_criteria}\nWHO guideline: ${s.who_guideline}`,
          )
          .join("\n\n")
      : "";

  return { sources, contextText };
}
