import { useEffect, useState } from 'react';
import { initialsOf } from '../utils/roleUtils.js';

export default function UserAvatar({ name, url, className = 'avatar', alt }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = typeof url === 'string' ? url.trim() : '';

  useEffect(() => setFailed(false), [avatarUrl]);

  return <span className={className}>
    {avatarUrl && !failed
      ? <img src={avatarUrl} alt={alt || `Ảnh đại diện của ${name || 'người dùng'}`} loading="lazy" onError={() => setFailed(true)} />
      : <span aria-label={alt || `Ảnh đại diện mặc định của ${name || 'người dùng'}`}>{initialsOf(name || 'Khách hàng')}</span>}
  </span>;
}
