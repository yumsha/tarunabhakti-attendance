import { useEffect, useState, useCallback, useRef } from "react";
import {
  Pencil, Plus, ShieldCheck, Trash2, Loader2, AlertTriangle,
  Search, X, Users, RefreshCw, ShieldAlert,
} from "lucide-react";
import { role as roleApi } from "../../lib/backendApi";

// Bangun map { [role_id]: user_count } langsung dari data role.
function buildRoleUserCount(roles = []) {
  const map = {};
  for (const r of roles) {
    map[r.id] = r.user_count ?? 0;
  }
  return map;
}

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
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5
      px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-xs ${styles}`}>
      {type === "error"
        ? <AlertTriangle className="w-4 h-4 shrink-0" />
        : <ShieldCheck className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
      <button type="button" onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Confirm Dialog
function ConfirmDialog({ isOpen, role, onConfirm, onCancel, loading }) {
  if (!isOpen || !role) return null;
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
            <h3 className="font-semibold text-gray-800">Hapus Role</h3>
            <p className="text-sm text-gray-500 mt-0.5">Aksi ini tidak bisa dibatalkan.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">{role.name}</span>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Yakin ingin menghapus role ini? Role yang masih digunakan oleh user
          tidak dapat dihapus.
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
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function RoleFormModal({ isOpen, onClose, onSubmit, editRole, loading }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(editRole?.name ?? "");
    setError("");
  }, [editRole, isOpen]);

  const handleClose = () => {
    if (loading) return;
    setName("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) { setError("Nama role wajib diisi"); return; }
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
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              {editRole ? "Edit Role" : "Tambah Role Baru"}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Role
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: ADMIN"
              className={inputClass}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Nama akan otomatis diubah ke UPPERCASE.
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
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editRole ? "Simpan Perubahan" : "Buat Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Role icon badge color
const ROLE_PALETTE = {
  SUPER_ADMIN: "bg-purple-50 text-purple-600 border-purple-200",
  ADMIN:       "bg-blue-50 text-blue-600 border-blue-200",
  GURU:        "bg-emerald-50 text-emerald-600 border-emerald-200",
  WALAS:       "bg-teal-50 text-teal-600 border-teal-200",
  KESISWAAN:   "bg-orange-50 text-orange-600 border-orange-200",
};
function roleIconColor(name = "") {
  const u = name.toUpperCase();
  for (const [k, v] of Object.entries(ROLE_PALETTE)) {
    if (u.includes(k)) return v;
  }
  return "bg-gray-50 text-gray-500 border-gray-200";
}

// Skeleton 
function SkeletonRow({ delay = 0 }) {
  return (
    <tr className="border-b border-gray-50">
      {[32, 180, 56, 100, 100, 120].map((w, i) => (
        <td key={i} className="px-6 py-[18px]">
          <div
            className="h-3.5 rounded-lg bg-gray-100 animate-pulse"
            style={{ width: w, animationDelay: `${delay}ms` }}
          />
        </td>
      ))}
    </tr>
  );
}

// Main 
export default function RoleManagement() {
  const [roles, setRoles]                 = useState([]);
  const [roleUserCount, setRoleUserCount] = useState({}); // { [role_id]: number }
  const [fetchLoading, setFetchLoading]   = useState(true);
  const [fetchError, setFetchError]       = useState("");

  const [search, setSearch]               = useState("");
  const searchRef                         = useRef(null);

  const [showModal, setShowModal]         = useState(false);
  const [editRole, setEditRole]           = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  // Fetch roles (user_count sudah disertakan dari backend)
  const fetchAll = useCallback(async () => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const rolesRes = await roleApi.list();
      const rolesData = rolesRes?.data ?? [];
      setRoles(rolesData);
      // user_count per role sudah di-hitung di backend
      setRoleUserCount(buildRoleUserCount(rolesData));
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter search 
  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Create / Update 
  const handleSubmitRole = async (name) => {
    setSubmitLoading(true);
    try {
      if (editRole) {
        const res = await roleApi.update(editRole.id, { name });
        if (res?.success === false) throw new Error(res.message || "Gagal memperbarui role");
        showToast("Role berhasil diperbarui");
      } else {
        const res = await roleApi.create({ name });
        if (res?.success === false) throw new Error(res.message || "Gagal menambahkan role");
        showToast("Role berhasil ditambahkan");
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
      const res = await roleApi.delete(targetId);
      if (res?.success === false) {
        showToast(res.message || "Gagal menghapus role", "error");
      } else {
        showToast("Role berhasil dihapus");
        await fetchAll();
      }
    } catch (err) {
      showToast(err.message || "Gagal menghapus role", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Derived stats 
  const totalUsed = roles.filter((r) => (roleUserCount[r.id] ?? 0) > 0).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 bg-white">
        <h1 className="text-xl font-semibold text-gray-800">Manajemen Role</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola hak akses dan role pengguna sistem.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Total Role",
              value: fetchLoading ? "—" : roles.length,
              color: "text-gray-800",
              icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
              bg: "bg-blue-50",
            },
            {
              label: "Role Digunakan",
              value: fetchLoading ? "—" : totalUsed,
              color: "text-orange-600",
              icon: <Users className="w-5 h-5 text-orange-500" />,
              bg: "bg-orange-50",
            },
            {
              label: "Role Kosong",
              value: fetchLoading ? "—" : roles.length - totalUsed,
              color: "text-emerald-600",
              icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
              bg: "bg-emerald-50",
            },
          ].map(({ label, value, color, icon, bg }) => (
            <div
              key={label}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4"
            >
              <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-2xl font-semibold mt-0.5 ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Daftar Role</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {fetchLoading ? "Memuat data…" : `${roles.length} role terdaftar`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari role…"
                  className="pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200
                    rounded-xl w-48 focus:outline-none focus:ring-2 focus:ring-blue-500
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
              <button
                type="button"
                onClick={fetchAll}
                disabled={fetchLoading}
                title="Refresh data"
                className="p-2 rounded-xl border border-gray-200 text-gray-500
                  hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <RefreshCw className={`w-4 h-4 ${fetchLoading ? "animate-spin" : ""}`} />
              </button>

              {/* Add */}
              <button
                type="button"
                onClick={() => { setEditRole(null); setShowModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600
                  text-white rounded-xl hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Role
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { label: "no",           cls: "w-12" },
                    { label: "Nama Role",   cls: "" },
                    { label: "Dibuat",      cls: "" },
                    { label: "Pengguna",    cls: "" },
                    { label: "Aksi",        cls: "" },
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
                    <td colSpan={6} className="px-6 py-16 text-center">
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
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="p-4 bg-gray-50 rounded-full">
                          {search
                            ? <Search className="w-6 h-6" />
                            : <ShieldAlert className="w-6 h-6" />}
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                          {search
                            ? `Tidak ada role yang cocok dengan "${search}"`
                            : "Belum ada role. Tambahkan role pertama."}
                        </p>
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Hapus pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((role, idx) => {
                    const count   = roleUserCount[role.id] ?? 0;
                    const iconCls = roleIconColor(role.name);

                    return (
                      <tr
                        key={role.id}
                        className="transition-colors duration-100 hover:bg-blue-50/20"
                      >
                        {/* # */}
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Nama Role */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border ${iconCls}`}>
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                              {role.name}
                            </p>
                          </div>
                        </td>


                        {/* Dibuat */}
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {role.created_at
                            ? new Date(role.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Pengguna — informatif, dari hitung users */}
                        <td className="px-6 py-4">
                          {count > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1
                              rounded-full text-xs font-medium bg-blue-50 text-blue-700
                              border border-blue-200">
                              <Users className="w-3 h-3" />
                              {count} user
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1
                              rounded-full text-xs font-medium bg-gray-50 text-gray-400
                              border border-gray-200">
                              <Users className="w-3 h-3" />
                              0 user
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Edit — selalu aktif */}
                            <button
                              type="button"
                              onClick={() => { setEditRole(role); setShowModal(true); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5
                                text-xs border border-gray-200 rounded-lg text-gray-600
                                hover:bg-gray-50 hover:border-gray-300 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(role)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5
                                text-xs border border-red-200 rounded-lg text-red-600
                                hover:bg-red-50 hover:border-red-300 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer */}
            {!fetchLoading && !fetchError && filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-50 flex items-center
                justify-between text-xs text-gray-400">
                <span>
                  Menampilkan{" "}
                  <span className="font-medium text-gray-600">{filtered.length}</span>{" "}
                  dari{" "}
                  <span className="font-medium text-gray-600">{roles.length}</span>{" "}
                  role
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
      <RoleFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitRole}
        editRole={editRole}
        loading={submitLoading}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        role={confirmDelete}
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