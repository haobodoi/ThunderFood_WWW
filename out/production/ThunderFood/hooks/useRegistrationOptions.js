import { useEffect, useState } from 'react';
import { metaApi } from '../api/metaApi.js';

let cache = null;

export default function useRegistrationOptions() {
  const [options, setOptions] = useState(cache);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cache) return undefined;
    let active = true;
    metaApi
      .registrationOptions()
      .then((data) => {
        cache = data;
        if (active) setOptions(data);
      })
      .catch(() => {
        if (active) setError('Không tải được danh mục tỉnh/thành, loại hình và ẩm thực.');
      });
    return () => {
      active = false;
    };
  }, []);

  return { options, error };
}
