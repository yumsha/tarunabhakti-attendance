// UserFormModal.jsx — Fixed: multi-role selection + unauthorized bug
import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Loader2, Eye, EyeOff, ChevronDown, Check } from "lucide-react";

const inputClass =
  "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function resolveRoles(userData) {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

  const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase())
    .map((r) => (r === "WALI KELAS" ? "WALAS" : r));

  return Array.from(new Set(merged));
}

function pickRoleOptionNames(editUser, roleOptions) {
  const userRoles = resolveRoles(editUser);
  const names = roleOptions.map((o) => o.name);
  const matched = [];

  for (const ur of userRoles) {
    const hit = names.find((n) => n.trim().toUpperCase() === ur.trim().toUpperCase());
    if (hit && !matched.includes(hit)) matched.push(hit);
  }

  // Fallback ke role pertama kalau tidak ada yang cocok
  if (!matched.length && names.length) matched.push(names[0]);
  return matched;
}

function defaultRoleOptions(roleOptions) {
  const admin = roleOptions.find((r) => r.name.trim().toUpperCase() === "GURU");
  return admin ? [admin.name] : roleOptions.length ? [roleOptions[0].name] : [];
}

function deriveRolePayload(selectedNames) {
  const uppers = selectedNames.map((n) => n.trim().toUpperCase());

  if (uppers.includes("ADMIN")) {
    return { role: "ADMIN", role_names: ["ADMIN"] };
  }

  const role_names_set = new Set(selectedNames.map((n) => n.trim()));

  // WALAS selalu butuh GURU juga di BE
  if (uppers.includes("WALAS")) {
    // Cari nama asli GURU dari array
    const guruName = selectedNames.find((n) => n.trim().toUpperCase() === "GURU") ?? "GURU";
    role_names_set.add(guruName);
  }

  const role_names = Array.from(role_names_set);

  // `role` primary = nama pertama
  const role = role_names[0] ?? selectedNames[0];

  return { role, role_names };
}

// Multi-select Role Dropdown 
function MultiRoleSelect({ value = [], onChange, options, disabled, isEditAdmin }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOption = (name) => {
    if (isEditAdmin) return;

    const uppers = value.map((v) => v.trim().toUpperCase());
    const targetUpper = name.trim().toUpperCase();

    if (uppers.includes(targetUpper)) {
      // Jangan hapus kalau itu satu-satunya
      if (value.length === 1) return;
      onChange(value.filter((v) => v.trim().toUpperCase() !== targetUpper));
    } else {
      // Kalau pilih ADMIN, reset ke ADMIN saja
      if (targetUpper === "ADMIN") {
        onChange([name]);
      } else {
        // Hapus ADMIN kalau ada, lalu tambahkan
        const without_admin = value.filter((v) => v.trim().toUpperCase() !== "ADMIN");
        onChange([...without_admin, name]);
      }
    }
  };

  const displayLabel =
    value.length === 0
      ? "Pilih role"
      : value.length === 1
      ? value[0]
      : `${value.length} role dipilih`;

  const isLocked = disabled || isEditAdmin;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !isLocked && setIsOpen((o) => !o)}
        disabled={isLocked}
        className={`${inputClass} text-left flex items-center justify-between gap-2 ${
          isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {/* Badge chips */}
        <span className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-gray-400">{options.length === 0 ? "Memuat daftar role…" : "Pilih role"}</span>
          ) : (
            value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium"
              >
                {v}
                {!isLocked && value.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(v);
                    }}
                    className="ml-0.5 hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </span>
        {!isLocked && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && !isLocked && options.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {options.map((opt) => {
              const isSelected = value.some(
                (v) => v.trim().toUpperCase() === opt.name.trim().toUpperCase()
              );
              const isAdminOpt = opt.name.trim().toUpperCase() === "ADMIN";
              const hasAdmin = value.some((v) => v.trim().toUpperCase() === "ADMIN");

              // Disable non-admin pilihan ketika ADMIN sudah dipilih
              const isDisabledOpt = hasAdmin && !isAdminOpt;

              return (
                <button
                  key={`${opt.id ?? "x"}-${opt.name}`}
                  type="button"
                  onClick={() => !isDisabledOpt && toggleOption(opt.name)}
                  disabled={isDisabledOpt}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                    ${isDisabledOpt ? "opacity-40 cursor-not-allowed bg-white" : "hover:bg-gray-50"}
                    ${isSelected ? "bg-blue-50" : ""}
                  `}
                >
                  <span className={isSelected ? "text-blue-700 font-medium" : "text-gray-700"}>
                    {opt.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            {value.length} role dipilih · Klik untuk toggle
          </div>
        </div>
      )}
    </div>
  );
}

