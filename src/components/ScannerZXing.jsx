import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/browser";

/**
 * Escáner de cámara con ZXing:
 * - Soporta QR, EAN-13, EAN-8, UPC, Code-128, Code-39, etc.
 * - Usa la cámara trasera si existe.
 * Props:
 *  - onResult(text: string)
 *  - onClose()
 */
export default function ScannerZXing({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Empieza a decodificar desde la cámara
    reader
      .decodeFromVideoDevice(
        null, // cámara por defecto (usará la trasera si existe)
        videoRef.current,
        (result, err) => {
          if (stoppedRef.current) return;

          if (result) {
            const text = result.getText();
            stoppedRef.current = true;
            try { reader.reset(); } catch {}
            onResult?.(text);
            onClose?.();
          }
          // err puede ser NotFoundException en frames sin código; lo ignoramos
          if (err && !(err instanceof NotFoundException)) {
            console.debug("ZXing error:", err?.message || err);
          }
        },
        {
          video: {
            facingMode: { ideal: "environment" }, // cámara trasera
          },
        }
      )
      .catch((e) => console.error("ZXing init error:", e));

    // Limpieza
    return () => {
      stoppedRef.current = true;
      try { reader.reset(); } catch {}
    };
  }, [onResult, onClose]);

  return (
    <div className="w-full">
      <video
        ref={videoRef}
        className="w-full rounded border"
        autoPlay
        muted
        playsInline
      />
    </div>
  );
}
