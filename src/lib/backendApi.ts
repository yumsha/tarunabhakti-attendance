const BASE_URL = (import.meta as any).env?.PUBLIC_API_BASE_URL || 'http://localhost:3000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('ysboToken');
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearAuth();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const { headers: customHeaders, ...restOptions } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(customHeaders || {}),
    } as Record<string, string>,
    credentials: 'include',
    ...restOptions,
  });

  // 401 = token expired/invalid → langsung ke login
  if (res.status === 401) {
    redirectToLogin();
    return { success: false, message: 'Sesi habis, silakan login kembali' };
  }

  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
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
  absensiWalas: (data: any) => request('/api/v1/detail-absensi/absensi-walas', { method: 'POST', body: JSON.stringify(data) }),
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

export default { siswa, tahunAjaran, mapel, guru, orangTua, kelas, jadwal, rfid, absensiSiswa, detailAbsensi, statusRequest, users, role, auth };
