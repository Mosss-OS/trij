import { useEffect, useState, useMemo, useRef } from "react";
import MiniSearch from "minisearch";
import { getDB } from "@/lib/db";
import type { Patient } from "@/types/trij";

const SEARCH_OPTIONS = {
  fields: ["identifier", "notes", "ageYears"],
  storeFields: [
    "id",
    "chwUserId",
    "identifier",
    "ageYears",
    "sex",
    "notes",
    "createdAt",
    "updatedAt",
    "mergedInto",
  ],
  searchOptions: {
    boost: { identifier: 3, notes: 1, ageYears: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
};

let miniSearchInstance: MiniSearch<Patient> | null = null;

function getSearchIndex(): MiniSearch<Patient> {
  if (!miniSearchInstance) {
    miniSearchInstance = new MiniSearch<Patient>({
      fields: SEARCH_OPTIONS.fields,
      storeFields: SEARCH_OPTIONS.storeFields,
    });
  }
  return miniSearchInstance;
}

export function usePatientSearch(query: string) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [indexReady, setIndexReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const load = async () => {
      const all = await getDB().patients.orderBy("createdAt").reverse().toArray();
      setPatients(all);
      const idx = getSearchIndex();
      idx.removeAll();
      idx.addAll(
        all.map((p) => ({ ...p, ageYears: String(p.ageYears ?? "") })) as unknown as Patient[],
      );
      setIndexReady(true);
    };
    load();
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || !indexReady) return patients;
    const idx = getSearchIndex();
    const raw = idx.search(debouncedQuery.trim(), SEARCH_OPTIONS.searchOptions) as Array<{
      id: string;
      score: number;
    }>;
    const scored = new Map(raw.map((r) => [r.id, r.score]));
    return patients
      .filter(
        (p) =>
          !p.mergedInto &&
          (scored.has(p.id) || p.identifier.toLowerCase().includes(debouncedQuery.toLowerCase())),
      )
      .sort((a, b) => {
        const sa = scored.get(a.id) ?? 0;
        const sb = scored.get(b.id) ?? 0;
        if (sa !== sb) return sb - sa;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [debouncedQuery, patients, indexReady]);

  return { patients, results, indexReady, reload: () => setIndexReady(false) };
}
