"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  currentUrl: string;
  onUploaded: (url: string) => void;
}

const ASPECT = 16 / 9;
const OUT_W  = 1280;
const OUT_H  = 720;

interface CropState {
  src: string;
  x: number;
  y: number;
  w: number; // crop width in display px; height = w / ASPECT
  dragging: boolean;
  dragStart: { mx: number; my: number; x: number; y: number } | null;
  resizing: boolean;
  resizeStart: { mx: number; my: number; w: number } | null;
  naturalW: number;
  naturalH: number;
  displayW: number;
  displayH: number;
}

export default function CoverUpload({ currentUrl, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLImageElement>(null);
  const [crop, setCrop]         = useState<CropState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const openPicker = () => fileRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let displayW = Math.min(480, img.naturalWidth);
      let displayH = Math.round((img.naturalHeight / img.naturalWidth) * displayW);
      if (displayH > 360) {
        displayH = 360;
        displayW = Math.round((img.naturalWidth / img.naturalHeight) * displayH);
      }
      // Initial 16:9 crop box centered in the display area
      let w = displayW;
      let h = Math.round(w / ASPECT);
      if (h > displayH) { h = displayH; w = Math.round(h * ASPECT); }
      const x = Math.round((displayW - w) / 2);
      const y = Math.round((displayH - h) / 2);
      setCrop({ src, x, y, w, dragging: false, dragStart: null, resizing: false, resizeStart: null, naturalW: img.naturalWidth, naturalH: img.naturalHeight, displayW, displayH });
    };
    img.src = src;
    e.target.value = "";
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const onMouseDown = useCallback((e: React.MouseEvent, mode: "drag" | "resize") => {
    e.preventDefault();
    setCrop((prev) => {
      if (!prev) return prev;
      if (mode === "drag") return { ...prev, dragging: true, dragStart: { mx: e.clientX, my: e.clientY, x: prev.x, y: prev.y } };
      return { ...prev, resizing: true, resizeStart: { mx: e.clientX, my: e.clientY, w: prev.w } };
    });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setCrop((prev) => {
      if (!prev) return prev;
      if (prev.dragging && prev.dragStart) {
        const h = Math.round(prev.w / ASPECT);
        return {
          ...prev,
          x: clamp(prev.dragStart.x + (e.clientX - prev.dragStart.mx), 0, prev.displayW - prev.w),
          y: clamp(prev.dragStart.y + (e.clientY - prev.dragStart.my), 0, prev.displayH - h),
        };
      }
      if (prev.resizing && prev.resizeStart) {
        const maxW = Math.min(prev.displayW - prev.x, (prev.displayH - prev.y) * ASPECT);
        const newW = clamp(prev.resizeStart.w + (e.clientX - prev.resizeStart.mx), 60, maxW);
        return { ...prev, w: newW };
      }
      return prev;
    });
  }, []);

  const onMouseUp = useCallback(() => {
    setCrop((prev) => prev ? { ...prev, dragging: false, dragStart: null, resizing: false, resizeStart: null } : prev);
  }, []);

  const confirm = async () => {
    if (!crop || !imgRef.current) return;
    setUploading(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width  = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d")!;
      const scaleX = crop.naturalW / crop.displayW;
      const scaleY = crop.naturalH / crop.displayH;
      const cropH  = Math.round(crop.w / ASPECT);
      ctx.drawImage(imgRef.current, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, cropH * scaleY, 0, 0, OUT_W, OUT_H);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.88)
      );
      const fd = new FormData();
      fd.append("file", blob, "cover.jpg");
      const res  = await fetch("/api/admin/upload/cover", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      onUploaded(data.url);
      setCrop(null);
    } catch (err: any) {
      setError(err.message ?? "خطأ في الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      <div className="flex items-center gap-4 mb-3">
        {currentUrl ? (
          <img src={currentUrl} alt="" className="w-32 h-[72px] rounded-lg object-cover shrink-0" style={{ border: "2px solid #C9A844" }} />
        ) : (
          <div className="w-32 h-[72px] rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(201,168,68,0.1)", border: "2px dashed #2E2A18" }}>
            <span style={{ color: "#9A9070", fontSize: 11 }}>16:9</span>
          </div>
        )}
        <button
          type="button"
          onClick={openPicker}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
          style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.06)" }}
        >
          {currentUrl ? "تغيير الصورة" : "رفع صورة"}
        </button>
      </div>

      {error && <p className="text-xs mb-2" style={{ color: "#FF6B6B" }}>{error}</p>}

      {crop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="rounded-2xl p-6 max-w-lg w-full mx-4 overflow-y-auto" style={{ background: "#1A1810", border: "1px solid #2E2A18", maxHeight: "90vh" }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: "#C9A844" }}>اقتصاص صورة الغلاف (16:9 — {OUT_W}×{OUT_H})</h3>
            <p className="text-xs mb-4" style={{ color: "#9A9070" }}>اسحب الإطار لتحديد المنطقة، واسحب الزاوية لتغيير الحجم</p>

            <div
              className="relative mx-auto overflow-hidden select-none"
              style={{ width: crop.displayW, height: crop.displayH, cursor: "crosshair" }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <img
                ref={imgRef}
                src={crop.src}
                alt=""
                style={{ width: crop.displayW, height: crop.displayH, display: "block", pointerEvents: "none" }}
                draggable={false}
              />
              {(() => {
                const h = Math.round(crop.w / ASPECT);
                return (
                  <>
                    <div className="absolute inset-x-0 top-0"           style={{ height: crop.y,           background: "rgba(0,0,0,0.55)" }} />
                    <div className="absolute inset-x-0"                 style={{ top: crop.y + h, bottom: 0, background: "rgba(0,0,0,0.55)" }} />
                    <div className="absolute"                            style={{ top: crop.y, left: 0, width: crop.x, height: h, background: "rgba(0,0,0,0.55)" }} />
                    <div className="absolute"                            style={{ top: crop.y, left: crop.x + crop.w, right: 0, height: h, background: "rgba(0,0,0,0.55)" }} />
                    <div
                      className="absolute"
                      style={{ left: crop.x, top: crop.y, width: crop.w, height: h, border: "2px solid #C9A844", cursor: "move", boxSizing: "border-box" }}
                      onMouseDown={(e) => onMouseDown(e, "drag")}
                    >
                      <div
                        className="absolute w-4 h-4 rounded-full"
                        style={{ bottom: -8, right: -8, background: "#C9A844", cursor: "se-resize" }}
                        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, "resize"); }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={confirm} disabled={uploading}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
                {uploading ? "جارٍ الرفع..." : "تأكيد واستخدام الصورة"}
              </button>
              <button type="button" onClick={() => setCrop(null)}
                className="px-5 py-2.5 rounded-full text-sm border"
                style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
