import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useI18n } from "@/lib/i18n";
import {
  ShieldCheck,
  WifiOff,
  Sparkles,
  Mic,
  Camera,
  MapPin,
  Languages,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const LANDING_TITLE = "Trij — Free Offline AI Medical Triage App for Community Health Workers";
const LANDING_DESC =
  "Trij is a free, open-source AI medical triage app for community health workers. Assess wounds, rashes, and medical documents offline with on-device AI. No internet needed, patient data never leaves the phone.";
const LANDING_OG_TITLE = "Free Offline Medical Triage — Trij";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: LANDING_TITLE },
      { name: "description", content: LANDING_DESC },
      {
        name: "keywords",
        content:
          "free medical triage, community health, offline healthcare AI, wound assessment app, rash analysis, on-device medical AI, open source health software",
      },
      { property: "og:title", content: LANDING_OG_TITLE },
      { property: "og:description", content: LANDING_DESC },
      { name: "twitter:title", content: LANDING_OG_TITLE },
      { name: "twitter:description", content: LANDING_DESC },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  useAuthSession();
  const session = useSessionStore((s) => s.session);
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const authed = !!(session || offlineUser);
  const { t } = useI18n();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[oklch(0.98_0.008_85)] text-[oklch(0.18_0.02_240)] antialiased pt-20 pb-16">
      <BackgroundOrbs />
      <Nav authed={authed} />
      <Hero authed={authed} />
      <LogosStrip />
      <BentoFeatures />
      <FlowSection />
      <PrivacySection />
      <StatsSection />
      <CTASection authed={authed} />
      <Footer />
    </div>
  );
}

/* ---------- background ---------- */
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-10 h-[28rem] w-[28rem] max-sm:w-[60vw] rounded-full bg-[oklch(0.78_0.13_185)] opacity-30 blur-3xl max-sm:blur-2xl"
      />
      <motion.div
        animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-10rem] top-40 h-[32rem] w-[32rem] max-sm:w-[60vw] rounded-full bg-[oklch(0.82_0.12_60)] opacity-25 blur-3xl max-sm:blur-2xl"
      />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] max-sm:w-[50vw] rounded-full bg-[oklch(0.85_0.10_300)] opacity-25 blur-3xl max-sm:blur-2xl"
      />
    </div>
  );
}

