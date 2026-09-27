import React from "react";
import SearchableSelect from "./SearchableSelect";
import { HARI_ORDER } from "./jadwalUtils";

export default function JadwalFormModal({
  isOpen,
  isEdit = false,
  formData,
  setFormData,
  onClose,
  onSubmit,
  isSubmitting,
  kelasList = [],
  mapelList = [],
  guruList = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-visible my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            {isEdit ? "Edit Jadwal Pelajaran" : "Tambah Jadwal Pelajaran"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            disabled={isSubmitting}
            aria-label="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-visible pb-16 sm:pb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Hari */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Hari <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={formData.hari}
                onChange={(v) => setFormData({ ...formData, hari: v })}
                options={HARI_ORDER}
                placeholder="Pilih Hari..."
                renderLabel={(item) => <span className="font-medium">{item}</span>}
                getSearchText={(item) => item}
              />
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Kelas <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={formData.kelas_id}
                onChange={(v) => setFormData({ ...formData, kelas_id: v })}
                options={kelasList}
                placeholder="Pilih Kelas..."
                renderLabel={(item) => (
                  <>
                    <span className="font-medium">{item.kelas} {item.jurusan}</span>
                    {(item.tahun?.tahun_ajaran || item.tahun_ajaran) && (
                      <span className="ml-1.5 text-xs text-gray-400">
                        ({item.tahun?.tahun_ajaran || item.tahun_ajaran})
                      </span>
                    )}
                  </>
                )}
                getSearchText={(item) =>
                  `${item.kelas} ${item.jurusan} ${item.tahun?.tahun_ajaran || item.tahun_ajaran || ""}`
                }
              />
            </div>

            {/* Mapel */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={formData.mapel_id}
                onChange={(v) => setFormData({ ...formData, mapel_id: v })}
                options={mapelList}
                placeholder="Pilih Mapel..."
                renderLabel={(item) => <span className="font-medium">{item.nama_mapel}</span>}
                getSearchText={(item) => item.nama_mapel}
              />
            </div>

            {/* Guru */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Guru Pengampu <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={formData.guru_id}
                onChange={(v) => setFormData({ ...formData, guru_id: v })}
                options={guruList}
                placeholder="Pilih Guru..."
                renderLabel={(item) => (
                  <>
                    <span className="font-medium">{item.nama}</span>
                    {item.NIP ? <span className="ml-1.5 text-xs text-gray-400">({item.NIP})</span> : null}
                  </>
                )}
                getSearchText={(item) => `${item.nama} ${item.NIP || ""}`}
              />
            </div>

            {/* Jam Mulai */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Jam Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                className="w-full px-3.5 sm:px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={formData.jam_mulai}
                onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                required
              />
            </div>

            {/* Jam Selesai */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Jam Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                className="w-full px-3.5 sm:px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={formData.jam_selesai}
                onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-gray-50 flex items-center justify-end gap-2.5 sm:gap-3 rounded-b-2xl border-t border-gray-100">
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition cursor-pointer"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Menyimpan...
              </>
            ) : isEdit ? (
              "Simpan Perubahan"
            ) : (
              "Buat Jadwal"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
