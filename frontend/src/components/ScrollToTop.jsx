import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getMotionSafeScrollBehavior } from '../utils/motionUtils.js';

export default function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  return null;
}
