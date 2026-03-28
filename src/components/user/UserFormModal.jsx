import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "GURU", label: "Guru" },
];

const inputClass =
  "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

export default function UserFormModal({ isOpen, onClose, onSubmit, editUser }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "ADMIN",
    guru_nama: "",
    guru_nip: "",
    guru_telepon: "",
    guru_alamat: "",
    guru_tanggal_lahir: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editUser) {
      const roleName =
        typeof editUser.role === "object" ? editUser.role?.name : editUser.role;
      setForm({
        email: editUser.email || "",
        password: "",
        role: roleName?.toUpperCase() || "ADMIN",
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
        role: "ADMIN",
        guru_nama: "",
        guru_nip: "",
        guru_telepon: "",
        guru_alamat: "",
        guru_tanggal_lahir: "",
      });
    }
    setError("");
    setShowPassword(false);
  }, [editUser, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!form.email.trim()) throw new Error("Email wajib diisi");
      if (!editUser && !form.password) throw new Error("Password wajib diisi");
      if (form.password && form.password.length < 6)
        throw new Error("Password minimal 6 karakter");

      if (form.role === "GURU") {
        if (!form.guru_nama.trim()) throw new Error("Nama guru wajib diisi");
        if (!form.guru_nip.trim()) throw new Error("NIP guru wajib diisi");
        if (!form.guru_telepon.trim())
          throw new Error("Nomor telepon guru wajib diisi");
        if (!form.guru_alamat.trim()) throw new Error("Alamat guru wajib diisi");
        if (!form.guru_tanggal_lahir)
          throw new Error("Tanggal lahir guru wajib diisi");
      }

      const payload = {
        email: form.email.trim(),
        password: form.password || undefined,
        role: form.role,
      };

      const guruData =
        form.role === "GURU"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {editUser ? "Edit User" : "Tambah User Baru"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contoh@email.com"
              className={inputClass}
              required
            />
          </div>

          {/* password */}
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                    form.role === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* field guru */}
          {form.role === "GURU" && (
            <div className="space-y-4 pt-2">
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
                  onChange={(e) =>
                    setForm({ ...form, guru_nama: e.target.value })
                  }
                  placeholder="Nama lengkap guru"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  NIP
                </label>
                <input
                  type="text"
                  value={form.guru_nip}
                  onChange={(e) =>
                    setForm({ ...form, guru_nip: e.target.value })
                  }
                  placeholder="Nomor Induk Pegawai"
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={form.guru_telepon}
                    onChange={(e) =>
                      setForm({ ...form, guru_telepon: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, guru_tanggal_lahir: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Alamat
                </label>
                <textarea
                  value={form.guru_alamat}
                  onChange={(e) =>
                    setForm({ ...form, guru_alamat: e.target.value })
                  }
                  placeholder="Alamat lengkap guru"
                  className={`${inputClass} resize-none`}
                  rows={2}
                  required
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editUser ? "Simpan Perubahan" : "Tambah User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
