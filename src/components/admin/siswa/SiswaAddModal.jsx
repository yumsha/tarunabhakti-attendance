import React, { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { siswa, orangTua } from "../../../lib/backendApi";
import SearchableKelasSelect from "./SearchableKelasSelect";

export default function SiswaAddModal({ kelasList = [], onClose, onAdded }) {
  const emptyForm = {
    nisn: "",
    nipd: "",
    nik: "",
    nama: "",
    tempat_lahir: "",
    tgl_lahir: "",
    jenis_kelamin: "L",
    agama: "",
    kelas_id: "",
    jurusan: "",
    orangtua_id: "",
  };
  const emptyOrtu = {
    NIK: "",
    nama_orangtua: "",
    nomor_telepon: "",
    pekerjaan: "",
    alamat: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [addOrtu, setAddOrtu] = useState(false);
  const [ortuData, setOrtuData] = useState(emptyOrtu);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "kelas_id" && value) {
        const matched = kelasList.find((k) => String(k.id) === String(value));
        if (matched?.jurusan) updated.jurusan = matched.jurusan;
      }
      return updated;
    });
  };

  const handleOrtuChange = (e) => {
    const { name, value } = e.target;
    setOrtuData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validasi field siswa
    if (
      !formData.nisn.trim() || !formData.nipd.trim() || !formData.nik.trim() ||
      !formData.nama.trim() || !formData.tempat_lahir.trim() ||
      !formData.tgl_lahir || !formData.jenis_kelamin || !formData.agama.trim() ||
      !formData.kelas_id
    ) {
      setError("Semua field data siswa wajib diisi, termasuk pemilihan kelas.");
      return;
    }
    if (!/^\d+$/.test(formData.nisn.trim())) { setError("NISN harus berupa angka."); return; }
    if (!/^\d+$/.test(formData.nipd.trim())) { setError("NIPD harus berupa angka."); return; }
    if (!/^\d+$/.test(formData.nik.trim())) { setError("NIK harus berupa angka."); return; }

    // Validasi orang tua jika toggle aktif
    if (addOrtu) {
      if (
        !ortuData.NIK.trim() || !ortuData.nama_orangtua.trim() ||
        !ortuData.nomor_telepon.trim() || !ortuData.pekerjaan.trim() ||
        !ortuData.alamat.trim()
      ) {
        setError("Jika data orang tua diisi, semua field orang tua wajib dilengkapi.");
        return;
      }
      if (!/^[0-9]{16}$/.test(ortuData.NIK.trim())) {
        setError("NIK Orang Tua harus 16 digit angka.");
        return;
      }
      if (!/^08[0-9]{8,11}$/.test(ortuData.nomor_telepon.trim())) {
        setError("Nomor Telepon Orang Tua tidak valid (gunakan format 08xx).");
        return;
      }
    }

    setSaving(true);
    try {
      let orangtuaPayload = undefined;

      if (!addOrtu && formData.orangtua_id.trim()) {
        try {
          const ortuRes = await orangTua.get(formData.orangtua_id.trim());
          if (ortuRes?.success && ortuRes.data) {
            const matched = ortuRes.data;
            orangtuaPayload = {
              NIK: matched.NIK,
              nama_orangtua: matched.nama_orangtua,
              nomor_telepon: matched.nomor_telepon,
              pekerjaan: matched.pekerjaan,
              alamat: matched.alamat,
            };
          } else {
            setError(ortuRes?.message || `ID Orang Tua "${formData.orangtua_id}" tidak ditemukan.`);
            setSaving(false);
            return;
          }
        } catch (err) {
          setError(`Gagal memverifikasi ID Orang Tua: ${err.message}`);
          setSaving(false);
          return;
        }
      } else if (addOrtu) {
        orangtuaPayload = {
          NIK: ortuData.NIK.trim(),
          nama_orangtua: ortuData.nama_orangtua.trim(),
          nomor_telepon: ortuData.nomor_telepon.trim(),
          pekerjaan: ortuData.pekerjaan.trim(),
          alamat: ortuData.alamat.trim(),
        };
      }

      const selectedKelas = kelasList.find((k) => String(k.id) === String(formData.kelas_id));
      const payload = {
        nisn: formData.nisn.trim(),
        nipd: formData.nipd.trim(),
        nik: formData.nik.trim(),
        nama: formData.nama.trim(),
        tempat_lahir: formData.tempat_lahir.trim(),
        tgl_lahir: formData.tgl_lahir,
        jenis_kelamin: formData.jenis_kelamin,
        agama: formData.agama.trim(),
        jurusan: selectedKelas?.jurusan ?? formData.jurusan,
        nama_kelas: selectedKelas?.kelas ?? "",
        ...(orangtuaPayload ? { orangtua: orangtuaPayload } : {}),
      };

      const res = await siswa.create(payload);
      if (res?.success) {
        onAdded(res.data?.nama ?? formData.nama);
      } else {
        setError(res?.message || "Gagal menambahkan siswa.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Tambah Siswa Baru</h2>
            <p className="text-blue-200 text-xs mt-0.5">Isi data siswa secara manual satu per satu</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-blue-200 hover:text-white transition-colors cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Bagian Data Siswa ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Siswa</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Siswa *</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* NISN */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NISN *</label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              {/* NIPD */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NIPD *</label>
                <input
                  type="text"
                  name="nipd"
                  value={formData.nipd}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              {/* NIK */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NIK Siswa *</label>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              {/* Tempat Lahir */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tempat Lahir *</label>
                <input
                  type="text"
                  name="tempat_lahir"
                  value={formData.tempat_lahir}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Tanggal Lahir */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
                <input
                  type="date"
                  name="tgl_lahir"
                  value={formData.tgl_lahir}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Jenis Kelamin */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kelamin *</label>
                <select
                  name="jenis_kelamin"
                  value={formData.jenis_kelamin}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              {/* Agama */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agama *</label>
                <select
                  name="agama"
                  value={formData.agama}
                  onChange={handleChange}
                  required
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Agama --</option>
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>
              {/* Kelas */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-gray-700">Pilih Kelas *</label>
                <SearchableKelasSelect
                  value={formData.kelas_id}
                  onChange={(id) => {
                    const matched = kelasList.find((k) => String(k.id) === String(id));
                    setFormData((prev) => ({ ...prev, kelas_id: id, jurusan: matched?.jurusan ?? prev.jurusan }));
                  }}
                  kelasList={kelasList}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* ── Toggle Data Orang Tua (Opsional) ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setAddOrtu((v) => !v);
                setOrtuData(emptyOrtu);
                setFormData((prev) => ({ ...prev, orangtua_id: "" }));
                setError("");
              }}
              className={
                "w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition " +
                (addOrtu ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100")
              }
            >
              <span className="flex items-center gap-2">
                <span className={
                  "flex h-4 w-4 items-center justify-center rounded border transition " +
                  (addOrtu ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white")
                }>
                  {addOrtu && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                Tambahkan Data Orang Tua sekaligus
                <span className="font-normal text-gray-400">(opsional)</span>
              </span>
              <svg className={`h-4 w-4 transition-transform duration-200 ${addOrtu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!addOrtu && (
              <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <label className="block text-xs font-medium text-gray-700 mb-1">ID Orang Tua (Opsional)</label>
                <input
                  type="number"
                  name="orangtua_id"
                  value={formData.orangtua_id}
                  onChange={handleChange}
                  placeholder="Masukkan ID Orang Tua jika sudah ada"
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {addOrtu && (
              <div className="p-4 space-y-4 border-t border-gray-200 bg-blue-50/30">
                <p className="text-[11px] text-blue-600 bg-blue-100 px-3 py-2 rounded-lg leading-relaxed">
                  💡 Jika NIK Orang Tua sudah terdaftar di sistem, data siswa akan otomatis dikaitkan ke orang tua yang ada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Ortu */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Orang Tua *</label>
                    <input
                      type="text"
                      name="nama_orangtua"
                      value={ortuData.nama_orangtua}
                      onChange={handleOrtuChange}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* NIK Ortu */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">NIK Orang Tua (16 digit) *</label>
                    <input
                      type="text"
                      name="NIK"
                      value={ortuData.NIK}
                      onChange={handleOrtuChange}
                      maxLength={16}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  {/* No Telp Ortu */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">No. Telepon (08xx) *</label>
                    <input
                      type="text"
                      name="nomor_telepon"
                      value={ortuData.nomor_telepon}
                      onChange={handleOrtuChange}
                      placeholder="08xxxxxxxxxx"
                      className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  {/* Pekerjaan */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pekerjaan *</label>
                    <input
                      type="text"
                      name="pekerjaan"
                      value={ortuData.pekerjaan}
                      onChange={handleOrtuChange}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Alamat */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Alamat *</label>
                    <textarea
                      name="alamat"
                      value={ortuData.alamat}
                      onChange={handleOrtuChange}
                      rows={3}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Siswa"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
