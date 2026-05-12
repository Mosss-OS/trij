import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trij — Sign in" },
      {
        name: "description",
        content:
          "Trij: offline-first AI triage for community health workers, powered by on-device Gemma.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  useAuthSession();
  const session = useSessionStore((s) => s.session);
  const loading = useSessionStore((s) => s.loading);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (session) return <Navigate to="/dashboard" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <span className="font-display text-xl font-bold">T</span>
            </div>
            <span className="font-display text-xl font-bold">Trij</span>
          </Link>
          <OfflineIndicator />
        </div>

        <div className="mt-12">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Field-ready triage,
            <br />
            <span className="text-primary">on every device.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Gemma runs entirely on your device. Patient data never leaves the
            phone for AI inference.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-10 space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
        >
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="A. Patel"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "First time? Register a CHW account"
              : "Have an account? Sign in"}
          </button>
        </form>

        <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          Inference runs on-device via WebGPU. Records sync only when online.
        </p>
      </div>
    </div>
  );
}
