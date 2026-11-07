import Icon from './Icon.jsx';

export default function ChipSelect({ options, value, onChange, max, disabled = false, name }) {
  const selected = new Set(value);
  const full = value.length >= max;

  const toggle = (id) => {
    if (selected.has(id)) {
      onChange(value.filter((item) => item !== id));
    } else if (!full) {
      onChange([...value, id]);
    }
  };

  return (
    <div className="chips" role="group" aria-label={name}>
      {options.map((option) => {
        const isOn = selected.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={`chip ${isOn ? 'is-on' : ''}`}
            onClick={() => toggle(option.id)}
            disabled={disabled || (!isOn && full)}
            aria-pressed={isOn}
          >
            {isOn && <Icon name="check" size={14} strokeWidth={3} />}
            {option.name}
          </button>
        );
      })}
      <span className="chips__counter">
        Đã chọn {value.length}/{max}
      </span>
    </div>
  );
}
