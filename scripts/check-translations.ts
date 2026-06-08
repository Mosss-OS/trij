/**
 * Translation coverage checker.
 *
 * Usage:
 *   bun run scripts/check-translations.ts
 *
 * Reports per-locale coverage and lists missing keys.
 */

import { translations, LANGUAGE_INFO, type Language } from "../src/lib/i18n";

const source = translations["en-US"];
const sourceKeys = Object.keys(source) as (keyof typeof source)[];

interface CoverageReport {
  locale: string;
  total: number;
  present: number;
  missing: number;
  coverage: number;
  missingKeys: string[];
  status: string;
}

const reports: CoverageReport[] = [];

for (const info of LANGUAGE_INFO) {
  const locale = translations[info.code as Language];
  if (!locale) {
    console.log(`\n❌ ${info.code}: Locale not found`);
    continue;
  }

  const present: string[] = [];
  const missing: string[] = [];

  for (const key of sourceKeys) {
    if (key in locale) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  const pct = Math.round((present.length / sourceKeys.length) * 100);

  reports.push({
    locale: info.code,
    total: sourceKeys.length,
    present: present.length,
    missing: missing.length,
    coverage: pct,
    missingKeys: missing,
    status: info.status,
  });
}

// Summary table
console.log("\n=== TRANSLATION COVERAGE REPORT ===\n");
console.log(`Source (en-US): ${sourceKeys.length} keys\n`);
console.log(
  `${"Locale".padEnd(14)} ${"Status".padEnd(14)} ${"Coverage".padEnd(10)} ${"Present".padEnd(8)} ${"Missing".padEnd(8)}`,
);
console.log("-".repeat(54));

for (const r of reports) {
  console.log(
    `${r.locale.padEnd(14)} ${r.status.padEnd(14)} ${`${r.coverage}%`.padEnd(10)} ${String(r.present).padEnd(8)} ${String(r.missing).padEnd(8)}`,
  );
}

console.log("\n--- Missing Keys by Locale ---\n");
for (const r of reports) {
  if (r.missing > 0) {
    console.log(`\n${r.locale} (${r.missing} missing):`);
    for (const key of r.missingKeys) {
      console.log(`  - ${key}: "${source[key]}"`);
    }
  } else {
    console.log(`\n${r.locale}: ✓ Complete (no missing keys)`);
  }
}

// Check for extra keys (keys in locale but not in en-US)
console.log("\n\n--- Extra Keys (present in locale but not in en-US) ---\n");
for (const info of LANGUAGE_INFO) {
  if (info.code === "en-US") continue;
  const locale = translations[info.code as Language];
  if (!locale) continue;
  const localeKeys = Object.keys(locale);
  const extra = localeKeys.filter((k) => !(k in source));
  if (extra.length > 0) {
    console.log(`\n${info.code} (${extra.length} extra):`);
    for (const key of extra) {
      console.log(`  - ${key}: "${(locale as Record<string, string>)[key]}"`);
    }
  } else {
    console.log(`\n${info.code}: No extra keys`);
  }
}
