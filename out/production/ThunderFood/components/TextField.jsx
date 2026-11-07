import { useState } from 'react';
import Icon from './Icon.jsx';

export default function TextField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  placeholder,
  autoComplete,
  autoFocus = false,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={name}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="field__input"
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {error ? (
        <p className="field__error" id={`${name}-error`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${name}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
