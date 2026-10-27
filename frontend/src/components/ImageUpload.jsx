import { useRef, useState } from 'react';
import { fileApi } from '../api/fileApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import { MAX_IMAGE_SIZE } from '../utils/restaurantUtils.js';
import Icon from './Icon.jsx';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUpload({ kind, value, onChange, caption, error, disabled = false, wide = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Chỉ nhận ảnh JPG, PNG hoặc WEBP');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setLocalError('Ảnh tối đa 1MB');
      return;
    }
    setLocalError('');
    setUploading(true);
    try {
      const { url } = await fileApi.upload(kind, file);
      onChange(url);
    } catch (err) {
      setLocalError(getErrorMessage(err, 'Tải ảnh thất bại, vui lòng thử lại.'));
    } finally {
      setUploading(false);
    }
  };

  const message = localError || error;

  return (
    <div className={`upload ${wide ? 'upload--wide' : ''} ${message ? 'upload--error' : ''}`}>
      {caption && <span className="upload__caption">{caption}</span>}
      <button
        type="button"
        className="upload__box"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        aria-label={caption ? `Tải ảnh ${caption}` : 'Tải ảnh'}
      >
        {value ? (
          <img src={value} alt={caption || 'Ảnh đã tải'} />
        ) : (
          <span className="upload__placeholder">
            <Icon name="image" size={26} />
            {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
          </span>
        )}
        {value && uploading && <span className="upload__overlay">Đang tải...</span>}
      </button>
      {value && !disabled && (
        <div className="upload__actions">
          <button type="button" className="link-btn" onClick={() => inputRef.current?.click()} disabled={uploading}>
            Đổi ảnh
          </button>
          <button type="button" className="link-btn link-btn--danger" onClick={() => onChange('')} disabled={uploading}>
            Xóa
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        hidden
        onChange={handleFile}
        data-kind={kind}
      />
      {message && <p className="field__error">{message}</p>}
    </div>
  );
}
