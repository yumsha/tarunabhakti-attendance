const BASE_URL = (import.meta as any).env?.PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_CACHE_PREFIX = 'tb_api_cache:';
// Cache TTL: 5 menit untuk data statis (kelas, tahun, guru, dll).
// Data kehadiran (finalAbsensi) di-fetch tanpa cache karena filternya dinamis.
const API_CACHE_TTL_MS = 5 * 60_000;
const apiCacheMemory = new Map<string, { at: number; body: any }>();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('ysboToken');
  clearApiCache();
}

function clearApiCache() {
  if (typeof window === 'undefined') return;

  apiCacheMemory.clear();
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(API_CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

function buildApiCacheKey(path: string, method: string, headers: Record<string, string>) {
  const normalizedHeaders = Object.keys(headers)
    .sort()
    .reduce((acc, key) => {
      acc[key] = headers[key];
      return acc;
    }, {} as Record<string, string>);
  return `${API_CACHE_PREFIX}${method}:${path}:${JSON.stringify(normalizedHeaders)}`;
}

function readCachedResponse(cacheKey: string) {
  if (typeof window === 'undefined') return null;

  const memoryHit = apiCacheMemory.get(cacheKey);
  if (memoryHit && Date.now() - memoryHit.at < API_CACHE_TTL_MS) {
    return memoryHit.body;
  }

  const raw = localStorage.getItem(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { at?: number; body?: any };
    if (!parsed?.at || Date.now() - parsed.at >= API_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      apiCacheMemory.delete(cacheKey);
      return null;
    }

    apiCacheMemory.set(cacheKey, { at: parsed.at, body: parsed.body });
    return parsed.body;
  } catch {
    localStorage.removeItem(cacheKey);
    apiCacheMemory.delete(cacheKey);
    return null;
  }
}

function writeCachedResponse(cacheKey: string, body: any) {
  if (typeof window === 'undefined') return;

  const payload = { at: Date.now(), body };
  apiCacheMemory.set(cacheKey, payload);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore quota errors and keep the in-memory cache.
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearAuth();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login');
  }
}

async function request(path: string, options: RequestInit & { skipAuthRedirect?: boolean; noCache?: boolean } = {}): Promise<any> {
  const token = getToken();
  const { headers: customHeaders, skipAuthRedirect, noCache, ...restOptions } = options as any;
  const method = String((restOptions.method || 'GET')).toUpperCase();
  const headerMap = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders || {}),
  } as Record<string, string>;
  // Skip cache jika noCache=true atau bukan GET request
  const cacheKey = (method === 'GET' && !noCache) ? buildApiCacheKey(path, method, headerMap) : '';

  if (cacheKey) {
    const cached = readCachedResponse(cacheKey);
    if (cached !== null) return cached;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headerMap,
    },
    credentials: 'include',
    ...restOptions,
  });

  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  const message = typeof body === 'object' ? body?.message : '';
  const isAuthFailure =
    res.status === 401 ||
    (res.status === 403 && /access token|token tidak valid|token sudah expired/i.test(String(message)));

  // Token expired/invalid
  if (isAuthFailure) {
    if (skipAuthRedirect) {
      return { success: false, message: message || 'Sesi habis, silakan login kembali', status: res.status };
    }
    redirectToLogin();
    return { success: false, message: 'Sesi habis, silakan login kembali' };
  }

  if (method !== 'GET' && res.ok) {
    clearApiCache();
  }

  if (cacheKey && res.ok) {
    writeCachedResponse(cacheKey, body);
  }

  return body;
}

