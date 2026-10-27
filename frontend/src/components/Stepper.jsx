import Icon from './Icon.jsx';

export default function Stepper({ steps, current, completed, maxReachable, onSelect }) {
  const currentStep = steps.find((step) => step.number === current);
  return (
    <>
      <ol className="stepper">
        {steps.map((step, index) => {
          const done = step.number <= completed && step.number !== current;
          const active = step.number === current;
          const reachable = step.number <= maxReachable;
          return (
            <li
              key={step.number}
              className={`stepper__item ${active ? 'is-active' : ''} ${done ? 'is-done' : ''} ${reachable ? 'is-reachable' : ''}`}
            >
              <button
                type="button"
                className="stepper__button"
                onClick={() => reachable && onSelect(step.number)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
              >
                <span className="stepper__circle">
                  {done ? <Icon name="check" size={14} strokeWidth={3} /> : step.number}
                </span>
                <span className="stepper__text">
                  <strong>{step.title}</strong>
                  <small>{step.subtitle}</small>
                </span>
              </button>
              {index < steps.length - 1 && <span className="stepper__line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      {currentStep && (
        <p className="stepper__current">
          Bước {current}/{steps.length}: {currentStep.title} – {currentStep.subtitle}
        </p>
      )}
    </>
  );
}
