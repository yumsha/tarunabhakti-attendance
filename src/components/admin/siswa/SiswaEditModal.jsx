import React, { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { siswa } from "../../../lib/backendApi";
import SearchableKelasSelect from "./SearchableKelasSelect";

export default function SiswaEditModal({ student, kelasList, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    nisn: student.nisn || student.NISN || "",
    nipd: student.nipd || student.NIPD || "",
    nik: student.nik || student.NIK || "",
    nama: student.nama || "",
    tempat_lahir: student.tempat_lahir || "",
    tgl_lahir: student.tgl_lahir ? student.tgl_lahir.slice(0, 10) : (student.tanggal_lahir ? student.tanggal_lahir.slice(0, 10) : ""),
    jenis_kelamin: student.jenis_kelamin || student.gender || "L",
    agama: student.agama || "",
    jurusan: student.jurusan || (student.kelas?.jurusan || ""),
    kelas_id: student.kelas_id ? String(student.kelas_id) : (student.kelas?.id ? String(student.kelas.id) : ""),
    orangtua_id: student.orangtua_id ? String(student.orangtua_id) : (student.orang_tua?.id ? String(student.orang_tua.id) : "")
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "kelas_id" && value) {
        const matched = kelasList.find((k) => String(k.id) === String(value));
        if (matched && matched.jurusan) {
          updated.jurusan = matched.jurusan;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!formData.nisn || !formData.nipd || !formData.nik || !formData.nama || !formData.tempat_lahir || !formData.tgl_lahir || !formData.jenis_kelamin || !formData.agama || !formData.kelas_id) {
        setError("Semua field wajib diisi, termasuk pemilihan kelas.");
        setSaving(false);
        return;
      }

      const selectedClass = kelasList.find((k) => String(k.id) === String(formData.kelas_id));
      const finalJurusan = formData.jurusan || selectedClass?.jurusan || "";

      const payload = {
        nisn: String(formData.nisn).trim(),
        nipd: String(formData.nipd).trim(),
        nik: String(formData.nik).trim(),
        nama: String(formData.nama).trim(),
        tempat_lahir: String(formData.tempat_lahir).trim(),
        tgl_lahir: String(formData.tgl_lahir).trim(),
        jenis_kelamin: String(formData.jenis_kelamin).trim(),
        agama: String(formData.agama).trim(),
        jurusan: String(finalJurusan).trim(),
        kelas_id: parseInt(formData.kelas_id, 10),
        ...(formData.orangtua_id ? { orangtua_id: parseInt(formData.orangtua_id, 10) } : {})
      };

      const res = await siswa.update(student.id, payload);
      if (res?.success) {
        onUpdated();
      } else {
        setError(res?.message || "Gagal mengupdate data siswa");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Edit Data Siswa</h2>
            <p className="text-blue-200 text-xs mt-0.5">Ubah rincian data siswa di bawah</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-blue-200 hover:text-white transition-colors cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agama *</label>
              <input
                type="text"
                name="agama"
                value={formData.agama}
                onChange={handleChange}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-gray-700">Pilih Kelas *</label>
              <SearchableKelasSelect
                value={formData.kelas_id}
                onChange={(id) => {
                  const matched = kelasList.find((k) => String(k.id) === String(id));
                  setFormData((prev) => ({
                    ...prev,
                    kelas_id: id,
                    jurusan: matched?.jurusan ?? prev.jurusan,
                  }));
                }}
                kelasList={kelasList}
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">ID Orang Tua (Opsional)</label>
              <input
                type="number"
                name="orangtua_id"
                value={formData.orangtua_id}
                onChange={handleChange}
                placeholder="Kosongkan jika belum ada"
                className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
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
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
