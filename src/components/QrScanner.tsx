import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Loader2, CameraOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  t: (key: string) => string;
}

export function QrScanner({ onScan, onError, t }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"init" | "scanning" | "error" | "success">("init");
  const [errorMsg, setErrorMsg] = useState("");
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setStatus("init");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
      scanningRef.current = true;
      requestAnimationFrame(scanFrame);
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? (t("qrCameraDenied") || "Camera access denied")
        : (t("qrCameraError") || "Could not open camera");
      setErrorMsg(msg);
      setStatus("error");
      onError?.(msg);
    }
  }, [onError, t]);

  const scanFrame = () => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
    if (code) {
      scanningRef.current = false;
      setStatus("success");
      stopCamera();
      onScan(code.data);
    } else {
      requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className={status === "scanning" ? "block h-72 w-full object-cover" : "hidden"}
      />
      <canvas ref={canvasRef} className="hidden" />
      {status === "init" && (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      {status === "scanning" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-xl border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
        </div>
      )}
      {status === "error" && (
        <div className="flex h-72 flex-col items-center justify-center gap-3 px-4 text-center">
          <CameraOff className="h-10 w-10 text-red-400" />
          <p className="text-sm text-white">{errorMsg}</p>
          <Button
            onClick={startCamera}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" /> {t("qrRetry") || "Retry"}
          </Button>
        </div>
      )}
      {status === "success" && (
        <div className="flex h-72 items-center justify-center">
          <p className="text-sm text-emerald-400">{t("qrScanned") || "QR scanned!"}</p>
        </div>
      )}
      {!navigator?.mediaDevices?.getUserMedia && (
        <div className="flex h-72 flex-col items-center justify-center px-4 text-center">
          <CameraOff className="mb-2 h-10 w-10 text-red-400" />
          <p className="text-xs text-white/70">{t("qrNoCamera") || "Camera not available on this device"}</p>
        </div>
      )}
    </div>
  );
}
