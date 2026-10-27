import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor, initialsOf } from '../utils/roleUtils.js';
import Icon from './Icon.jsx';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">{initialsOf(user.fullName)}</span>
        <span className="user-menu__name">{user.fullName}</span>
        <Icon name="chevronDown" size={16} />
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__header">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
            <span className={`role-chip role-chip--${user.role.toLowerCase()}`}>{ROLE_LABEL[user.role]}</span>
          </div>
          <Link to={homePathFor(user)} className="user-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="home" size={18} />
            Trang của tôi
          </Link>
          <button type="button" className="user-menu__item user-menu__item--danger" role="menuitem" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
