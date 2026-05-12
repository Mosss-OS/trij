/* eslint-disable @typescript-eslint/no-explicit-any */
export class VoiceAssistant {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  language: string;

  constructor(language = "en-US") {
    this.language = language;
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = language;
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
    this.synthesis = window.speechSynthesis ?? null;
  }

  setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) this.recognition.lang = lang;
  }

  available() {
    return !!this.recognition;
  }

  listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) return reject(new Error("Speech recognition unavailable"));
      this.recognition.onresult = (e: any) =>
        resolve(e.results[0][0].transcript as string);
      this.recognition.onerror = (e: any) => reject(new Error(e.error || "Recognition error"));
      try {
        this.recognition.start();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  speak(text: string, lang?: string) {
    if (!this.synthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang ?? this.language;
    this.synthesis.cancel();
    this.synthesis.speak(u);
  }

  stop() {
    this.synthesis?.cancel();
  }
}

export const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "sw-KE", label: "Kiswahili" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ar-SA", label: "العربية" },
  { code: "pt-BR", label: "Português" },
];
