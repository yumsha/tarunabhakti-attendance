import React, { useState, useEffect } from "react";
import { orangTua } from "../../../lib/backendApi";

export default function OrtuFormModal({
  isOpen,
  isEdit = false,
  ortu = null,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    nama_orangtua: "",
    NIK: "",
    nomor_telepon: "",
    pekerjaan: "",
    alamat: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && ortu) {
      setFormData({
        nama_orangtua: ortu.nama_orangtua || "",
        NIK: ortu.NIK || "",
        nomor_telepon: ortu.nomor_telepon || "",
        pekerjaan: ortu.pekerjaan || "",
        alamat: ortu.alamat || "",
      });
    } else {
      setFormData({
        nama_orangtua: "",
        NIK: "",
        nomor_telepon: "",
        pekerjaan: "",
        alamat: "",
      });
    }
    setError("");
  }, [isEdit, ortu, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !formData.nama_orangtua.trim() ||
      !formData.NIK.trim() ||
      !formData.nomor_telepon.trim() ||
      !formData.pekerjaan.trim() ||
      !formData.alamat.trim()
    ) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (!/^[0-9]{16}$/.test(formData.NIK.trim())) {
      setError("NIK harus 16 digit angka.");
      return;
    }
    if (!/^08[0-9]{8,11}$/.test(formData.nomor_telepon.trim())) {
      setError("Nomor telepon tidak valid (gunakan format 08xx).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama_orangtua: formData.nama_orangtua.trim(),
        NIK: formData.NIK.trim(),
        nomor_telepon: formData.nomor_telepon.trim(),
        pekerjaan: formData.pekerjaan.trim(),
        alamat: formData.alamat.trim(),
      };

      if (isEdit && ortu) {
        const res = await orangTua.update(ortu.id, payload);
        if (res?.success) {
          onSuccess(payload.nama_orangtua);
        } else {
          setError(res?.message || "Gagal memperbarui data orang tua.");
        }
      } else {
        const res = await orangTua.create(payload);
        if (res?.success) {
          onSuccess(res.data?.nama_orangtua ?? payload.nama_orangtua);
        } else {
          setError(res?.message || "Gagal menambahkan data orang tua.");
        }
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base sm:text-lg">
              {isEdit ? "Edit Data Orang Tua" : "Tambah Orang Tua Baru"}
            </h2>
            <p className="text-blue-100 text-xs mt-0.5">
              {isEdit ? "Ubah rincian data orang tua di bawah" : "Isi data orang tua secara manual"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-blue-200 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nama */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                Nama Orang Tua <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nama_orangtua"
                value={formData.nama_orangtua}
                onChange={handleChange}
                required
                placeholder="Contoh: Budi Santoso"
                className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* NIK & Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  NIK (16 Digit) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="NIK"
                  value={formData.NIK}
                  onChange={handleChange}
                  required
                  maxLength={16}
                  placeholder="3201010101800001"
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Nomor Telepon (08xx) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nomor_telepon"
                  value={formData.nomor_telepon}
                  onChange={handleChange}
                  required
                  placeholder="08123456789"
                  className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Pekerjaan */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                Pekerjaan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pekerjaan"
                value={formData.pekerjaan}
                onChange={handleChange}
                required
                placeholder="Contoh: Wiraswasta / Karyawan Swasta"
                className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                Alamat <span className="text-red-500">*</span>
              </label>
              <textarea
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Alamat lengkap tempat tinggal"
                className="w-full text-xs sm:text-sm px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-blue-200 cursor-pointer"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Menyimpan...
                </>
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Simpan Orang Tua"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
