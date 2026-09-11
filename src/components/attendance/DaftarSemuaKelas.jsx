import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  School,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { kelas, tahunAjaran } from "../../lib/backendApi";
import InfoStatCard from "../layout/InfoStatCard";
import PageHeader from "../layout/PageHeader";
import Pagination from "../layout/Pagination";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm " +
  "text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

const DEFAULT_LEVEL_OPTIONS = ["X", "XI", "XII"];
const DEFAULT_ROMBEL_OPTIONS = ["1", "2", "3", "4", "5"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 max-w-sm rounded-2xl border px-4 py-3 shadow-xl ${tone}`}>
      <div className="flex items-start gap-3">
        {toast.type === "error" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button type="button" onClick={onClose} className="opacity-60 transition hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KelasFormModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  editItem,
  tahunOptions,
  suggestedJurusan,
}) {
  const [form, setForm] = useState({
    kelas: "",
    jurusan: "",
    rombel: "",
    tahun_ajaran_id: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const activeTahun =
      tahunOptions.find((item) => item?.is_active) ||
      tahunOptions[0] ||
      null;

    let baseJurusan = editItem?.jurusan ?? "";
    let baseRombel = "";

    if (editItem?.jurusan) {
      const match = editItem.jurusan.match(/^(.*?)\s+(\d+|[A-Za-z])$/);
      if (match) {
        baseJurusan = match[1].trim();
        baseRombel = match[2].trim();
      }
    }

    setForm({
      kelas: editItem?.kelas ?? "",
      jurusan: baseJurusan,
      rombel: baseRombel,
      tahun_ajaran_id: editItem?.tahun_ajaran_id
        ? String(editItem.tahun_ajaran_id)
        : activeTahun?.id
          ? String(activeTahun.id)
          : "",
    });
    setError("");
  }, [isOpen, editItem, tahunOptions]);

  if (!isOpen) return null;

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.kelas.trim()) {
      setError("Nama kelas wajib diisi");
      return;
    }

    if (!form.jurusan.trim()) {
      setError("Nama jurusan wajib diisi");
      return;
    }

    if (!form.tahun_ajaran_id) {
      setError("Tahun ajaran wajib dipilih");
      return;
    }

    const cleanJurusan = form.jurusan.trim();
    const cleanRombel = form.rombel.trim();
    let finalJurusan = cleanJurusan;
    if (cleanRombel && !cleanJurusan.toLowerCase().endsWith(cleanRombel.toLowerCase())) {
      finalJurusan = `${cleanJurusan} ${cleanRombel}`;
    }

    try {
      await onSubmit({
        kelas: form.kelas.trim(),
        jurusan: finalJurusan,
        tahun_ajaran_id: Number(form.tahun_ajaran_id),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Gagal menyimpan data kelas");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editItem ? "Edit Kelas" : "Tambah Kelas Baru"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Kelola kelas, jurusan, dan rombel langsung dari halaman ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Tingkat Kelas</label>
              <input
                className={inputClass}
                placeholder="Contoh: X, XI, XII"
                value={form.kelas}
                onChange={(event) => updateForm("kelas", event.target.value.toUpperCase())}
                disabled={loading}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {DEFAULT_LEVEL_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateForm("kelas", item)}
                    disabled={loading}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      form.kelas === item
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Jurusan</label>
              <input
                className={inputClass}
                placeholder="Contoh: Rekayasa Perangkat Lunak"
                value={form.jurusan}
                onChange={(event) => updateForm("jurusan", event.target.value)}
                disabled={loading}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedJurusan.slice(0, 6).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateForm("jurusan", item)}
                    disabled={loading}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      form.jurusan === item
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Rombel (Nomor)</label>
              <input
                className={inputClass}
                placeholder="Contoh: 1, 2, 3"
                value={form.rombel}
                onChange={(event) => updateForm("rombel", event.target.value)}
                disabled={loading}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {DEFAULT_ROMBEL_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateForm("rombel", item)}
                    disabled={loading}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      form.rombel === item
                        ? "border-purple-200 bg-purple-50 text-purple-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Tahun Ajaran</label>
            <select
              className={inputClass}
              value={form.tahun_ajaran_id}
              onChange={(event) => updateForm("tahun_ajaran_id", event.target.value)}
              disabled={loading}
            >
              <option value="">Pilih tahun ajaran</option>
              {tahunOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tahun_ajaran}{item.is_active ? " (Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Preview Data Kelas</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white px-3 py-2.5 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium">Tingkat</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">{form.kelas || "-"}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium">Jurusan</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">{form.jurusan || "-"}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium">Rombel</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">{form.rombel || "-"}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium">Tahun Ajaran</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">
                  {tahunOptions.find((item) => String(item.id) === form.tahun_ajaran_id)?.tahun_ajaran || "-"}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-blue-100/80 flex items-center justify-between">
              <span className="text-xs text-blue-900 font-medium">Nama Kelas di Sistem:</span>
              <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200">
                {form.kelas ? `${form.kelas} ${form.jurusan} ${form.rombel}`.trim() : "-"}
              </span>
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editItem ? "Simpan Perubahan" : "Tambah Kelas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ isOpen, item, loading, onClose, onConfirm }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-50 p-3">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hapus data kelas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Data kelas <b>{item.kelas} {item.jurusan}</b> akan dihapus. Jika masih dipakai di backend,
              aksi ini bisa ditolak.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DaftarSemuaKelas() {
  const [classList, setClassList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterTahunId, setFilterTahunId] = useState("");

  const pageSize = 10;

  const showToast = (message, type = "success") => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError("");

    try {
      const [kelasRes, tahunRes] = await Promise.all([
        kelas.list("page=1&limit=1000"),
        tahunAjaran.list(),
      ]);

      setClassList(Array.isArray(kelasRes?.data) ? kelasRes.data : []);
      setTahunList(Array.isArray(tahunRes?.data) ? tahunRes.data : []);
    } catch (e) {
      console.error("Failed to fetch classes", e);
      setFetchError(e?.message || "Gagal memuat data kelas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const suggestedJurusan = useMemo(
    () =>
      Array.from(
        new Set(
          classList
            .map((item) => {
              const raw = item?.jurusan?.trim() || "";
              const match = raw.match(/^(.*?)\s+(\d+|[A-Za-z])$/);
              return match ? match[1].trim() : raw;
            })
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "id")),
    [classList]
  );

  const stats = useMemo(() => {
    const jurusanCount = new Set(
      classList.map((item) => item?.jurusan?.trim()).filter(Boolean)
    ).size;
    const activeTahun = tahunList.find((item) => item?.is_active);

    return {
      totalKelas: classList.length,
      totalJurusan: jurusanCount,
      tahunAktif: activeTahun?.tahun_ajaran || "-",
    };
  }, [classList, tahunList]);

  const hasActiveFilter = filterTahunId || searchTerm;

  const filteredClasses = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const sorted = [...classList].sort((a, b) => {
      const left = `${a.kelas || ""} ${a.jurusan || ""}`;
      const right = `${b.kelas || ""} ${b.jurusan || ""}`;
      return left.localeCompare(right, "id");
    });

    return sorted.filter((cls) => {
      if (keyword) {
        const haystack = [cls.kelas, cls.jurusan, cls.id?.toString(), cls.tahun?.tahun_ajaran]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (filterTahunId) {
        if (String(cls.tahun_ajaran_id) !== String(filterTahunId)) return false;
      }

      return true;
    });
  }, [classList, searchTerm, filterTahunId]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterTahunId]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const pagedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSubmit = async (payload) => {
    setSubmitLoading(true);
    try {
      const res = editingItem
        ? await kelas.update(editingItem.id, payload)
        : await kelas.create(payload);

      if (res?.success === false) {
        throw new Error(res.message || "Gagal menyimpan data kelas");
      }

      showToast(editingItem ? "Data kelas berhasil diperbarui" : "Kelas berhasil ditambahkan");
      setEditingItem(null);
      await loadData();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await kelas.delete(deleteTarget.id);
      if (res?.success === false) {
        throw new Error(res.message || "Gagal menghapus data kelas");
      }

      showToast("Data kelas berhasil dihapus");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showToast(err?.message || "Gagal menghapus data kelas", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Manajemen Kelas"
        subtitle="Kelola data kelas dan jurusan dari satu halaman."
      />

      <div className="flex-1 overflow-auto p-8">
        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoStatCard
            label="Total Kelas"
            value={stats.totalKelas}
            helper="Semua kelas aktif di sistem"
            icon={<School className="h-5 w-5" />}
            tone="blue"
          />
          <InfoStatCard
            label="Jurusan Unik"
            value={stats.totalJurusan}
            helper="Diambil dari data jurusan saat ini"
            icon={<BookOpen className="h-5 w-5" />}
            tone="emerald"
          />
          <InfoStatCard
            label="Tahun Aktif"
            value={stats.tahunAktif}
            helper="Default saat tambah data baru"
            icon={<GraduationCap className="h-5 w-5" />}
            tone="violet"
          />
        </div>

        {fetchError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Data kelas belum berhasil dimuat.</p>
                <p className="mt-1">{fetchError}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-800">Daftar Kelas</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Fokus hanya ke kelas, jurusan, tahun ajaran, dan aksi manajemen.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filter Tahun Ajaran */}
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={filterTahunId}
                  onChange={(e) => setFilterTahunId(e.target.value)}
                >
                  <option value="">Semua tahun</option>
                  {tahunList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tahun_ajaran}{item.is_active ? " (Aktif)" : ""}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari ID, kelas, jurusan, atau tahun..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Add button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Kelas
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-190">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jurusan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tahun Ajaran</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    </tr>
                  ))
                ) : filteredClasses.length > 0 ? (
                  pagedClasses.map((cls, index) => (
                    <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {cls.kelas}
                          </span>
                          <span className="text-xs text-gray-400">ID kelas: {cls.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cls.jurusan || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cls.tahun?.tahun_ajaran || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(cls.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(cls);
                              setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cls)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                      {hasActiveFilter
                        ? "Tidak ada kelas yang cocok dengan filter."
                        : "Tidak ada kelas yang ditemukan."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredClasses.length > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={
                hasActiveFilter
                  ? `Menampilkan ${pagedClasses.length} hasil dari ${filteredClasses.length} data terfilter, total kelas ${classList.length}`
                  : `Menampilkan ${pagedClasses.length} data dari total ${classList.length} kelas`
              }
              className="border-gray-100 bg-gray-50/50"
            />
          ) : null}
        </div>
      </div>

      <KelasFormModal
        isOpen={showModal}
        onClose={() => {
          if (submitLoading) return;
          setShowModal(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        loading={submitLoading}
        editItem={editingItem}
        tahunOptions={tahunList}
        suggestedJurusan={suggestedJurusan}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        item={deleteTarget}
        loading={deleteLoading}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}