/* ---------- nav ---------- */
function Nav({ authed }: { authed: boolean }) {
  const { t } = useI18n();
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY < 50) {
        setShowNav(true);
      } else if (window.scrollY < lastScrollY) {
        setShowNav(true);
      } else {
        setShowNav(false);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  return (
    <header className="fixed top-4 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 px-4">
      <motion.div className="flex items-center justify-between rounded-full border border-white/30 bg-white/40 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/dv0tt80vn/image/upload/v1778960068/Trij_l7tyxj.png"
            alt={t("logoSlogan")}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-sans text-base font-semibold tracking-tight">Trij</span>
        </Link>
        <nav className="hidden items-center gap-7 font-sans text-sm text-foreground/70 md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">{t("footerFeatures")}</a>
          <a href="#flow" className="transition-colors hover:text-foreground">{t("howItWorks")}</a>
          <a href="#privacy" className="transition-colors hover:text-foreground">{t("privacy")}</a>
        </nav>
        <Link
          to={authed ? "/dashboard" : "/login"}
          className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 font-sans text-sm font-medium text-background transition-all hover:opacity-90"
        >
          {authed ? t("openApp") : t("signIn")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </header>
  );
}
/* ---------- hero ---------- */
function Hero({ authed }: { authed: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-5 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <motion.div style={{ y, opacity }} className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-3 py-1 font-sans text-xs font-medium text-foreground/70 backdrop-blur-xl"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          {t("poweredByOnDevice")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[2rem] font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          {t("triageSpeedPrefix")}
          <br />
          <span className="bg-gradient-to-br from-[oklch(0.45_0.08_220)] via-[oklch(0.55_0.10_200)] to-[oklch(0.65_0.13_185)] bg-clip-text italic text-transparent">
            {t("humanCare")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="mx-auto mt-6 max-w-2xl font-sans text-base leading-relaxed text-foreground/65 sm:text-lg"
        >
          {t("trijSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            to={authed ? "/dashboard" : "/login"}
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:shadow-black/20"
          >
            {authed ? t("continueToDashboard") : t("getStartedFree")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-white/40 px-6 py-3 font-sans text-sm font-medium text-foreground/80 backdrop-blur-xl transition-colors hover:bg-white/60"
          >
            {t("exploreProduct")}
          </a>
        </motion.div>
      </motion.div>

      <PhoneMockup />
    </section>
  );
}

function PhoneMockup() {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      className="mx-auto mt-16 w-[85vw] max-w-[320px] sm:max-w-[360px]"
    >
      <div className="relative rounded-[3rem] border border-black/10 bg-gradient-to-b from-zinc-900 to-black p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute left-1/2 top-5 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.4rem] bg-gradient-to-br from-[oklch(0.96_0.01_85)] to-[oklch(0.92_0.02_200)] p-5">
          <div className="mt-10 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/60 bg-white/60 p-3 backdrop-blur-xl"
            >
              <p className="font-sans text-[10px] uppercase tracking-wider text-foreground/50">{t("assessment")}</p>
              <p className="mt-1 font-serif text-sm font-semibold">{t("suspectedDermatitis")}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-sans text-[10px] font-medium text-amber-800">{t("yellow")}</span>
                <span className="font-sans text-[10px] text-foreground/50">{t("confidencePercent").replace("{pct}", "92")}</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-white/60 bg-white/60 p-3 backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-emerald-700" />
                <p className="font-sans text-xs">{t("voiceFollowUp")}</p>
              </div>
              <p className="mt-1 font-serif text-xs italic text-foreground/70">{t("howLongRash")}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl border border-white/60 bg-white/60 p-3 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <p className="font-sans text-[10px] uppercase tracking-wider text-foreground/50">{t("savedOffline")}</p>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 font-sans text-xs text-foreground/70">{t("pendingInSync").replace("{count}", "3")}</p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- logos ---------- */
function LogosStrip() {
  const { t } = useI18n();
  const items = [t("logosOfflineFirst"), t("logosOnDeviceAi"), t("logosWebgpu"), t("logosGemma"), t("logosPwa")];
  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-sans text-xs uppercase tracking-[0.18em] text-foreground/40">
        {items.map((i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </section>
  );
}

/* ---------- bento ---------- */
function BentoFeatures() {
  const { t } = useI18n();
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <SectionHeading
        eyebrow={t("builtForField")}
        title={t("completeKit")}
        subtitle={t("completeKitSub")}
      />

      <div className="mt-14 grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 sm:auto-rows-[12rem] lg:auto-rows-[14rem]">
        <BentoCard className="lg:col-span-2 lg:row-span-2" delay={0.0}>
          <div className="flex h-full flex-col justify-between">
            <Camera className="h-7 w-7 text-[oklch(0.45_0.08_220)]" />
            <div>
              <h3 className="font-serif text-2xl font-medium tracking-tight">{t("captureAnalyze")}</h3>
              <p className="mt-2 max-w-sm font-sans text-sm text-foreground/65">{t("captureAnalyzeDesc")}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard delay={0.1}>
          <Mic className="h-6 w-6 text-emerald-700" />
          <h3 className="mt-auto font-serif text-lg font-medium">{t("voiceGuidedFeature")}</h3>
          <p className="font-sans text-xs text-foreground/60">{t("voiceGuidedFeatureDesc")}</p>
        </BentoCard>

        <BentoCard delay={0.15}>
          <WifiOff className="h-6 w-6 text-[oklch(0.55_0.13_30)]" />
          <h3 className="mt-auto font-serif text-lg font-medium">{t("offlineFirstFeature")}</h3>
          <p className="font-sans text-xs text-foreground/60">{t("offlineFirstFeatureDesc")}</p>
        </BentoCard>

        <BentoCard delay={0.2}>
          <Languages className="h-6 w-6 text-[oklch(0.55_0.13_280)]" />
          <h3 className="mt-auto font-serif text-lg font-medium">{t("multilingualFeature")}</h3>
          <p className="font-sans text-xs text-foreground/60">{t("multilingualFeatureDesc")}</p>
        </BentoCard>

        <BentoCard delay={0.25}>
          <MapPin className="h-6 w-6 text-rose-600" />
          <h3 className="mt-auto font-serif text-lg font-medium">{t("geoAwareFeature")}</h3>
          <p className="font-sans text-xs text-foreground/60">{t("geoAwareFeatureDesc")}</p>
        </BentoCard>

        <BentoCard className="lg:col-span-2" delay={0.3}>
          <div className="flex h-full items-center justify-between gap-4">
            <div>
              <Activity className="h-6 w-6 text-[oklch(0.55_0.10_200)]" />
              <h3 className="mt-3 font-serif text-lg font-medium">{t("supervisorDashboardFeature")}</h3>
              <p className="font-sans text-xs text-foreground/60">{t("supervisorDashboardFeatureDesc")}</p>
            </div>
            <div className="hidden h-24 w-32 shrink-0 rounded-xl border border-white/60 bg-white/40 p-2 backdrop-blur sm:block">
              <div className="space-y-1.5">
                <div className="h-1.5 w-3/4 rounded-full bg-foreground/15" />
                <div className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
                <div className="mt-2 flex h-12 items-end gap-1">
                  {[40, 70, 30, 90, 55, 80].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-sm bg-[oklch(0.55_0.10_200)]/60"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-2" delay={0.35}>
          <div className="flex h-full flex-col justify-between">
            <Sparkles className="h-6 w-6 text-amber-600" />
            <div>
              <h3 className="font-serif text-lg font-medium">{t("resumableInterviewsFeature")}</h3>
              <p className="font-sans text-xs text-foreground/60">{t("resumableInterviewsFeatureDesc")}</p>
            </div>
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

function BentoCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col gap-2 overflow-hidden rounded-3xl border border-white/50 bg-white/40 p-5 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_12px_40px_-20px_rgba(15,42,60,0.18)] transition-shadow hover:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_50px_-20px_rgba(15,42,60,0.25)] ${className}`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/40 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      {children}
    </motion.div>
  );
}

/* ---------- flow ---------- */
function FlowSection() {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("flowCapture"), body: t("flowCaptureDesc") },
    { n: "02", title: t("flowAnalyze"), body: t("flowAnalyzeDesc") },
    { n: "03", title: t("flowInterview"), body: t("flowInterviewDesc") },
    { n: "04", title: t("flowRefer"), body: t("flowReferDesc") },
  ];
  return (
    <section id="flow" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <SectionHeading
        eyebrow={t("flowEyebrow")}
        title={t("flowTitle")}
        subtitle={t("flowSubtitle")}
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl border border-white/50 bg-white/40 p-6 backdrop-blur-xl"
          >
            <span className="font-sans text-xs font-semibold tracking-[0.2em] text-foreground/40">
              {s.n}
            </span>
            <h3 className="mt-3 font-serif text-xl font-medium">{s.title}</h3>
            <p className="mt-2 font-sans text-sm text-foreground/65">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- privacy ---------- */
function PrivacySection() {
  const { t } = useI18n();
  const items = [t("privacyListItem1"), t("privacyListItem2"), t("privacyListItem3"), t("privacyListItem4"), t("privacyListItem5")];
  return (
    <section id="privacy" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-gradient-to-br from-[oklch(0.25_0.04_220)] via-[oklch(0.2_0.04_230)] to-[oklch(0.18_0.03_240)] p-8 text-white shadow-2xl sm:p-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(120,200,255,0.18),transparent_60%)]" />
        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-white/50">{t("privacy")}</p>
            <h2 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-5xl">
              {t("privacyTitle")}
            </h2>
            <p className="mt-5 max-w-md font-sans text-sm leading-relaxed text-white/65">
              {t("privacyDescLanding")}
            </p>
          </div>
          <ul className="space-y-3 font-sans text-sm">
            {items.map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------- stats ---------- */
function StatsSection() {
  const { t } = useI18n();
  const stats = [
    { v: t("statInference"), l: t("statInferenceLabel") },
    { v: t("statLanguages"), l: t("statLanguagesLabel") },
    { v: t("statParams"), l: t("statParamsLabel") },
    { v: t("statOffline"), l: t("statOfflineLabel") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/50 bg-white/40 p-4 backdrop-blur-xl sm:grid-cols-4 sm:p-10">
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
            className="text-center"
          >
            <p className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{s.v}</p>
            <p className="mt-1 font-sans text-xs text-foreground/60">{s.l}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- cta ---------- */
function CTASection({ authed }: { authed: boolean }) {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
          {t("ctaTitle")}
          <br />
          <span className="italic text-foreground/60">{t("ctaTitleItalic")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg font-sans text-base text-foreground/65">{t("ctaDesc")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={authed ? "/dashboard" : "/login"}
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 font-sans text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:shadow-xl"
          >
            {authed ? t("openTrij") : t("startFirstTriage")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------- footer ---------- */
function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-foreground/10 pt-8 font-sans text-xs text-foreground/50 sm:flex-row">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{t("copyright").replace("{year}", String(new Date().getFullYear()))}</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#privacy" className="hover:text-foreground">{t("footerPrivacy")}</a>
          <a href="#features" className="hover:text-foreground">{t("footerFeatures")}</a>
          <Link to="/login" className="hover:text-foreground">{t("signIn")}</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------- shared ---------- */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl text-center"
    >
      <p className="font-sans text-xs uppercase tracking-[0.22em] text-foreground/40">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-xl font-sans text-base text-foreground/60">{subtitle}</p>
      )}
    </motion.div>
  );
}
