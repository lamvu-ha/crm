import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

// <input type="date"> follows the browser language (en-US shows mm/dd/yyyy); this field always shows dd/mm/yyyy.
const isoToVN = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');

function vnToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const valid = date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
  return valid ? `${year}-${month}-${day}` : null;
}

// Insert the slashes while typing: "04102026" -> "04/10/2026".
function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

interface DateInputVNProps {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function DateInputVN({ value, onChange, required, className = '', ariaLabel }: DateInputVNProps) {
  const [text, setText] = useState(isoToVN(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => setText(isoToVN(value)), [value]);

  const handleType = (raw: string) => {
    const masked = maskDigits(raw);
    setText(masked);
    const iso = vnToIso(masked);
    if (iso) onChange(iso);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.click();
    }
  };

  const isInvalid = text.length === 10 && !vnToIso(text);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => handleType(e.target.value)}
        onBlur={() => { if (!vnToIso(text)) setText(isoToVN(value)); }}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Nhập ngày theo dạng ngày/tháng/năm, ví dụ 04/10/2026"
        required={required}
        className={`${className} pr-10 ${isInvalid ? 'border-rose-400' : ''}`}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Mở lịch chọn ngày"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
      >
        <CalendarDays size={16} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
