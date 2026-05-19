import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { registerSW, listenForSyncMessages } from "@/lib/sw-register";
import { processSyncQueue } from "@/lib/sync";
import { useI18n } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.98_0.008_85)] to-[oklch(0.95_0.015_200)] px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.78_0.13_185)]/20">
          <span className="font-serif text-5xl font-bold text-[oklch(0.45_0.08_220)]">404</span>
        </div>
        <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-foreground/60">
          The page you're looking for doesn't exist or has been moved. If you need help, contact your supervisor.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:shadow-black/20"
          >
            Go home
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-white/40 px-6 py-3 font-sans text-sm font-medium text-foreground/80 backdrop-blur-xl transition-colors hover:bg-white/60"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[Trij Error]", error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.98_0.008_85)] to-[oklch(0.95_0.015_200)] px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-foreground/60">
          An unexpected error occurred. Please try again. If the problem persists, try refreshing the page or contact your supervisor.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:shadow-black/20"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

const SITE_URL = "https://trij.vercel.app";
const LOGO_URL = "https://res.cloudinary.com/dv0tt80vn/image/upload/v1778960068/Trij_l7tyxj.png";
const GLOBAL_DESC =
  "Trij is a free, open-source, offline-first AI medical triage app for community health workers. On-device wound assessment, rash analysis, and document scanning powered by Google DeepMind Gemma 4. No internet needed — patient data never leaves the device.";
const GLOBAL_TITLE = "Trij — Free Offline AI Medical Triage for Community Health Workers";
const GLOBAL_KEYWORDS =
  "free medical triage app, offline AI healthcare, community health worker tools, wound assessment app, rash analysis AI, on-device medical AI, Gemma 4 healthcare, open source medical software, remote healthcare, telemedicine alternative, primary care triage, health equity, global health, AI for good, medical document scanner, privacy-first healthcare";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f5d63" },
      { name: "color-scheme", content: "light" },
      { title: GLOBAL_TITLE },
      { name: "description", content: GLOBAL_DESC },
      { name: "keywords", content: GLOBAL_KEYWORDS },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "googlebot", content: "index, follow" },
      { name: "application-name", content: "Trij" },
      { name: "apple-mobile-web-app-title", content: "Trij" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { property: "og:title", content: GLOBAL_TITLE },
      { property: "og:description", content: GLOBAL_DESC },
      { property: "og:image", content: LOGO_URL },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "Trij logo — on-device AI medical triage" },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Trij" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Trij_app" },
      { name: "twitter:creator", content: "@Trij_app" },
      { name: "twitter:title", content: GLOBAL_TITLE },
      { name: "twitter:description", content: GLOBAL_DESC },
      { name: "twitter:image", content: LOGO_URL },
      { name: "twitter:image:alt", content: "Trij logo — on-device AI medical triage" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", href: LOGO_URL, type: "image/png" },
      { rel: "apple-touch-icon", href: LOGO_URL, type: "image/png" },
      { rel: "dns-prefetch", href: "https://api.supabase.com" },
      { rel: "preconnect", href: "https://api.supabase.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://res.cloudinary.com" },
      { rel: "preconnect", href: "https://res.cloudinary.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "MedicalWebPage",
              "@id": SITE_URL,
              url: SITE_URL,
              name: GLOBAL_TITLE,
              description: GLOBAL_DESC,
              about: {
                "@type": "MedicalSpecialty",
                name: "Triage",
              },
              audience: {
                "@type": "Audience",
                audienceType: "Community Health Workers",
              },
              keywords: GLOBAL_KEYWORDS,
              inLanguage: ["en", "fr", "sw", "hi", "pt", "ar", "es"],
              isAccessibleForFree: true,
              license: "https://www.apache.org/licenses/LICENSE-2.0",
            },
            {
              "@type": "WebApplication",
              name: "Trij",
              url: SITE_URL,
              description: GLOBAL_DESC,
              applicationCategory: "HealthApplication",
              operatingSystem: "Android, iOS, Web",
              browserRequirements: "Requires Chrome, Firefox, or Safari",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "Trij Team",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const { language, dir } = useI18n();
  return (
    <html lang={language} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerSW();
  }, []);

  useEffect(() => {
    const unsub = listenForSyncMessages(() => {
      processSyncQueue().catch(() => {});
    });
    return unsub;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
