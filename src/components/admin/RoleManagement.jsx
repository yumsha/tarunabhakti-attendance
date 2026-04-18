import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";

const DEFAULT_PERMISSIONS = [
  { key: "student.read", label: "Lihat data siswa" },
  { key: "student.create", label: "Tambah data siswa" },
  { key: "parent.read", label: "Lihat data orang tua" },
  { key: "parent.create", label: "Tambah data orang tua" },
  { key: "user.read", label: "Lihat data user" },
  { key: "user.create", label: "Buat user" },
  { key: "user.update", label: "Edit user" },
  { key: "role.manage", label: "Kelola role" },
  { key: "schedule.manage", label: "Kelola Jadwal" },
  { key: "schedule.read", label: "Lihat Jadwal" },
];

const INITIAL_ROLES = [
  {
    id: 1,
    name: "SUPER_ADMIN",
    description: "Akses penuh ke semua fitur sistem",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.key),
    usersCount: 1,
    status: "Aktif",
  },
  {
    id: 2,
    name: "ADMIN",
    description: "Operasional data siswa dan orang tua",
    permissions: ["student.read", "student.create", "parent.read", "parent.create", "user.read", "role.manage", "schedule.manage", "schedule.read"],
    usersCount: 4,
    status: "Aktif",
  },
];

const inputClass =
  "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function PermissionChecklist({ selected, onToggle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {DEFAULT_PERMISSIONS.map((permission) => {
        const checked = selected.includes(permission.key);
        return (
          <label
            key={permission.key}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${
              checked
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(permission.key)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{permission.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function RoleFormModal({ isOpen, onClose, onSubmit, editRole }) {
  const [form, setForm] = useState({
    name: editRole?.name ?? "",
    description: editRole?.description ?? "",
    permissions: editRole?.permissions ?? [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: editRole?.name ?? "",
      description: editRole?.description ?? "",
      permissions: editRole?.permissions ?? [],
    });
    setError("");
  }, [editRole, isOpen]);

  const handleClose = () => {
    setForm({
      name: editRole?.name ?? "",
      description: editRole?.description ?? "",
      permissions: editRole?.permissions ?? [],
    });
    setError("");
    onClose();
  };

  const togglePermission = (key) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((item) => item !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Nama role wajib diisi");
      return;
    }
    if (!form.permissions.length) {
      setError("Minimal pilih 1 akses");
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim().toUpperCase(),
      description: form.description.trim(),
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {editRole ? "Edit Role" : "Tambah Role Baru"}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-sm">
            Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Nama Role</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: SUPER_ADMIN"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Deskripsi</label>
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ringkasan fungsi role"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Akses Role (UI Dummy)</label>
            <PermissionChecklist selected={form.permissions} onToggle={togglePermission} />
          </div>

          {error ? (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              {editRole ? "Simpan Perubahan" : "Buat Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoleManagement() {
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);

  const totalUsedPermissions = useMemo(
    () => new Set(roles.flatMap((role) => role.permissions)).size,
    [roles]
  );
  const totalMasterPermissions = DEFAULT_PERMISSIONS.length;

  const handleCreate = () => {
    setEditRole(null);
    setShowModal(true);
  };

  const handleEdit = (role) => {
    setEditRole(role);
    setShowModal(true);
  };

  const handleSubmitRole = (payload) => {
    if (editRole) {
      setRoles((prev) =>
        prev.map((role) =>
          role.id === editRole.id
            ? { ...role, ...payload, usersCount: role.usersCount ?? 0, status: role.status ?? "Aktif" }
            : role
        )
      );
      return;
    }

    const newRole = {
      id: Date.now(),
      ...payload,
      usersCount: 0,
      status: "Aktif",
    };
    setRoles((prev) => [newRole, ...prev]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Manajemen Role"
        subtitle="Desain UI role untuk sementara sebelum backend tersedia"
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Role</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{roles.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Master Akses</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{totalMasterPermissions}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Akses Terpakai di Role</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{totalUsedPermissions}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Daftar Role</h3>
              <p className="text-xs text-gray-500 mt-1">
                Data ini masih lokal (belum terhubung backend).
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Tambah Role
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {["Role", "Deskripsi", "Jumlah Akses", "User", "Status", "Aksi"].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-800">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{role.description || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{role.permissions.length} akses</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{role.usersCount}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {role.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEdit(role)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RoleFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitRole}
        editRole={editRole}
      />
    </div>
  );
}
