import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw, RotateCcw, Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface Props {
  image: string;
  onConfirm: (croppedDataUrl: string) => void;
  onRetake: () => void;
}

type DragHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "move" | null;

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_CROP = 10;

export function ImageEditor({ image, onConfirm, onRetake }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<CropRect | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const initCrop = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const w = Math.min(img.naturalWidth, cw * 0.85);
    const h = Math.min(img.naturalHeight, ch * 0.75);
    const margin = 16;
    const cropW = Math.max(w - margin * 2, 60);
    const cropH = Math.max(h - margin * 2, 60);
    const cropX = (cw - cropW) / 2;
    const cropY = (ch - cropH) / 2;
    setCrop({ x: cropX, y: cropY, width: cropW, height: cropH });
    setImgLoaded(true);
  }, []);

  const getPointerPos = (e: React.PointerEvent | PointerEvent) => {
    const c = containerRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!crop) return;
    const pos = getPointerPos(e);
    const handle = getHandleAt(pos, crop);
    if (!handle) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragHandle(handle);
    setDragStart(pos);
    setDragRect({ ...crop });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragHandle || !dragStart || !dragRect || !crop) return;
    const pos = getPointerPos(e);
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;
    const ctr = containerRef.current;
    if (!ctr) return;
    const cw = ctr.clientWidth;
    const ch = ctr.clientHeight;

    let newCrop = { ...dragRect };

    if (dragHandle === "move") {
      newCrop.x = Math.max(0, Math.min(cw - newCrop.width, dragRect.x + dx));
      newCrop.y = Math.max(0, Math.min(ch - newCrop.height, dragRect.y + dy));
    } else {
      const handleDirs: Record<
        string,
        { left: boolean; right: boolean; top: boolean; bottom: boolean }
      > = {
        "top-left": { left: true, right: false, top: true, bottom: false },
        "top-right": { left: false, right: true, top: true, bottom: false },
        "bottom-left": { left: true, right: false, top: false, bottom: true },
        "bottom-right": { left: false, right: true, top: false, bottom: true },
      };
      const dirs = handleDirs[dragHandle];
      let { x, y, width, height } = dragRect;
      if (dirs.left) {
        const nx = Math.max(0, Math.min(x + width - MIN_CROP, x + dx));
        width = width + (x - nx);
        x = nx;
      }
      if (dirs.right) {
        width = Math.max(MIN_CROP, Math.min(cw - x, width + dx));
      }
      if (dirs.top) {
        const ny = Math.max(0, Math.min(y + height - MIN_CROP, y + dy));
        height = height + (y - ny);
        y = ny;
      }
      if (dirs.bottom) {
        height = Math.max(MIN_CROP, Math.min(ch - y, height + dy));
      }
      newCrop = { x, y, width, height };
    }

    setCrop(newCrop);
  };

  const handlePointerUp = () => {
    setDragHandle(null);
    setDragStart(null);
    setDragRect(null);
  };

  const rotate = (dir: 1 | -1) => {
    setRotation((r) => (r + dir * 90 + 360) % 360);
  };

  const handleConfirm = () => {
    const ctr = containerRef.current;
    const img = imgRef.current;
    if (!ctr || !img || !crop) return;
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    const scaleX = img.naturalWidth / displayW;
    const scaleY = img.naturalHeight / displayH;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rot = rotation * (Math.PI / 180);
    const srcX = crop.x * scaleX;
    const srcY = crop.y * scaleY;
    const srcW = crop.width * scaleX;
    const srcH = crop.height * scaleY;

    if (rotation === 90 || rotation === 270) {
      canvas.width = srcH;
      canvas.height = srcW;
    } else {
      canvas.width = srcW;
      canvas.height = srcH;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rot);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  };

  const getHandleAt = (pos: { x: number; y: number }, rect: CropRect): DragHandle => {
    const handleSize = 20;
    const half = handleSize / 2;
    const corners: { name: DragHandle; x: number; y: number }[] = [
      { name: "top-left", x: rect.x, y: rect.y },
      { name: "top-right", x: rect.x + rect.width, y: rect.y },
      { name: "bottom-left", x: rect.x, y: rect.y + rect.height },
      { name: "bottom-right", x: rect.x + rect.width, y: rect.y + rect.height },
    ];
    for (const c of corners) {
      if (Math.abs(pos.x - c.x) < handleSize && Math.abs(pos.y - c.y) < handleSize) {
        return c.name;
      }
    }
    if (
      pos.x >= rect.x &&
      pos.x <= rect.x + rect.width &&
      pos.y >= rect.y &&
      pos.y <= rect.y + rect.height
    ) {
      return "move";
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-black touch-none"
        style={{ minHeight: 300, maxHeight: "70vh" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={image}
          alt={t("medicalImagePreview")}
          onLoad={initCrop}
          className="block w-full select-none"
          draggable={false}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.2s ease",
          }}
        />
        {imgLoaded && crop && (
          <>
            <div
              className="absolute inset-0 bg-black/50 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%,
                  100% 0%,
                  100% 100%,
                  0% 100%,
                  0% 0%,
                  ${crop.x}px ${crop.y}px,
                  ${crop.x}px ${crop.y + crop.height}px,
                  ${crop.x + crop.width}px ${crop.y + crop.height}px,
                  ${crop.x + crop.width}px ${crop.y}px,
                  ${crop.x}px ${crop.y}px
                )`,
              }}
            />
            <div
              className="absolute border-2 border-white pointer-events-none"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
              }}
            />
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((name) => {
              const isLeft = name.endsWith("left");
              const isTop = name.startsWith("top");
              return (
                <div
                  key={name}
                  className="absolute h-5 w-5 border-2 border-white bg-white/30 pointer-events-none"
                  style={{
                    left: isLeft ? crop.x - 2 : crop.x + crop.width - 18,
                    top: isTop ? crop.y - 2 : crop.y + crop.height - 18,
                    cursor:
                      isTop && isLeft
                        ? "nwse-resize"
                        : isTop && !isLeft
                          ? "nesw-resize"
                          : !isTop && isLeft
                            ? "nesw-resize"
                            : "nwse-resize",
                  }}
                />
              );
            })}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => rotate(-1)}
          title={t("rotateCounterClockwise")}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="min-w-[4rem] text-center text-xs text-muted-foreground">{rotation}°</span>
        <Button variant="outline" size="icon" onClick={() => rotate(1)} title={t("rotateClockwise")}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" onClick={onRetake} className="gap-2">
          <Undo2 className="h-4 w-4" /> {t("retake")}
        </Button>
        <Button onClick={handleConfirm} className="gap-2">
          <Check className="h-4 w-4" /> {t("useThisCrop")}
        </Button>
      </div>
    </div>
  );
}