// Main Modal
export default function UserFormModal({ isOpen, onClose, onSubmit, editUser, roleOptions = [] }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    roles: [],
    guru_nama: "",
    guru_nip: "",
    guru_telepon: "",
    guru_alamat: "",
    guru_tanggal_lahir: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditAdmin = !!editUser && resolveRoles(editUser).includes("ADMIN");

  useEffect(() => {
    if (!isOpen) return;

    if (!roleOptions.length) {
      setForm((prev) => ({ ...prev, roles: [] }));
      setError("");
      setShowPassword(false);
      return;
    }

    if (editUser) {
      setForm({
        email: editUser.email || "",
        password: "",
        roles: pickRoleOptionNames(editUser, roleOptions),
        guru_nama: editUser.guru?.nama || "",
        guru_nip: editUser.guru?.NIP || "",
        guru_telepon: editUser.guru?.nomor_telepon || "",
        guru_alamat: editUser.guru?.alamat || "",
        guru_tanggal_lahir: editUser.guru?.tanggal_lahir
          ? new Date(editUser.guru.tanggal_lahir).toISOString().split("T")[0]
          : "",
      });
    } else {
      setForm({
        email: "",
        password: "",
        roles: defaultRoleOptions(roleOptions),
        guru_nama: "",
        guru_nip: "",
        guru_telepon: "",
        guru_alamat: "",
        guru_tanggal_lahir: "",
      });
    }
    setError("");
    setShowPassword(false);
  }, [editUser, isOpen, roleOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!form.email.trim()) throw new Error("Email wajib diisi");
      if (!editUser && !form.password) throw new Error("Password wajib diisi");
      if (form.password && form.password.length < 6) throw new Error("Password minimal 6 karakter");
      if (!form.roles.length) throw new Error("Pilih minimal satu role");

      const { role, role_names } = isEditAdmin
        ? { role: "ADMIN", role_names: ["ADMIN"] }
        : deriveRolePayload(form.roles);

      // Guru fields wajib kalau ada GURU atau WALAS (dan bukan admin)
      const upperRoles = form.roles.map((r) => r.trim().toUpperCase());
      const needsGuru = !isEditAdmin && (upperRoles.includes("GURU") || upperRoles.includes("WALAS"));

      if (needsGuru) {
        if (!form.guru_nama.trim()) throw new Error("Nama guru wajib diisi");
        if (!form.guru_nip.trim()) throw new Error("NIP guru wajib diisi");
        if (!form.guru_telepon.trim()) throw new Error("Nomor telepon guru wajib diisi");
        if (!form.guru_alamat.trim()) throw new Error("Alamat guru wajib diisi");
        if (!form.guru_tanggal_lahir) throw new Error("Tanggal lahir guru wajib diisi");
      }

      const payload = {
        email: form.email.trim(),
        password: form.password || undefined,
        role,
        role_names,
      };

      const guruData = needsGuru
        ? {
            nama: form.guru_nama.trim(),
            NIP: form.guru_nip.trim(),
            nomor_telepon: form.guru_telepon.trim(),
            alamat: form.guru_alamat.trim(),
            tanggal_lahir: new Date(form.guru_tanggal_lahir).toISOString(),
          }
        : null;

      await onSubmit(payload, editUser?.id, guruData, editUser?.guru_id);
      onClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const upperRoles = form.roles.map((r) => r.trim().toUpperCase());
  const showGuruFields = !isEditAdmin && (upperRoles.includes("GURU") || upperRoles.includes("WALAS"));
  const rolesLoading = !roleOptions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-auto overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {editUser ? "Edit User" : "Tambah User Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contoh@email.com"
              className={inputClass}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password{" "}
              {editUser && (
                <span className="text-gray-400 font-normal">
                  (kosongkan jika tidak ingin mengubah)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editUser ? "••••••••" : "Minimal 6 karakter"}
                className={`${inputClass} pr-10`}
                {...(!editUser ? { required: true, minLength: 6 } : {})}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role — multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role
              {!isEditAdmin && (
                <span className="text-gray-400 font-normal ml-1">(bisa pilih lebih dari satu)</span>
              )}
            </label>
            <MultiRoleSelect
              value={form.roles}
              onChange={(roles) => setForm({ ...form, roles })}
              options={roleOptions}
              disabled={rolesLoading}
              isEditAdmin={isEditAdmin}
            />
            {isEditAdmin && (
              <p className="mt-2 text-xs text-gray-500">
                User dengan role <span className="font-semibold">Admin</span> tidak bisa diubah
                rolenya.
              </p>
            )}
            {/* Info WALAS */}
            {!isEditAdmin && upperRoles.includes("WALAS") && !upperRoles.includes("GURU") && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                Role <b>WALAS</b> otomatis menyertakan role <b>GURU</b> di backend.
              </p>
            )}
          </div>

          {/* Guru Fields */}
          {showGuruFields && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 pb-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Data Guru
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.guru_nama}
                  onChange={(e) => setForm({ ...form, guru_nama: e.target.value })}
                  placeholder="Nama lengkap guru"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NIP</label>
                <input
                  type="text"
                  value={form.guru_nip}
                  onChange={(e) => setForm({ ...form, guru_nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai"
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={form.guru_telepon}
                    onChange={(e) => setForm({ ...form, guru_telepon: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={form.guru_tanggal_lahir}
                    onChange={(e) => setForm({ ...form, guru_tanggal_lahir: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                <textarea
                  value={form.guru_alamat}
                  onChange={(e) => setForm({ ...form, guru_alamat: e.target.value })}
                  placeholder="Alamat lengkap guru"
                  className={`${inputClass} resize-none`}
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || rolesLoading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editUser ? "Simpan Perubahan" : "Tambah User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}