export const siswa = {
  list: (params?: string) => request(`/api/v1/siswa${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/siswa/${id}`),
  create: (data: any) => request('/api/v1/siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/siswa/${id}`, { method: 'DELETE' }),
};

export const tahunAjaran = {
  list: () => request('/api/v1/tahun-ajaran'),
  get: (id: string | number) => request(`/api/v1/tahun-ajaran/${id}`),
  create: (data: any) => request('/api/v1/tahun-ajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/tahun-ajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/tahun-ajaran/${id}`, { method: 'DELETE' }),
};

export const mapel = {
  list: () => request('/api/v1/mata-pelajaran'),
  get: (id: string | number) => request(`/api/v1/mata-pelajaran/${id}`),
  create: (data: any) => request('/api/v1/mata-pelajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/mata-pelajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/mata-pelajaran/${id}`, { method: 'DELETE' }),
};

function getYsboToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ysboToken');
}

export const guru = {
  list: (params?: string) => request(`/api/v1/guru${params ? `?${params}` : ''}`),
  listWithYsboSync: () => {
    const ysboToken = getYsboToken();
    return request('/api/v1/guru', {
      headers: ysboToken ? { 'x-ysbo-token': ysboToken } : {},
    });
  },
  walas: () => request('/api/v1/guru/walas'),
  get: (id: string | number) => request(`/api/v1/guru/${id}`),
  create: (data: any) => request('/api/v1/guru', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/guru/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/guru/${id}`, { method: 'DELETE' }),
};

export const orangTua = {
  list: (params?: string) => request(`/api/v1/orang-tua${params ? `?${params}` : ''}`), 
  get: (id: string | number) => request(`/api/v1/orang-tua/${id}`),
  create: (data: any) => request('/api/v1/orang-tua', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/orang-tua/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/orang-tua/${id}`, { method: 'DELETE' }),
};

export const kelas = {
  list: (params?: string) => request(`/api/v1/kelas${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/kelas/${id}`),
  create: (data: any) => request('/api/v1/kelas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/kelas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/kelas/${id}`, { method: 'DELETE' }),
  assignWalas: (id: string | number, walas_id: number | null) =>
    request(`/api/v1/kelas/${id}/assign-walas`, { method: 'PATCH', body: JSON.stringify({ walas_id }) }),
};

export const jadwal = {
  list: (params?: string) => request(`/api/v1/jadwal${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/jadwal/${id}`),
  create: (data: any) => request('/api/v1/jadwal', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/jadwal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/jadwal/${id}`, { method: 'DELETE' }),
  importXlsx: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/v1/jadwal/import`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) { redirectToLogin(); return { success: false, message: 'Sesi habis' }; }
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch { return text; }
  },
};

export const rfid = {
  list: (params?: string) => request(`/api/v1/rfid${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/rfid/${id}`),
  create: (data: any) => request('/api/v1/rfid', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/rfid/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (id: string | number, data: any) => request(`/api/v1/rfid/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/rfid/${id}`, { method: 'DELETE' }),
  importFile: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);  
    const res = await fetch(`${BASE_URL}/api/v1/rfid/import`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });
    if (res.status === 401) { redirectToLogin(); return { success: false, message: 'Sesi habis' }; }
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch { return text; }
  },
};
 

