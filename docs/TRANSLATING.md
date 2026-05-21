# Adding or editing translations

## Language pack structure

Translation strings live in `src/lib/i18n.ts`. The file exports:

- **`Language`** — union type of supported locale codes
- **`rtlLanguages`** — array of RTL locale codes (e.g. `"ar-SA"`)
- **`translations`** — object mapping locale code → `{ key: string }`
- **`useI18n()`** — React hook returning `{ t, language, dir }`

## Adding a new language

### 1. Add the locale code to the `Language` type

```ts
export type Language = "en-US" | "fr-FR" | "sw-KE" | "hi-IN" | "pt-BR" | "ar-SA" | "es-ES" | "your-LC";
```

### 2. Add an entry to the `translations` object

Each locale must define **every key** present in `en-US`. Missing keys fall back to `en-US` at runtime, but the goal is 100 % coverage.

Copy all keys from `en-US` and translate each value. Keep the same key order for maintainability.

### 3. Register the locale in the language selector

Open `src/lib/voice.ts` and add your locale to the `LANGUAGES` array:

```ts
export const LANGUAGES = [
  { code: "en-US", label: "English" },
  // ...
  { code: "your-LC", label: "Your Language" },
];
```

### 4. (RTL languages only) Add to `rtlLanguages`

```ts
export const rtlLanguages: Language[] = ["ar-SA", "your-LC"];
```

### 5. Register the locale in `src/lib/voice.ts`

If the language should be available for speech synthesis, add it to the speech-language map in `VoiceAssistant`.

## Translation keys

Keys are camelCase, grouped roughly by feature area:

| Prefix / area       | Example keys                              |
|---------------------|-------------------------------------------|
| Navigation          | `dashboard`, `home`, `patients`, `map`   |
| Triage flow         | `newTriage`, `whoIsPatient`, `frameArea` |
| AI engine           | `aiEngine`, `extendedReasoningDesc`      |
| Settings            | `languageAndVoice`, `offlinePin`         |
| Privacy/disclaimer  | `privacy`, `disclaimerItem1-5`           |
| Sync & patients     | `syncing`, `syncResults`, `autoMerge`    |
| Camera & image      | `lowLight`, `blurry`, `captureAnyway`    |
| Voice               | `voiceFollowUp`, `voiceComplete`         |
| Referral slip       | `referralSlipTitle`, `ageSexLabel`       |
| Kiosk / a11y        | `kioskMode`, `hapticFeedbackDesc`        |

Variables in strings use `{variable}` syntax (e.g. `"Page {n} of {total}"`). Preserve these exactly.

## RTL support

When `dir` is `"rtl"`, the `<html>` element gets `dir="rtl"`. Most modern CSS frameworks handle layout flipping automatically. For manual overrides, use Tailwind's `rtl:` / `ltr:` variants or the `[dir="rtl"]` selector.

## Best practices

- Keep translations concise — the UI has limited space.
- Use the same tone as `en-US`: professional but accessible.
- For multi-line descriptions, use a single string (no embedded newlines).
- Preserve all `{placeholder}` variables exactly as they appear in `en-US`.
- Run `bun run typecheck` after editing to catch missing keys.
