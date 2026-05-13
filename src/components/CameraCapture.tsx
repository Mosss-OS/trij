import { useEffect, useRef, useState } from "react";
import { Camera, RotateCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/camera";

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
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
  }, [facing]);

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
    setCompressing(true);
    const compressed = await compressImage(raw);
    setCompressing(false);
    onCapture(compressed);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">Camera unavailable: {error}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Check permissions or use the file upload below.
        </p>
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
      {/* framing guides */}
      <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/40" />
      {compressing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Compressing image...</p>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-5">
        {onCancel ? (
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <span className="w-10" />
        )}
        <button
          onClick={capture}
          className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-xl ring-4 ring-white/40 transition active:scale-95"
          aria-label="Capture photo"
        >
          <Camera className="h-7 w-7 text-primary" />
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
        >
          <RotateCw className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
