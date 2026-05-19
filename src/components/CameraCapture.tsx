import { useEffect, useRef, useState } from "react";
import { Camera, RotateCw, X, Loader2, Sun, Moon, AlertTriangle, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compressImage,
  analyzeVideoFrame,
  readFileAsDataURL,
  validateImageType,
  type FrameAnalysis,
} from "@/lib/camera";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel?: () => void;
  onSource?: (source: "camera" | "gallery") => void;
}

export function CameraCapture({ onCapture, onCancel, onSource }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [analysis, setAnalysis] = useState<FrameAnalysis | null>(null);
  const [forceCapture, setForceCapture] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const analysisRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        setCameraAvailable(devices.some((d) => d.kind === "videoinput"));
      })
      .catch(() => {
        setCameraAvailable(false);
      });
  }, []);

  useEffect(() => {
    if (cameraAvailable === false) return;
    let active = true;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        setError((e as Error).message);
      }
    };
    start();
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, cameraAvailable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    analysisRef.current = setInterval(() => {
      if (v.readyState >= 2) {
        setAnalysis(analyzeVideoFrame(v));
      }
    }, 1000);
    return () => {
      if (analysisRef.current) clearInterval(analysisRef.current);
    };
  }, []);

  const processImage = async (dataUrl: string, source: "camera" | "gallery") => {
    setCompressing(true);
    const compressed = await compressImage(dataUrl);
    setCompressing(false);
    onSource?.(source);
    onCapture(compressed);
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.85);
    stream?.getTracks().forEach((t) => t.stop());
    await processImage(raw, "camera");
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageType(file)) {
      toast.error(t("uploadPhoto") + ": JPEG, PNG, WebP only");
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      await processImage(dataUrl, "gallery");
    } catch {
      toast.error(t("failedPrefix") + t("uploadPhoto"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canAutoCapture = analysis && !analysis.isBlurry && !analysis.isTooDark;
  const showWarning = analysis && (analysis.isBlurry || analysis.isTooDark) && !forceCapture;

  if (cameraAvailable === false || error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <ImageUp className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {cameraAvailable === false
              ? t("uploadFromGallery")
              : `${t("cameraUnavailable")}: ${error}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("uploadPhoto")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleGallerySelect}
          />
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
          >
            {compressing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="mr-2 h-4 w-4" />
            )}
            {t("uploadFromGallery")}
          </Button>
        </div>
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              {t("cameraUnavailable")}: {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-[3/4] w-full object-cover"
      />

      {analysis && (
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-center justify-between gap-2">
          {analysis.isTooDark ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-urgency-yellow/90 px-3 py-1 text-xs font-medium text-black backdrop-blur">
              <Moon className="h-3.5 w-3.5" />
              {t("lowLight")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Sun className="h-3.5 w-3.5" />
              {t("goodLighting")}
            </span>
          )}
          {analysis.isBlurry ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-urgency-red/90 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("blurry")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {t("sharp")}
            </span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/40" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />

      {compressing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">{t("compressingImage")}</p>
        </div>
      )}

      {showWarning && (
        <div
          className="pointer-events-none absolute left-3 right-3 z-10 rounded-xl bg-black/70 p-3 text-center text-xs text-white/90 backdrop-blur-sm"
          style={{ bottom: "6rem" }}
        >
          {analysis.isTooDark && <p>{t("sceneTooDark")}</p>}
          {analysis.isBlurry && <p>{t("holdSteady")}</p>}
          <button
            className="pointer-events-auto mt-1 text-primary underline"
            onClick={() => setForceCapture(true)}
          >
            {t("captureAnyway")}
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-5">
        {onCancel ? (
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <span className="w-10" />
        )}
        <button
          onClick={capture}
          className={`grid h-16 w-16 place-items-center rounded-full shadow-xl ring-4 transition active:scale-95 ${
            canAutoCapture || forceCapture ? "bg-white ring-white/40" : "bg-white/60 ring-white/20"
          }`}
          aria-label={t("capturePhoto")}
        >
          <Camera
            className={`h-7 w-7 ${canAutoCapture || forceCapture ? "text-primary" : "text-muted-foreground"}`}
          />
        </button>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleGallerySelect}
          />
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
            title={t("uploadFromGallery")}
            aria-label={t("uploadFromGallery")}
          >
            <ImageUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
