import React, { useEffect, useRef, useState } from 'react';
import { formatDateDDMMYY, parseDateParts } from '../lib/dateFormat';

interface DateInputDDMMYYProps {
  /** Stored value as ISO YYYY-MM-DD ('' when empty/invalid). */
  value: string;
  onChange: (isoDate: string) => void;
  /** Earliest selectable date as ISO YYYY-MM-DD. */
  min?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Date input that ALWAYS shows DD/MM/YY.
 *
 * Why not <input type="date">? Its placeholder/display format is decided by
 * the browser/OS locale (US browsers show MM/DD/YY) and cannot be forced.
 * This component is a text input with placeholder "DD/MM/YY", auto-slashes
 * while typing, and it emits ISO YYYY-MM-DD to the parent so storage,
 * sorting and slot comparisons are unchanged.
 * Clicking anywhere in the field (not just the icon) opens the calendar
 * via a hidden native picker — press Esc to close it, then type DD/MM/YY.
 */
export const DateInputDDMMYY: React.FC<DateInputDDMMYYProps> = ({
  value,
  onChange,
  min,
  disabled = false,
  required = false,
  id,
  className = '',
  placeholder = 'DD/MM/YY',
}) => {
  const [display, setDisplay] = useState<string>(value ? formatDateDDMMYY(value) : '');
  const [error, setError] = useState<string>('');
  const focusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nativePickerRef = useRef<HTMLInputElement | null>(null);

  // Open the calendar from anywhere in the field. The native picker is
  // invisible (opacity-0, pointer-events-none) so its browser-locale
  // MM/DD/YY placeholder is never seen — it is only used to show the
  // calendar popup via showPicker().
  const openCalendar = () => {
    if (disabled) return;
    const picker = nativePickerRef.current;
    if (!picker) return;
    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    } catch {
      // Picker already open / not allowed right now — ignore.
      try {
        picker.focus();
      } catch {
        /* no-op */
      }
    }
  };

  // Sync when the parent changes the value externally (e.g. reset to today),
  // but don't clobber the user mid-typing.
  useEffect(() => {
    if (!focusedRef.current) {
      setDisplay(value ? formatDateDDMMYY(value) : '');
    }
  }, [value]);

  const emitParsed = (digits: string) => {
    // digits: DDMMYY (6) or DDMMYYYY (8)
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const rawYear = Number(digits.slice(4));
    const year = digits.length === 6 ? 2000 + rawYear : rawYear;

    // Real-calendar check (rejects 31/02/26, 00/13/26, …)
    const check = new Date(year, month - 1, day);
    const isReal =
      month >= 1 && month <= 12 &&
      check.getFullYear() === year &&
      check.getMonth() === month - 1 &&
      check.getDate() === day;

    if (!isReal) {
      setError('Invalid date — please enter a real date as DD/MM/YY');
      onChange('');
      return;
    }
    const iso = `${year}-${pad2(month)}-${pad2(day)}`;
    if (min && iso < min) {
      setError('Date cannot be in the past');
      onChange('');
      return;
    }
    setError('');
    onChange(iso);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!raw.trim()) {
      setDisplay('');
      setError('');
      onChange('');
      return;
    }

    // Paste of a full date (ISO, DD/MM/YYYY, …) — normalise it.
    const pasted = parseDateParts(raw.trim());
    if (pasted && raw.trim().length >= 8 && /\d{4}-\d{1,2}-\d{1,2}/.test(raw.trim())) {
      const iso = `${pasted.year}-${pad2(pasted.month)}-${pad2(pasted.day)}`;
      setDisplay(formatDateDDMMYY(iso));
      if (min && iso < min) {
        setError('Date cannot be in the past');
        onChange('');
      } else {
        setError('');
        onChange(iso);
      }
      return;
    }

    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let next = digits;
    if (digits.length > 4) {
      next = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      next = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setDisplay(next);

    if (digits.length === 6 || digits.length === 8) {
      emitParsed(digits);
    } else {
      // Still typing — clear the stored value so an incomplete date
      // can never be submitted as if it were the previous date.
      setError('');
      onChange('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    const parsed = parseDateParts(text);
    if (parsed) {
      e.preventDefault();
      const iso = `${parsed.year}-${pad2(parsed.month)}-${pad2(parsed.day)}`;
      setDisplay(formatDateDDMMYY(iso));
      if (min && iso < min) {
        setError('Date cannot be in the past');
        onChange('');
      } else {
        setError('');
        onChange(iso);
      }
    }
  };

  const handleBlur = () => {
    focusedRef.current = false;
    const digits = display.replace(/\D/g, '');
    if (display && digits.length < 6) {
      setError('Enter full date as DD/MM/YY');
      onChange('');
    } else if (!display) {
      setError('');
      onChange('');
    }
  };

  const handleNativePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (!iso) return;
    setDisplay(formatDateDDMMYY(iso));
    if (min && iso < min) {
      setError('Date cannot be in the past');
      onChange('');
    } else {
      setError('');
      onChange(iso);
    }
    // Return focus to the DD/MM/YY text field after picking, so the user
    // can keep typing / submit without another click.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Esc closes the native calendar — put focus back on the text field so
  // typing DD/MM/YY works straight away.
  const handleNativeCancel = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Date (DD/MM/YY) — click to open calendar"
          title="Click to open calendar, or type DD/MM/YY"
          value={display}
          onChange={handleChange}
          onPaste={handlePaste}
          onClick={openCalendar}
          onFocus={() => {
            focusedRef.current = true;
            inputRef.current?.select();
          }}
          onBlur={handleBlur}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs pr-11 cursor-pointer"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--sc-text-dim)]">
          <span className="material-symbols-outlined text-base leading-none">calendar_month</span>
        </span>
        {!disabled && (
          <input
            ref={nativePickerRef}
            type="date"
            aria-hidden="true"
            tabIndex={-1}
            value={value || ''}
            min={min}
            onChange={handleNativePick}
            onCancel={handleNativeCancel}
            className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          />
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
};

export default DateInputDDMMYY;
