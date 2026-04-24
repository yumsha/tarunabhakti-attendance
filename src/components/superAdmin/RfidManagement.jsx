import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShieldBan,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import PageHeader from "../layout/PageHeader";
import InfoStatCard from "../layout/InfoStatCard";
import Pagination from "../layout/Pagination";
import { rfid as rfidApi, siswa as siswaApi } from "../../lib/backendApi";

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show ? (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg pointer-events-none">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      ) : null}
    </span>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = toast.type === "error"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${styles}`}>
      {toast.type === "error" ? (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ConfirmDialog({ isOpen, item, onCancel, onConfirm, loading }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-4">
          <div className="rounded-xl bg-red-50 p-2.5">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Hapus RFID</h3>
            <p className="mt-0.5 text-sm text-gray-500">Data akan di-soft delete dari sistem.</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">UID RFID</p>
          <p className="mt-1 font-mono text-sm font-semibold text-gray-800">{item.uid_rfid}</p>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Yakin ingin menghapus RFID untuk <span className="font-semibold text-gray-800">{item.siswa?.nama || "siswa ini"}</span>?
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition " +
  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500";

function RfidFormModal({
  isOpen,
  onClose,
  onSubmit,
  editItem,
  loading,
  students,
}) {
  const [uidRfid, setUidRfid] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setUidRfid(editItem?.uid_rfid ?? "");
    setSiswaId(editItem?.siswa_id ? String(editItem.siswa_id) : "");
    setIsActive(editItem?.is_active ?? true);
    setError("");
  }, [isOpen, editItem]);

  const handleClose = () => {
    if (loading) return;
    setError("");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      uid_rfid: uidRfid.trim(),
      siswa_id: siswaId.trim(),
      is_active: isActive,
    };

    if (!payload.uid_rfid) {
      setError("UID RFID wajib diisi.");
      return;
    }

    if (!payload.siswa_id) {
      setError("Siswa wajib dipilih.");
      return;
    }

    try {
      await onSubmit(payload);
      handleClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan RFID.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2">
              <ScanLine className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              {editItem ? "Edit RFID" : "Tambah RFID Baru"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              UID RFID <span className="text-red-500">*</span>
            </label>
            <input
              value={uidRfid}
              onChange={(event) => setUidRfid(event.target.value)}
              placeholder="Contoh: 04A1B2C3D4"
              className={inputClass}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Pilih Siswa <span className="text-red-500">*</span>
            </label>
            <select
              value={siswaId}
              onChange={(event) => setSiswaId(event.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="">Pilih siswa</option>
              {students.map((student) => {
                const hasActiveRfid = student.activeRfidCount > 0;
                const isCurrentStudent = editItem?.siswa_id === student.id;
                const disabled = !isCurrentStudent && hasActiveRfid;
                return (
                  <option key={student.id} value={student.id} disabled={disabled}>
                    {student.nama} - {student.classLabel}
                    {disabled ? " (sudah punya RFID aktif)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1.5 text-xs text-gray-400">
              Siswa yang sudah memiliki RFID aktif tidak bisa dipilih untuk data baru.
            </p>
          </div>

          {editItem ? (
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">RFID aktif</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Nonaktifkan jika kartu sudah tidak dipakai sementara atau diganti.
                </p>
              </div>
            </label>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {editItem ? "Simpan Perubahan" : "Tambah RFID"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkeletonRow({ delay = 0 }) {
  return (
    <tr className="border-b border-gray-50">
      {[32, 140, 180, 120, 110, 120].map((width, index) => (
        <td key={index} className="px-6 py-4.5">
          <div
            className="h-3.5 animate-pulse rounded-lg bg-gray-100"
            style={{ width, animationDelay: `${delay}ms` }}
          />
        </td>
      ))}
    </tr>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeStudents(items = []) {
  return items.map((student) => ({
    id: student.id,
    nama: student.nama,
    NIPD: student.NIPD,
    NISN: student.NISN,
    classLabel: student.kelas
      ? `${student.kelas.kelas}${student.kelas.jurusan ? ` ${student.kelas.jurusan}` : ""}`
      : "-",
    activeRfidCount: Array.isArray(student.rfid)
      ? student.rfid.filter((item) => item?.is_active).length
      : 0,
  }));
}

function getStatusBadge(isActive) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export default function RfidManagement() {
  const [rfidRows, setRfidRows] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const searchRef = useRef(null);
  const pageSize = 10;
  const normalizedSearch = search.trim().toLowerCase();

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const fetchStudents = useCallback(async () => {
    const res = await siswaApi.list("page=1&limit=1000");
    if (!res?.success) {
      throw new Error(res?.message || "Gagal memuat daftar siswa.");
    }
    setStudentOptions(normalizeStudents(res.data || []));
  }, []);

  const fetchRfid = useCallback(async () => {
    setFetchLoading(true);
    setFetchError("");

    try {
      const res = await rfidApi.list("page=1&limit=10000");
      if (!res?.success) {
        throw new Error(res?.message || "Gagal memuat data RFID.");
      }

      setRfidRows(res.data || []);
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data RFID.");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents().catch((err) => {
      showToast(err.message || "Gagal memuat daftar siswa.", "error");
    });
  }, [fetchStudents, showToast]);

  useEffect(() => {
    fetchRfid();
  }, [fetchRfid]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rfidRows;

    return rfidRows.filter((item) => {
      const kelasLabel = item.siswa?.kelas
        ? `${item.siswa.kelas.kelas} ${item.siswa.kelas.jurusan || ""}`.trim()
        : "";

      return [
        item.uid_rfid,
        item.siswa?.nama,
        kelasLabel,
        item.siswa?.id ? String(item.siswa.id) : "",
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [rfidRows, normalizedSearch]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  const effectivePagination = useMemo(() => {
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      page,
      limit: pageSize,
      total,
      totalPages,
    };
  }, [filteredRows.length, page]);

  const stats = useMemo(() => {
    const active = rfidRows.filter((item) => item.is_active).length;
    const inactive = rfidRows.length - active;
    const assigned = rfidRows.filter((item) => item.siswa?.id).length;
    return {
      total: rfidRows.length,
      active,
      inactive,
      assigned,
    };
  }, [rfidRows]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchRfid(),
      fetchStudents().catch((err) => {
        showToast(err.message || "Gagal memuat daftar siswa.", "error");
      }),
    ]);
  };

  const handleSubmit = async (payload) => {
    setSubmitLoading(true);
    try {
      let res;
      if (editItem) {
        res = await rfidApi.update(editItem.id, payload);
      } else {
        res = await rfidApi.create({
          uid_rfid: payload.uid_rfid,
          siswa_id: payload.siswa_id,
        });
      }

      if (!res?.success) {
        throw new Error(res?.message || "Gagal menyimpan data RFID.");
      }

      showToast(editItem ? "Data RFID berhasil diperbarui." : "RFID baru berhasil ditambahkan.");
      await handleRefresh();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      const res = await rfidApi.delete(confirmDelete.id);
      if (!res?.success) {
        throw new Error(res?.message || "Gagal menghapus data RFID.");
      }
      showToast("Data RFID berhasil dihapus.");
      setConfirmDelete(null);
      await handleRefresh();
    } catch (err) {
      showToast(err.message || "Gagal menghapus data RFID.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const summaryText = filteredRows.length === 0
    ? "Belum ada data RFID untuk ditampilkan"
    : normalizedSearch
      ? `Menampilkan ${pagedRows.length} hasil pencarian dari ${filteredRows.length} data, total seluruh RFID ${stats.total}`
      : `Menampilkan ${pagedRows.length} data dari total ${stats.total} RFID`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Manajemen RFID"
        subtitle="Kelola kartu RFID siswa, status keaktifan, dan distribusinya ke tiap siswa."
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoStatCard
            label="Total RFID"
            value={stats.total}
            helper="Seluruh data RFID yang sedang tampil"
            icon={<ScanLine className="h-5 w-5" />}
            tone="blue"
            loading={fetchLoading}
          />
          <InfoStatCard
            label="RFID Aktif"
            value={stats.active}
            helper="Siap digunakan untuk absensi"
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
            loading={fetchLoading}
          />
          <InfoStatCard
            label="RFID Nonaktif"
            value={stats.inactive}
            helper="Perlu dicek atau diaktifkan kembali"
            icon={<ShieldBan className="h-5 w-5" />}
            tone="amber"
            loading={fetchLoading}
          />
          <InfoStatCard
            label="Terhubung ke Siswa"
            value={stats.assigned}
            helper="Sudah punya pasangan siswa"
            icon={<UserRound className="h-5 w-5" />}
            tone="teal"
            loading={fetchLoading}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="px-6">
                <h3 className="font-semibold text-gray-800">Daftar RFID</h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {fetchLoading ? "Memuat data..." : `${stats.total} data RFID tersedia`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari UID, nama siswa, atau kelas..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-72"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        searchRef.current?.focus();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                
                <div className="flex justify-end border-t border-gray-100 bg-white px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem(null);
                      setShowModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah RFID
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["No", "UID RFID", "Siswa", "Kelas", "Status", "Update Terakhir", "Aksi"].map((label) => (
                    <th
                      key={label}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {fetchLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} delay={index * 60} />
                  ))
                ) : fetchError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-red-500">
                        <div className="rounded-full bg-red-50 p-3">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium">{fetchError}</p>
                        <button
                          type="button"
                          onClick={fetchRfid}
                          className="rounded-xl border border-red-200 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="rounded-full bg-gray-50 p-4">
                          {search ? <Search className="h-6 w-6" /> : <ScanLine className="h-6 w-6" />}
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                          {search
                            ? `Tidak ada RFID yang cocok dengan "${search}".`
                            : "Belum ada data RFID. Tambahkan data pertama."}
                        </p>
                        {search ? (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Hapus pencarian
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((item, index) => {
                    const rowNumber = ((effectivePagination.page - 1) * effectivePagination.limit) + index + 1;
                    const kelasLabel = item.siswa?.kelas
                      ? `${item.siswa.kelas.kelas}${item.siswa.kelas.jurusan ? ` ${item.siswa.kelas.jurusan}` : ""}`
                      : "-";

                    return (
                      <tr key={item.id} className="transition-colors duration-100 hover:bg-blue-50/20">
                        <td className="px-6 py-4 font-mono text-sm text-gray-400">{rowNumber}</td>
                        <td className="px-6 py-4">
                          <div className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs text-white">
                            {item.uid_rfid}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{item.siswa?.nama || "-"}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              ID Siswa: {item.siswa?.id || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{kelasLabel}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadge(item.is_active)}`}>
                            {item.is_active ? <CheckCircle2 className="h-3 w-3" /> : <ShieldBan className="h-3 w-3" />}
                            {item.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(item.updated_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Tooltip text="Edit RFID">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditItem(item);
                                  setShowModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </Tooltip>
                            <Tooltip text="Hapus RFID">
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
          </div>

          <Pagination
            page={effectivePagination.page}
            totalPages={effectivePagination.totalPages}
            onPageChange={setPage}
            summary={summaryText}
            className="border-gray-100 bg-gray-50/50"
          />
        </div>
      </div>

      <RfidFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        editItem={editItem}
        loading={submitLoading}
        students={studentOptions}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        item={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
