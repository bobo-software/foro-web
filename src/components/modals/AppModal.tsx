import { useEffect, useCallback } from 'react';
import { LuX } from 'react-icons/lu';

// ── Button definition ────────────────────────────────────────────────────────

export type ModalButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ModalButton {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ModalButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
}

// ── Size map ─────────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] w-full',
};

const VARIANT_CLASS: Record<ModalButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50',
  secondary:
    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50',
  danger:
    'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white disabled:opacity-50',
  ghost:
    'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50',
};

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Modal heading */
  title: string;
  /** Optional icon shown left of the title */
  titleIcon?: React.ReactNode;
  /** Secondary line under the title */
  subtitle?: React.ReactNode;
  /**
   * Replaces the default header chrome (border and surface).
   * Title and close button inherit the header text color.
   */
  headerClassName?: string;
  /** Body content */
  children: React.ReactNode;
  /** sm | md | lg | xl | 2xl | full  (default: md) */
  size?: keyof typeof SIZE_CLASS;
  /**
   * Structured footer buttons rendered right-aligned.
   * Ignored if `footer` is provided.
   */
  buttons?: ModalButton[];
  /**
   * Fully custom footer JSX — overrides `buttons`.
   * Pass `null` to render no footer at all.
   */
  footer?: React.ReactNode | null;
  /** Close when clicking the backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Show the × close button in the header (default: true) */
  showCloseButton?: boolean;
  /** Max height of the body before it starts scrolling (default: 70vh) */
  maxBodyHeight?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppModal({
  isOpen,
  onClose,
  title,
  titleIcon,
  subtitle,
  headerClassName,
  children,
  size = 'md',
  buttons,
  footer,
  closeOnBackdrop = true,
  showCloseButton = true,
  maxBodyHeight = '70vh',
}: AppModalProps) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) onClose();
  }, [closeOnBackdrop, onClose]);

  if (!isOpen) return null;

  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.md;

  // Determine whether to render a footer
  const showFooter = footer !== null && (footer !== undefined || (buttons && buttons.length > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={handleBackdropClick}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className={`relative z-10 w-full ${sizeClass} bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* ── Header ── */}
        <div
          className={`flex items-center justify-between gap-3 px-5 py-4 shrink-0 ${
            headerClassName ?? 'border-b border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {titleIcon && (
              <span className={`shrink-0 ${headerClassName ? 'text-current' : 'text-slate-500 dark:text-slate-400'}`}>
                {titleIcon}
              </span>
            )}
            <div className="min-w-0">
              <h2
                id="app-modal-title"
                className={`text-base font-semibold truncate ${
                  headerClassName ? 'text-inherit' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {title}
              </h2>
              {subtitle != null && subtitle !== '' && (
                <p
                  className={`text-xs mt-0.5 truncate ${
                    headerClassName ? 'text-inherit opacity-80' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                headerClassName
                  ? 'text-current hover:bg-white/15'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label="Close"
            >
              <LuX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div
          className="overflow-y-auto px-5 py-4 flex-1"
          style={{ maxHeight: maxBodyHeight }}
        >
          {children}
        </div>

        {/* ── Footer ── */}
        {showFooter && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
            {footer !== undefined ? (
              footer
            ) : (
              buttons?.map((btn, idx) => (
                <button
                  key={idx}
                  type={btn.type ?? 'button'}
                  onClick={btn.onClick}
                  disabled={btn.disabled || btn.loading}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${VARIANT_CLASS[btn.variant ?? 'secondary']}`}
                >
                  {btn.loading ? <Spinner /> : btn.icon}
                  {btn.loading ? (btn.loadingLabel ?? btn.label) : btn.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppModal;
