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
  list: (params?: string) => request(`/api/siswa${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/siswa/${id}`),
  create: (data: any) => request('/api/siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/siswa/${id}`, { method: 'DELETE' }),
};

// Tahun Ajaran
export const tahunAjaran = {
  list: () => request('/api/tahun-ajaran'),
  get: (id: string | number) => request(`/api/tahun-ajaran/${id}`),
  create: (data: any) => request('/api/tahun-ajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/tahun-ajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/tahun-ajaran/${id}`, { method: 'DELETE' }),
};

// Mata Pelajaran
export const mapel = {
  list: () => request('/api/mata-pelajaran'),
  get: (id: string | number) => request(`/api/mata-pelajaran/${id}`),
  create: (data: any) => request('/api/mata-pelajaran', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/mata-pelajaran/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/mata-pelajaran/${id}`, { method: 'DELETE' }),
};

// Guru
export const guru = {
  list: () => request('/api/guru'),
  get: (id: string | number) => request(`/api/guru/${id}`),
  create: (data: any) => request('/api/guru', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/guru/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/guru/${id}`, { method: 'DELETE' }),
};

// Orang Tua
export const orangTua = {
  list: () => request('/api/orang-tua'),
  get: (id: string | number) => request(`/api/orang-tua/${id}`),
  create: (data: any) => request('/api/orang-tua', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/orang-tua/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/orang-tua/${id}`, { method: 'DELETE' }),
};

// Kelas
export const kelas = {
  list: (params?: string) => request(`/api/kelas${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/kelas/${id}`),
  create: (data: any) => request('/api/kelas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/kelas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/kelas/${id}`, { method: 'DELETE' }),
};

// Jadwal
export const jadwal = {
  list: () => request('/api/jadwal'),
  create: (data: any) => request('/api/jadwal', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/jadwal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/jadwal/${id}`, { method: 'DELETE' }),
};

// Jurusan
export const jurusan = {
  list: () => request('/api/jurusan'),
  get: (id: string | number) => request(`/api/jurusan/${id}`),
  create: (data: any) => request('/api/jurusan', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/jurusan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/jurusan/${id}`, { method: 'DELETE' }),
};

// RFID
export const rfid = {
  list: () => request('/api/rfid'),
  get: (id: string | number) => request(`/api/rfid/${id}`),
  create: (data: any) => request('/api/rfid', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: any) => request(`/api/rfid/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (id: string | number, data: any) => request(`/api/rfid/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/rfid/${id}`, { method: 'DELETE' }),
};

// Absensi Siswa
export const absensiSiswa = {
  tapIn: (data: any) => request('/api/absensi-siswa/tap-in', { method: 'POST', body: JSON.stringify(data) }),
  tapOut: (data: any) => request('/api/absensi-siswa/tap-out', { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: string) => request(`/api/absensi-siswa${params ? `?${params}` : ''}`),
  laporanHarian: (params?: string) => request(`/api/absensi-siswa/laporan/harian${params ? `?${params}` : ''}`),
  get: (id: string | number) => request(`/api/absensi-siswa/${id}`),
  update: (id: string | number, data: any) => request(`/api/absensi-siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/absensi-siswa/${id}`, { method: 'DELETE' }),
};

// Detail Absensi
export const detailAbsensi = {
  absensiGuru: (data: any) => request('/api/detail-absensi/absensi-guru', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (data: any) => request('/api/detail-absensi/update-status', { method: 'PUT', body: JSON.stringify(data) }),
  byJadwal: (jadwal_id: string | number) => request(`/api/detail-absensi/jadwal/${jadwal_id}`),
  rekapSiswa: () => request('/api/detail-absensi/rekap-siswa'),
  laporanHarian: () => request('/api/detail-absensi/laporan-harian'),
  delete: (id: string | number) => request(`/api/detail-absensi/${id}`, { method: 'DELETE' }),
};

// Users
export const users = {
  list: () => request('/api/users'),
  get: (id: string | number) => request(`/api/users/${id}`),
  update: (id: string | number, data: any) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number) => request(`/api/users/${id}`, { method: 'DELETE' }),
};

// Auth
export const auth = {
  register: (data: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
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
