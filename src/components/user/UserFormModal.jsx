// UserFormModal.jsx
import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";

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

/** Samakan pilihan dropdown dengan nama role di DB (huruf besar/kecil mengikuti opsi API). */
function pickRoleOptionName(editUser, roleOptions) {
  const userRoles = resolveRoles(editUser);
  const names = roleOptions.map((o) => o.name);
  for (const ur of userRoles) {
    const hit = names.find((n) => n.trim().toUpperCase() === ur.trim().toUpperCase());
    if (hit) return hit;
  }
  const walas = names.find((n) => n.trim().toUpperCase() === "WALAS");
  if (walas && userRoles.includes("WALAS")) return walas;
  const guru = names.find((n) => n.trim().toUpperCase() === "GURU");
  if (guru && userRoles.includes("GURU")) return guru;
  const fallback = names[0] ?? "";
  return fallback || defaultRoleOption(roleOptions);
}

function defaultRoleOption(roleOptions) {
  const admin = roleOptions.find((r) => r.name.trim().toUpperCase() === "ADMIN");
  return admin?.name ?? roleOptions[0]?.name ?? "";
}

/** Susun payload `role` + `role_names` untuk API (combo GURU+WALAS tetap seperti sebelumnya). */
function deriveRolePayload(selectedExactName) {
  const raw = selectedExactName.trim();
  const upper = raw.toUpperCase();

  let role_names;
  if (upper === "ADMIN") role_names = ["ADMIN"];
  else if (upper === "WALAS") role_names = ["GURU", "WALAS"];
  else if (upper === "GURU") role_names = ["GURU"];
  else role_names = [raw];

  let role = raw;
  if (upper === "WALAS") role = "WALAS";
  else if (upper === "GURU") role = "GURU";
  else if (upper === "ADMIN") role = "ADMIN";

  return { role, role_names };
}

// Komponen Custom Select
function CustomRoleSelect({ value, onChange, options, disabled, isEditAdmin }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.name === value);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => !disabled && !isEditAdmin && setIsOpen(!isOpen)}
        disabled={disabled || isEditAdmin}
        className={`${inputClass} text-left flex items-center justify-between ${
          (disabled || isEditAdmin) ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span className={!selectedOption && options.length > 0 ? "text-gray-400" : "text-gray-900"}>
          {selectedOption?.name || (options.length === 0 ? "Memuat daftar role…" : "Pilih role")}
        </span>
        {!(disabled || isEditAdmin) && (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && !disabled && !isEditAdmin && options.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={`${opt.id ?? "x"}-${opt.name}`}
                type="button"
                onClick={() => {
                  onChange(opt.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                  value === opt.name ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserFormModal({ isOpen, onClose, onSubmit, editUser, roleOptions = [] }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
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
      setForm((prev) => ({ ...prev, role: "" }));
      setError("");
      setShowPassword(false);
      return;
    }

    if (editUser) {
      setForm({
        email: editUser.email || "",
        password: "",
        role: pickRoleOptionName(editUser, roleOptions),
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
        role: defaultRoleOption(roleOptions),
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
      if (!form.role) throw new Error("Pilih role");

      const { role, role_names } = isEditAdmin ? { role: "ADMIN", role_names: ["ADMIN"] } : deriveRolePayload(form.role);

      const upperSel = form.role.trim().toUpperCase();
      const needsGuru = !isEditAdmin && (upperSel === "GURU" || upperSel === "WALAS");

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

  const upperSel = form.role.trim().toUpperCase();
  const showGuruFields = !isEditAdmin && (upperSel === "GURU" || upperSel === "WALAS");
  const rolesLoading = !roleOptions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-auto overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{editUser ? "Edit User" : "Tambah User Baru"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password{" "}
              {editUser && <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin mengubah)</span>}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <CustomRoleSelect
              value={form.role}
              onChange={(value) => setForm({ ...form, role: value })}
              options={roleOptions}
              disabled={rolesLoading}
              isEditAdmin={isEditAdmin}
            />
            {isEditAdmin && (
              <p className="mt-2 text-xs text-gray-500">
                User dengan role <span className="font-semibold">Admin</span> tidak bisa diubah rolenya.
              </p>
            )}
          </div>

          {showGuruFields && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 pb-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Guru</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Telepon</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir</label>
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