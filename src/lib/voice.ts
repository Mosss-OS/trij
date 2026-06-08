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
      this.recognition.onresult = (e: any) => resolve(e.results[0][0].transcript as string);
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

  speakAndWait(text: string, lang?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang ?? this.language;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      this.synthesis.cancel();
      this.synthesis.speak(u);
    });
  }

  async confirm(prompt: string, lang?: string): Promise<boolean> {
    await this.speakAndWait(prompt, lang);
    try {
      const answer = await this.listen();
      const trimmed = answer.toLowerCase().trim();
      const yesWords = [
        "yes",
        "yeah",
        "yep",
        "sure",
        "okay",
        "ok",
        "correct",
        "right",
        "confirm",
        "y",
      ];
      const noWords = ["no", "nope", "nah", "not", "negative", "n"];
      if (yesWords.some((w) => trimmed.startsWith(w) || trimmed.includes(w))) return true;
      if (noWords.some((w) => trimmed.startsWith(w) || trimmed.includes(w))) return false;
      return false;
    } catch {
      return false;
    }
  }

  stop() {
    this.synthesis?.cancel();
  }
}

import { LANGUAGE_INFO } from "./i18n";

export const LANGUAGES = LANGUAGE_INFO.map((l) => ({ code: l.code, label: l.nativeLabel }));
