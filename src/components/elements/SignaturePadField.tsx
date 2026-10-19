import { useCallback, useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { LuEraser } from 'react-icons/lu';
import type { SignatureSubmission } from '../../types/signingDocument';

/** Local YYYY-MM-DD (not UTC — "today" should match the signer's calendar). */
export function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface SignaturePadFieldProps {
  defaultName?: string;
  /** Called with a complete submission, or null while drawing/name is missing. */
  onChange: (value: SignatureSubmission | null) => void;
}

/**
 * Hand-drawn signature (mouse, pen or finger) plus full name and date
 * (defaults to today). Produces a PNG data URL the API stores in S3.
 */
export function SignaturePadField({ defaultName = '', onChange }: SignaturePadFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(todayIsoDate);

  const emit = useCallback(
    (drawn: boolean, signedName: string, signatureDate: string) => {
      const pad = padRef.current;
      if (!pad || !drawn || !signedName.trim() || !signatureDate) {
        onChange(null);
        return;
      }
      onChange({ signatureDataUrl: pad.toDataURL('image/png'), signedName: signedName.trim(), signatureDate });
    },
    [onChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, { penColor: '#0f172a', minWidth: 0.8, maxWidth: 2.4 });
    padRef.current = pad;

    // Match the backing store to the CSS size × devicePixelRatio, or strokes come out blurry/offset.
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
      pad.fromData(data);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      pad.off();
      padRef.current = null;
    };
  }, []);

  // Re-read the latest name/date inside the pad's stroke listener.
  const latest = useRef({ name, date });
  latest.current = { name, date };

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    const onEnd = () => {
      setHasDrawing(true);
      emit(true, latest.current.name, latest.current.date);
    };
    pad.addEventListener('endStroke', onEnd);
    return () => pad.removeEventListener('endStroke', onEnd);
  }, [emit]);

  const clear = () => {
    padRef.current?.clear();
    setHasDrawing(false);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Draw your signature</span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <LuEraser size={12} /> Clear
          </button>
        </div>
        <div className="relative rounded-md border border-dashed border-slate-300 bg-white dark:border-slate-600">
          <canvas ref={canvasRef} className="block h-44 w-full touch-none rounded-md" aria-label="Signature pad" />
          {!hasDrawing && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Sign here with your mouse, pen or finger
            </span>
          )}
          <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-slate-300" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Full name
          <input
            type="text"
            value={name}
            maxLength={150}
            onChange={(e) => {
              setName(e.target.value);
              emit(hasDrawing, e.target.value, date);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              emit(hasDrawing, name, e.target.value);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>
    </div>
  );
}

export default SignaturePadField;
