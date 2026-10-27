export default function FormRow({ label, htmlFor, required = false, hint, error, children }) {
  return (
    <div className={`form-row ${error ? 'form-row--error' : ''}`}>
      <div className="form-row__label">
        <label htmlFor={htmlFor}>
          {required && <span className="form-row__required">*</span>}
          {label}
        </label>
        {hint && <p className="form-row__hint">{hint}</p>}
      </div>
      <div className="form-row__control">
        {children}
        {error && <p className="field__error">{error}</p>}
      </div>
    </div>
  );
}
