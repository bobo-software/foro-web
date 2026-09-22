import React, { useEffect, useId, useRef, useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import {
  composePhone,
  DEFAULT_PHONE_COUNTRY,
  filterPhoneCountries,
  flagEmoji,
  getPhoneCountry,
  nationalDigits,
  parsePhoneValue,
  validatePhone,
} from './phone';

interface AppLabeledPhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** ISO 3166-1 alpha-2 used when `value` has no country code. Defaults to ZA. */
  defaultCountry?: string;
  placeholder?: string;
  name?: string;
}

const fieldClass = `
  bg-white dark:bg-slate-800 border
  text-slate-700 dark:text-slate-100 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  dark:focus:ring-indigo-400 dark:focus:border-indigo-400
  disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
`;

const AppLabeledPhoneInput: React.FC<AppLabeledPhoneInputProps> = ({
  label,
  value,
  onChange,
  id,
  required = false,
  disabled = false,
  error,
  className = '',
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  placeholder = 'Phone number',
  name,
}) => {
  const reactId = useId();
  const inputId = id ?? `${reactId}-phone`;
  const listId = `${inputId}-countries`;
  const rootRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const isoRef = useRef(defaultCountry);
  const nationalRef = useRef('');

  const [iso, setIso] = useState(() => parsePhoneValue(value, defaultCountry).iso);
  const [national, setNational] = useState(() => parsePhoneValue(value, defaultCountry).national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [touched, setTouched] = useState(false);

  isoRef.current = iso;
  nationalRef.current = national;

  useEffect(() => {
    const current = composePhone(isoRef.current, nationalRef.current);
    if ((value || '') === current) return;
    const next = parsePhoneValue(value, value.trim() ? isoRef.current : defaultCountry);
    setIso(next.iso);
    setNational(next.national);
  }, [value, defaultCountry]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const country = getPhoneCountry(iso);
  const countries = filterPhoneCountries(query);
  const digitsLeft = Math.max(country.min - national.length, 0);
  const overMax = national.length > country.max;
  const localError = touched ? validatePhone(composePhone(iso, national), { required }) : null;
  const shownError = error || localError || undefined;
  const border = shownError ? 'border-red-500' : 'border-slate-200 dark:border-slate-600';

  const selectCountry = (nextIso: string) => {
    setIso(nextIso);
    setOpen(false);
    setQuery('');
    onChange(composePhone(nextIso, national));
    numberRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex">
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((prev) => !prev)}
            className={`
              ${fieldClass} ${border}
              flex h-full items-center gap-1.5 rounded-l-lg border-r-0 px-2.5 py-1.5
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span aria-hidden className="text-base leading-none">{flagEmoji(country.iso)}</span>
            <span>+{country.dial}</span>
            <LuChevronDown size={14} className="text-slate-400" aria-hidden />
          </button>

          {open && !disabled && (
            <div className="absolute z-30 mt-1 w-72 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
              <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                <input
                  type="text"
                  value={query}
                  autoFocus
                  placeholder="Search country or code"
                  aria-label="Search countries"
                  onChange={(event) => setQuery(event.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-md ${fieldClass} border-slate-200 dark:border-slate-600`}
                />
              </div>
              <ul id={listId} role="listbox" aria-label="Country codes" className="max-h-60 overflow-y-auto py-1">
                {countries.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No countries match.</li>
                ) : (
                  countries.map((option) => {
                    const selected = option.iso === iso;
                    return (
                      <li key={option.iso} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          onClick={() => selectCountry(option.iso)}
                          className={`
                            flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm
                            text-slate-700 dark:text-slate-100
                            hover:bg-slate-50 dark:hover:bg-slate-700
                            ${selected ? 'bg-slate-100 dark:bg-slate-700' : ''}
                          `}
                        >
                          <span aria-hidden className="text-base leading-none">{flagEmoji(option.iso)}</span>
                          <span className="min-w-0 flex-1 truncate">{option.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">+{option.dial}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="relative min-w-0 flex-1">
          <input
            ref={numberRef}
            id={inputId}
            name={name}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            required={required}
            placeholder={placeholder === 'Phone number' ? '•'.repeat(country.max) : placeholder}
            value={national}
            aria-invalid={shownError ? 'true' : 'false'}
            aria-describedby={
              [shownError ? `${inputId}-error` : null, `${inputId}-digits`].filter(Boolean).join(' ') ||
              undefined
            }
            onChange={(event) => {
              const next = event.target.value.replace(/[^\d]/g, '');
              setNational(next);
              onChange(composePhone(iso, next));
            }}
            onBlur={() => {
              setTouched(true);
              const stripped = nationalDigits(national);
              if (stripped !== national) {
                setNational(stripped);
                onChange(composePhone(iso, stripped));
              }
            }}
            className={`${fieldClass} ${border} w-full rounded-r-lg px-3 py-1.5 pr-20`}
          />
          <span
            id={`${inputId}-digits`}
            aria-live="polite"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400 dark:text-slate-500 tabular-nums"
          >
            {digitsLeft > 0
              ? `${digitsLeft} left`
              : overMax
                ? `${national.length - country.max} over`
                : national.length >= country.min
                  ? '✓'
                  : ''}
          </span>
        </div>
      </div>

      {shownError && (
        <p id={`${inputId}-error`} className="text-sm text-red-500 mt-1">
          {shownError}
        </p>
      )}
    </div>
  );
};

export default AppLabeledPhoneInput;
