const BASE_URL = (import.meta as any).env?.PUBLIC_API_BASE_URL || 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  });
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return text;
  }
}

// Siswa
export const siswa = {
  list: (params?: string) => request(`/api/v1/siswa${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/siswa/${id}`),
  create: (data: any) => request('/api/v1/siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/siswa/${id}`, { method: 'DELETE' }),
};

// Tahun Ajaran
export const tahunAjaran = {
  list: () => request('/api/v1/tahun-ajaran'),
  get: (id: string | number) => request(`/api/v1/tahun-ajaran/${id}`),
  create: (data: any) => request('/api/v1/tahun-ajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/tahun-ajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/tahun-ajaran/${id}`, { method: 'DELETE' }),
};

// Mata Pelajaran
export const mapel = {
  list: () => request('/api/v1/mata-pelajaran'),
  get: (id: string | number) => request(`/api/v1/mata-pelajaran/${id}`),
  create: (data: any) => request('/api/v1/mata-pelajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/mata-pelajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/mata-pelajaran/${id}`, { method: 'DELETE' }),
};

// Guru
export const guru = {
  list: () => request('/api/v1/guru'),
  get: (id: string | number) => request(`/api/v1/guru/${id}`),
  create: (data: any) => request('/api/v1/guru', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/guru/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/guru/${id}`, { method: 'DELETE' }),
};

// Orang Tua
export const orangTua = {
  list: () => request('/api/v1/orang-tua'),
  get: (id: string | number) => request(`/api/v1/orang-tua/${id}`),
  create: (data: any) => request('/api/v1/orang-tua', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/orang-tua/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/orang-tua/${id}`, { method: 'DELETE' }),
};

// Kelas
export const kelas = {
  list: (params?: string) => request(`/api/v1/kelas${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/kelas/${id}`),
  create: (data: any) => request('/api/v1/kelas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/kelas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/kelas/${id}`, { method: 'DELETE' }),
};

// Jadwal
export const jadwal = {
  list: (params?: string) => request(`/api/v1/jadwal${params ? `?${params}` : ''}`),
  create: (data: any) => request('/api/v1/jadwal', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/jadwal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/jadwal/${id}`, { method: 'DELETE' }),
};

// Jurusan
export const jurusan = {
  list: () => request('/api/v1/jurusan'),
  get: (id: string | number) => request(`/api/v1/jurusan/${id}`),
  create: (data: any) => request('/api/v1/jurusan', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/jurusan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/jurusan/${id}`, { method: 'DELETE' }),
};

// RFID
export const rfid = {
  list: () => request('/api/v1/rfid'),
  get: (id: string | number) => request(`/api/v1/rfid/${id}`),
  create: (data: any) => request('/api/v1/rfid', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/v1/rfid/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (id: string | number, data: any) => request(`/api/v1/rfid/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/rfid/${id}`, { method: 'DELETE' }),
};

// Absensi Siswa
export const absensiSiswa = {
  tapIn: (data: any) => request('/api/v1/absensi-siswa/tap-in', { method: 'POST', body: JSON.stringify(data) }),
  tapOut: (data: any) => request('/api/v1/absensi-siswa/tap-out', { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: string) => request(`/api/v1/absensi-siswa${params ? `?${params}` : ''}`),
  laporanHarian: (params?: string) => request(`/api/v1/absensi-siswa/laporan/harian${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/v1/absensi-siswa/${id}`),
  update: (id: string | number, data: any) => request(`/api/v1/absensi-siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/absensi-siswa/${id}`, { method: 'DELETE' }),
};

// Detail Absensi
export const detailAbsensi = {
  absensiGuru: (data: any) => request('/api/v1/detail-absensi/absensi-guru', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (data: any) => request('/api/v1/detail-absensi/update-status', { method: 'PUT', body: JSON.stringify(data) }),
  byJadwal: (jadwal_id: string | number) => request(`/api/v1/detail-absensi/jadwal/${jadwal_id}`),
  rekapSiswa: () => request('/api/v1/detail-absensi/rekap-siswa'),
  laporanHarian: () => request('/api/v1/detail-absensi/laporan-harian'),
  delete: (id: string | number) => request(`/api/v1/detail-absensi/${id}`, { method: 'DELETE' }),
};

// Users
export const users = {
  list: () => request('/api/v1/users'),
  get: (id: string | number) => request(`/api/v1/users/${id}`),
  update: (id: string | number, data: any) => request(`/api/v1/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/v1/users/${id}`, { method: 'DELETE' }),
};

// Auth
export const auth = {
  register: (data: any) => request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/v1/auth/logout', { method: 'POST' }),
  me: () => request('/api/v1/auth/me'),
};

export default {
  siswa,
  tahunAjaran,
  mapel,
  guru,
  orangTua,
  kelas,
  jadwal,
  jurusan,
  rfid,
  absensiSiswa,
  detailAbsensi,
  users,
  auth,
};
