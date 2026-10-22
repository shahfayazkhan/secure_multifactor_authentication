import { useEffect, useRef } from 'react';

/**
 * Six separate digit boxes with keyboard navigation, paste support and
 * mobile one-time-code autofill. Calls onComplete when all digits are filled.
 */
export default function OtpInput({ value, onChange, onComplete, length = 6, disabled, autoFocus = true, error }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const update = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (!v) return;
    // Autofill / paste of the whole code into one box
    if (v.length > 1) {
      update(v);
      refs.current[Math.min(v.length, length) - 1]?.focus();
      return;
    }
    const arr = [...digits];
    arr[i] = v;
    update(arr.join(''));
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = [...digits];
      if (arr[i]) {
        arr[i] = '';
        onChange(arr.join(''));
      } else if (i > 0) {
        arr[i - 1] = '';
        onChange(arr.join(''));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      update(pasted);
      refs.current[Math.min(pasted.length, length) - 1]?.focus();
    }
  };

  return (
    <div className={`otp ${error ? 'otp-error' : ''}`} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`otp-box ${d ? 'filled' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          value={d}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