export const absensiSiswa = {
  tapIn: (data: any) => request('/api/v1/absensi-siswa/tap-in', { method: 'POST', body: JSON.stringify(data) }),
  tapOut: (data: any) => request('/api/v1/absensi-siswa/tap-out', { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: string) => request(`/api/v1/absensi-siswa${params ? `?${params}` : ''}`),
  laporanHarian: (params?: string) => request(`/api/v1/absensi-siswa/laporan/harian${params ? `?${params}` : ''}`),
  laporanRange: (params?: string) => request(`/api/v1/absensi-siswa/laporan/range${params ? `?${params}` : ''}`),
  rekapTahunan: (tahun: string | number) => request(`/api/v1/absensi-siswa/rekap/tahunan?tahun=${tahun}`),
  rekapMingguan: (tanggal_mulai: string, tanggal_akhir: string) => request(`/api/v1/absensi-siswa/rekap/mingguan?tanggal_mulai=${tanggal_mulai}&tanggal_akhir=${tanggal_akhir}`),
  get: (id: string | number) => request(`/api/v1/absensi-siswa/${id}`),
  update: (id: string | number, data: any) => request(`/api/v1/absensi-siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/absensi-siswa/${id}`, { method: 'DELETE' }),
};

export const detailAbsensi = {
  absensiGuru: (data: any) => request('/api/v1/detail-absensi/absensi-guru', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (data: any) => request('/api/v1/detail-absensi/update-status', { method: 'PUT', body: JSON.stringify(data) }),
  rekapSiswa: () => request('/api/v1/detail-absensi/rekap-siswa'),
  rekapKelas: (params?: string) => request(`/api/v1/detail-absensi/rekap-kelas${params ? `?${params}` : ''}`),
  rekapJadwal: (params?: string) => request(`/api/v1/detail-absensi/rekap-jadwal${params ? `?${params}` : ''}`),
  pratinjauWalas: (params?: string) => request(`/api/v1/detail-absensi/pratinjau-walas${params ? `?${params}` : ''}`),
  getRekapAbsensiSemuaKelas: (params?: string) => request(`/api/v1/detail-absensi/rekap-absensi${params ? `?${params}` : ''}`),
  absensiWalas: (data: any) => request('/api/v1/detail-absensi/absensi-walas', { method: 'POST', body: JSON.stringify(data), skipAuthRedirect: true }),
  delete: (id: string | number) => request(`/api/v1/detail-absensi/${id}`, { method: 'DELETE' }),
};

export const users = {
  list: (params?: string) => request(`/api/v1/users${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/users/${id}`),
  update: (id: string | number, data: any) => request(`/api/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/users/${id}`, { method: 'DELETE' }),
};

export const role = {
  list: () => request('/api/v1/role'),
  get: (id: string | number) => request(`/api/v1/role/${id}`),
  create: (data: { name: string }) => request('/api/v1/role', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: { name: string }) => request(`/api/v1/role/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/role/${id}`, { method: 'DELETE' }),
};

export const auth = {
  register: (data: any) => request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
  me: () => request('/api/v1/auth/me'),
};

export const statusRequest = {
  create: (data: any) =>
    request('/api/v1/status-request', { method: 'POST', body: JSON.stringify(data) }),
  getPending: (params?: string) =>
    request(`/api/v1/status-request/pending${params ? `?${params}` : ''}`),
  respond: (id: number, data: { approved: boolean; keterangan?: string }) =>
    request(`/api/v1/status-request/${id}/respond`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const exportApi = {
  downloadBlob: async (path: string): Promise<Blob | null> => {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) redirectToLogin();
        return null;
      }
      return await res.blob();
    } catch {
      return null;
    }
  },
  rekapKelasHarian: (kelasId: string | number, tanggal: string) =>
    `/api/v1/export/rekap/kelas/harian/excel?kelas_id=${kelasId}&tanggal=${tanggal}`,
  rekapKelasBulanan: (kelasId: string | number, bulan: number, tahun: number) =>
    `/api/v1/export/rekap/kelas/bulanan/excel?kelas_id=${kelasId}&bulan=${bulan}&tahun=${tahun}`,
  rekapKelasSemester: (kelasId: string | number, tahun: number, semester: number) =>
    `/api/v1/export/rekap/kelas/semester/excel?kelas_id=${kelasId}&tahun=${tahun}&semester=${semester}`,
  rekapKelasTahunan: (kelasId: string | number, tahun: number) =>
    `/api/v1/export/rekap/kelas/tahunan/excel?kelas_id=${kelasId}&tahun=${tahun}`,
  // WALAS-specific endpoint (requires WALAS role + wali verification)
  walasRekapKelasHarian: (kelasId: string | number, tanggal: string) =>
    `/api/v1/walas-export/rekap/kelas/harian/excel?kelas_id=${kelasId}&tanggal=${tanggal}`,
};

export const finalAbsensi = {
  // noCache: true — data kehadiran selalu di-fetch fresh karena filternya sangat dinamis.
  // Cache 60 detik lama sebelumnya bisa menyebabkan filter baru mengembalikan data filter lama.
  list: (params?: string) => request(`/api/v1/final-absensi${params ? `?${params}` : ''}`, { noCache: true } as any),
  filters: () => request('/api/v1/final-absensi/filters'),
  finalisasiSiswa: (data: any) => request('/api/v1/final-absensi/siswa', { method: 'POST', body: JSON.stringify(data) }),
  finalisasiKelas: (kelasId: string | number, data: any) => request(`/api/v1/final-absensi/kelas/${kelasId}`, { method: 'POST', body: JSON.stringify(data) }),
  finalisasiSemuaKelas: (data: any) => request('/api/v1/final-absensi/semua-kelas', { method: 'POST', body: JSON.stringify(data) }),
  finalisasiSemuaSiswa: (data: { tanggal: string }) => request('/api/v1/final-absensi/all', { method: 'POST', body: JSON.stringify(data) }),
};

export default { siswa, tahunAjaran, mapel, guru, orangTua, kelas, jadwal, rfid, absensiSiswa, detailAbsensi, statusRequest, users, role, auth, finalAbsensi };
