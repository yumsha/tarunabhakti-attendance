import { useEffect, useState, useCallback, useRef } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  Search, X, RefreshCw, BookMarked, BookX, Calendar,
} from "lucide-react";
import PageHeader from "../layout/PageHeader";
import { mapel as mapelApi } from "../../lib/backendApi";

// Tooltip 
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          whitespace-nowrap px-2.5 py-1.5 text-xs rounded-lg bg-gray-900 text-white
          shadow-lg pointer-events-none leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4
            border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// Toast
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 flex items-center gap-2.5
      px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-xs ${styles}`}>
      {type === "error"
        ? <AlertTriangle className="w-4 h-4 shrink-0" />
        : <BookOpen className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
      <button type="button" onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Confirm Delete Dialog
function ConfirmDialog({ isOpen, mapel, onConfirm, onCancel, loading }) {
  if (!isOpen || !mapel) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Hapus Mata Pelajaran</h3>
            <p className="text-sm text-gray-500 mt-0.5">Aksi ini tidak bisa dibatalkan.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">{mapel.nama_mapel}</span>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Yakin ingin menghapus mata pelajaran ini? Mapel yang masih digunakan di
          jadwal tidak dapat dihapus.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600
              hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm
              bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// Form Modal
const inputClass =
  "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

function MapelFormModal({ isOpen, onClose, onSubmit, editMapel, loading }) {
  const [namaMapel, setNamaMapel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setNamaMapel(editMapel?.nama_mapel ?? "");
    setError("");
  }, [editMapel, isOpen]);

  const handleClose = () => {
    if (loading) return;
    setNamaMapel("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = namaMapel.trim();
    if (!trimmed) { setError("Nama mata pelajaran wajib diisi"); return; }
    try {
      await onSubmit(trimmed);
      handleClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              {editMapel ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100
              rounded-lg transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <input
              id="nama-mapel-input"
              value={namaMapel}
              onChange={(e) => setNamaMapel(e.target.value)}
              placeholder="Contoh: Matematika, Bahasa Indonesia, IPA..."
              className={inputClass}
              disabled={loading}
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Maksimal 100 karakter.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700
              bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm border border-gray-200
                text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="submit-mapel-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editMapel ? "Simpan Perubahan" : "Tambah Mapel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Skeleton Row
function SkeletonRow({ delay = 0 }) {
  return (
    <tr className="border-b border-gray-50">
      {[32, 200, 160, 120].map((w, i) => (
        <td key={i} className="px-6 py-4.5">
          <div
            className="h-3.5 rounded-lg bg-gray-100 animate-pulse"
            style={{ width: w, animationDelay: `${delay}ms` }}
          />
        </td>
      ))}
    </tr>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Main Component
export default function MapelManagement() {
  const [mapels, setMapels]               = useState([]);
  const [fetchLoading, setFetchLoading]   = useState(true);
  const [fetchError, setFetchError]       = useState("");

  const [search, setSearch]               = useState("");
  const searchRef                         = useRef(null);

  const [showModal, setShowModal]         = useState(false);
  const [editMapel, setEditMapel]         = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  // Fetch all mapel
  const fetchAll = useCallback(async () => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const res = await mapelApi.list();
      setMapels(res?.data ?? []);
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data mata pelajaran");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter search
  const filtered = mapels.filter((m) =>
    m.nama_mapel.toLowerCase().includes(search.toLowerCase())
  );

  // Create / Update
  const handleSubmitMapel = async (namaMapel) => {
    setSubmitLoading(true);
    try {
      if (editMapel) {
        const res = await mapelApi.update(editMapel.id, { nama_mapel: namaMapel });
        if (res?.success === false) throw new Error(res.message || "Gagal memperbarui mata pelajaran");
        showToast("Mata pelajaran berhasil diperbarui");
      } else {
        const res = await mapelApi.create({ nama_mapel: namaMapel });
        if (res?.success === false) throw new Error(res.message || "Gagal menambahkan mata pelajaran");
        showToast("Mata pelajaran berhasil ditambahkan");
      }
      await fetchAll();
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const targetId = confirmDelete.id;
    setDeleteLoading(true);
    setConfirmDelete(null);
    try {
      const res = await mapelApi.delete(targetId);
      if (res?.success === false) {
        showToast(res.message || "Gagal menghapus mata pelajaran", "error");
      } else {
        showToast("Mata pelajaran berhasil dihapus");
        await fetchAll();
      }
    } catch (err) {
      showToast(err.message || "Gagal menghapus mata pelajaran", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      {/* Header */}
      <PageHeader
        title="Manajemen Mata Pelajaran"
        subtitle="Kelola daftar mata pelajaran yang tersedia dalam sistem."
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Daftar Mata Pelajaran</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {fetchLoading ? "Memuat data…" : `${mapels.length} mata pelajaran terdaftar`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  id="search-mapel"
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari mata pelajaran…"
                  className="pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200
                    rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500
                    focus:border-transparent transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Refresh */}
              <Tooltip text="Refresh data">
                <button
                  id="refresh-mapel-btn"
                  type="button"
                  onClick={fetchAll}
                  disabled={fetchLoading}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500
                    hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchLoading ? "animate-spin" : ""}`} />
                </button>
              </Tooltip>

              {/* Add */}
              <button
                id="add-mapel-btn"
                type="button"
                onClick={() => { setEditMapel(null); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600
                  text-white rounded-xl hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Mapel
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { label: "No",                cls: "w-12" },
                    { label: "Nama Mata Pelajaran", cls: "" },
                    { label: "Tanggal Ditambahkan", cls: "" },
                    { label: "Aksi",              cls: "" },
                  ].map(({ label, cls }) => (
                    <th
                      key={label}
                      className={`px-6 py-3 text-xs font-semibold text-gray-500
                        uppercase tracking-wider text-left ${cls}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {fetchLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} delay={i * 60} />
                  ))
                ) : fetchError ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-red-500">
                        <div className="p-3 bg-red-50 rounded-full">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium">{fetchError}</p>
                        <button
                          type="button"
                          onClick={fetchAll}
                          className="px-4 py-2 rounded-xl border border-red-200
                            text-red-600 hover:bg-red-50 text-xs"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="p-4 bg-gray-50 rounded-full">
                          {search
                            ? <Search className="w-6 h-6" />
                            : <BookX className="w-6 h-6" />}
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                          {search
                            ? `Tidak ada mapel yang cocok dengan "${search}"`
                            : "Belum ada mata pelajaran. Tambahkan sekarang."}
                        </p>
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Hapus pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((mapel, idx) => {
                    return (
                      <tr
                        key={mapel.id}
                        className="transition-colors duration-100 hover:bg-indigo-50/20"
                      >
                        {/* No */}
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Nama Mapel - tanpa badge dan icon */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-800">
                            {mapel.nama_mapel}
                          </p>
                        </td>

                        {/* Tanggal Dibuat */}
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(mapel.created_at)}
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 ">
                            <Tooltip text="Edit mata pelajaran">
                              <button
                                id={`edit-mapel-${mapel.id}`}
                                type="button"
                                onClick={() => { setEditMapel(mapel); setShowModal(true); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5
                                  text-xs border border-gray-200 rounded-lg text-gray-600
                                  hover:bg-gray-50 hover:border-gray-300 transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            </Tooltip>

                            <Tooltip text="Hapus mata pelajaran">
                              <button
                                id={`delete-mapel-${mapel.id}`}
                                type="button"
                                onClick={() => setConfirmDelete(mapel)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5
                                  text-xs border border-red-200 rounded-lg text-red-600
                                  hover:bg-red-50 hover:border-red-300 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer info */}
            {!fetchLoading && !fetchError && filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-50 flex items-center
                justify-between text-xs text-gray-400">
                <span>
                  Menampilkan{" "}
                  <span className="font-medium text-gray-600">{filtered.length}</span>{" "}
                  dari{" "}
                  <span className="font-medium text-gray-600">{mapels.length}</span>{" "}
                  mata pelajaran
                </span>
                {search && (
                  <span>
                    Filter:{" "}
                    <span className="font-medium text-gray-600">"{search}"</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <MapelFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitMapel}
        editMapel={editMapel}
        loading={submitLoading}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        mapel={confirmDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteLoading}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}