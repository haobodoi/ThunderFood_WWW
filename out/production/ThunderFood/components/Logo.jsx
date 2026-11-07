import { useId } from 'react';

export default function Logo({ size = 30, showText = true, light = false, className = '' }) {
  const maskId = useId();
  const ink = light ? '#ffffff' : '#0e1e38';
  return (
    <span className={'brand-logo ' + (light ? 'brand-logo--light ' : '') + className}>
      <svg width={Math.round(size * 1.35)} height={size} viewBox="0 0 100 70"
        fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-logo__mark" aria-hidden="true">
        <path d="M 5 28 L 26 28" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <path d="M 0 35 L 22 35" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".9" />
        <path d="M 6 42 L 26 42" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <mask id={maskId}>
          <circle cx="50" cy="35" r="26" fill="white" />
          <circle cx="70" cy="30" r="7" fill="black" />
          <circle cx="71" cy="40" r="6" fill="black" />
        </mask>
        <circle cx="50" cy="35" r="26" fill={ink} mask={'url(#' + maskId + ')'} />
        <path d="M 58 10 L 32 37 L 48 37 L 30 60 L 62 30 L 46 30 Z" fill="#ff5520" />
      </svg>
      {showText && <span className="brand-logo__text">
        <strong className="brand-logo__thunder">Thunder</strong>
        <strong className="brand-logo__food">Food</strong>
      </span>}
    </span>
  );
}
