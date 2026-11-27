import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountApi } from '../api/accountApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import Alert from '../components/Alert.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL } from '../utils/roleUtils.js';

const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function AccountSettingsPage({ customer = false }) {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ fullName: '', phone: '', address: '' });
  const [password, setPassword] = useState(emptyPassword);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (user) setProfile({ fullName: user.fullName || '', phone: user.phone || '', address: user.address || '' }); }, [user]);
  const showError = err => { setNotice(''); setError(getErrorMessage(err)); };
  const saveProfile = async event => { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { await accountApi.updateProfile(profile); await refresh(); setNotice('Đã lưu thông tin cá nhân.'); } catch (err) { showError(err); } finally { setSaving(false); } };
  const uploadAvatar = async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(''); setNotice(''); try { await accountApi.uploadAvatar(file); await refresh(); setNotice('Đã cập nhật ảnh đại diện.'); } catch (err) { showError(err); } finally { setUploading(false); event.target.value = ''; } };
  const clearAvatar = async () => { setUploading(true); setError(''); setNotice(''); try { await accountApi.clearAvatar(); await refresh(); setNotice('Đã xóa ảnh đại diện.'); } catch (err) { showError(err); } finally { setUploading(false); } };
  const savePassword = async event => { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { await accountApi.changePassword(password); setPassword(emptyPassword); setNotice('Đã đổi mật khẩu.'); } catch (err) { showError(err); } finally { setSaving(false); } };
  if (!user) return null;
  return <div className="container commerce-page account-settings">
    <div className="commerce-row commerce-wrap"><div><h1>Cài đặt tài khoản</h1><p className="muted">Cập nhật thông tin cá nhân và bảo mật đăng nhập.</p></div>{customer && <Link className="btn btn--outline btn--sm" to="/customer">Khám phá quán ngon</Link>}</div>
    {error && <Alert type="error">{error}</Alert>}{notice && <Alert type="success">{notice}</Alert>}
    <div className="account-settings__grid">
      <section className="tf-profile-panel"><h2>Thông tin cá nhân</h2><p className="muted">Email và vai trò là thông tin đăng nhập nên không thể thay đổi.</p>
        <div className="account-settings__avatar"><UserAvatar name={user.fullName} url={user.avatarUrl} className="avatar avatar--xl" /><div><label className="btn btn--outline btn--sm">{uploading ? 'Đang tải…' : 'Đổi ảnh'}<input name="avatar" className="tf-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading} /></label>{user.avatarUrl && <button type="button" className="btn btn--ghost btn--sm" onClick={clearAvatar} disabled={uploading}>Xóa ảnh</button>}<small>JPG, PNG hoặc WEBP, tối đa 1 MB.</small></div></div>
        <form onSubmit={saveProfile} className="account-settings__form"><label className="field"><span className="field__label">Họ và tên</span><input name="fullName" className="field__input" required maxLength="120" value={profile.fullName} onChange={e => setProfile(v => ({ ...v, fullName: e.target.value }))} /></label><label className="field"><span className="field__label">Số điện thoại</span><input name="phone" className="field__input" required inputMode="numeric" pattern="0[0-9]{9}" value={profile.phone} onChange={e => setProfile(v => ({ ...v, phone: e.target.value }))} /></label><label className="field account-settings__span"><span className="field__label">Địa chỉ</span><textarea name="address" className="field__input field__textarea" maxLength="500" value={profile.address} onChange={e => setProfile(v => ({ ...v, address: e.target.value }))} /></label><div className="account-settings__readonly"><span>Email</span><strong>{user.email}</strong><span>Vai trò</span><strong>{ROLE_LABEL[user.role]}</strong></div><button className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thông tin'}</button></form>
      </section>
      <section className="tf-profile-panel"><h2>Bảo mật</h2><p className="muted">Dùng mật khẩu hiện tại để xác nhận trước khi thay đổi.</p><form onSubmit={savePassword} className="account-settings__form"><label className="field"><span className="field__label">Mật khẩu hiện tại</span><input name="currentPassword" className="field__input" type="password" required value={password.currentPassword} onChange={e => setPassword(v => ({ ...v, currentPassword: e.target.value }))} /></label><label className="field"><span className="field__label">Mật khẩu mới</span><input name="newPassword" className="field__input" type="password" minLength="6" maxLength="64" required value={password.newPassword} onChange={e => setPassword(v => ({ ...v, newPassword: e.target.value }))} /></label><label className="field"><span className="field__label">Nhập lại mật khẩu mới</span><input name="confirmPassword" className="field__input" type="password" required value={password.confirmPassword} onChange={e => setPassword(v => ({ ...v, confirmPassword: e.target.value }))} /></label><button className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Đổi mật khẩu'}</button></form></section>
    </div>
  </div>;
}
