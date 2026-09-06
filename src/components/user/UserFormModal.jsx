import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Loader2, ChevronDown, Check } from "lucide-react";

const inputClass =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

//Helpers

/** Kumpulkan semua role string dari berbagai shape data user */
function resolveRoles(userData) {
    const fromRoles = Array.isArray(userData?.roles)
        ? userData.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
        : [];
    const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
    const fromRoleObj   = userData?.role?.name ? [userData.role.name] : [];
    const fromRoleStr   = typeof userData?.role === "string" ? [userData.role] : [];

    const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
        .filter(Boolean)
        .map((r) => String(r).toUpperCase())
        .map((r) => (r === "WALI KELAS" ? "WALAS" : r));

    return Array.from(new Set(merged));
}

/** Apakah user ini punya role SUPER_ADMIN? */
function hasSuperAdmin(userData) {
    return resolveRoles(userData).some((r) => r === "SUPER_ADMIN" || r === "SUPERADMIN");
}

/** Cocokkan role user ke nama di roleOptions */
function pickRoleOptionNames(editUser, roleOptions) {
    const userRoles = resolveRoles(editUser);
    const names     = roleOptions.map((o) => o.name);
    const matched   = [];

    for (const ur of userRoles) {
        const hit = names.find((n) => n.trim().toUpperCase() === ur.trim().toUpperCase());
        if (hit && !matched.includes(hit)) matched.push(hit);
    }

    if (!matched.length && names.length) matched.push(names[0]);
    return matched;
}

/** Default role saat buat user baru */
function defaultRoleOptions(roleOptions) {
    const guru = roleOptions.find((r) => r.name.trim().toUpperCase() === "GURU");
    return guru ? [guru.name] : roleOptions.length ? [roleOptions[0].name] : [];
}

/**
 * Bangun payload { role, role_names } dari pilihan user.
 * - SUPER_ADMIN  = solo, tidak bisa dikombinasi kalo ga timpa role laen.
 * - ADMIN        = bisa dikombinasi dengan role lain
 * - WALAS/KESISWAAN = otomatis sertain GURU
 */
function deriveRolePayload(selectedNames) {
    const uppers = selectedNames.map((n) => n.trim().toUpperCase());

    // SUPER_ADMIN override semua
    if (uppers.includes("SUPER_ADMIN") || uppers.includes("SUPERADMIN")) {
        return { role: "SUPER_ADMIN", role_names: ["SUPER_ADMIN"] };
    }

    const role_names_set = new Set(selectedNames.map((n) => n.trim()));

    // WALAS / KESISWAAN harus disertai GURU di backend
    if (uppers.includes("WALAS") || uppers.includes("KESISWAAN")) {
        const guruOption = selectedNames.find((n) => n.trim().toUpperCase() === "GURU") ?? "GURU";
        role_names_set.add(guruOption);
    }

    const role_names = Array.from(role_names_set);
    const role       = role_names[0] ?? selectedNames[0];

    return { role, role_names };
}

// Multi-select Role Dropdown
function MultiRoleSelect({ value = [], onChange, options, disabled, locked }) {
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
        if (locked) return;

        const uppers      = value.map((v) => v.trim().toUpperCase());
        const targetUpper = name.trim().toUpperCase();
        const isSuperAdmin =
            targetUpper === "SUPER_ADMIN" || targetUpper === "SUPERADMIN";

        if (uppers.includes(targetUpper)) {
            // Jangan hapus kalau hanya satu tersisa
            if (value.length === 1) return;
            onChange(value.filter((v) => v.trim().toUpperCase() !== targetUpper));
        } else {
            if (isSuperAdmin) {
                // SUPER_ADMIN cuma bisa 1 role, timpa semua role kalo ada
                onChange([name]);
            } else {
                // Kalau ada SUPER_ADMIN sebelumnya ganti dengan yang baru
                const withoutSuper = value.filter(
                    (v) =>
                        v.trim().toUpperCase() !== "SUPER_ADMIN" &&
                        v.trim().toUpperCase() !== "SUPERADMIN"
                );
                // ADMIN boleh dikombinasi, jadi tambahkan saja
                onChange([...withoutSuper, name]);
            }
        }
    };

    const isLocked = disabled || locked;

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
                <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {value.length === 0 ? (
                        <span className="text-gray-400">
                            {options.length === 0 ? "Memuat daftar role…" : "Pilih role"}
                        </span>
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
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {options.map((opt) => {
                            const optUpper     = opt.name.trim().toUpperCase();
                            const isSelected   = value.some(
                                (v) => v.trim().toUpperCase() === optUpper
                            );
                            const isSuperOpt   = optUpper === "SUPER_ADMIN" || optUpper === "SUPERADMIN";
                            const hasSuperSel  = value.some(
                                (v) =>
                                    v.trim().toUpperCase() === "SUPER_ADMIN" ||
                                    v.trim().toUpperCase() === "SUPERADMIN"
                            );

                            // Disable pilihan lain jika SUPER_ADMIN sudah terpilih
                            const isDisabledOpt = hasSuperSel && !isSuperOpt;

                            return (
                                <button
                                    key={`${opt.id ?? "x"}-${opt.name}`}
                                    type="button"
                                    onClick={() => !isDisabledOpt && toggleOption(opt.name)}
                                    disabled={isDisabledOpt}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                                        ${isDisabledOpt ? "opacity-35 cursor-not-allowed bg-white" : "hover:bg-gray-50"}
                                        ${isSelected ? "bg-blue-50" : ""}
                                    `}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className={isSelected ? "text-blue-700 font-medium" : "text-gray-700"}>
                                            {opt.name}
                                        </span>
                                        {/* Hint untuk SUPER_ADMIN */}
                                        {isSuperOpt && (
                                            <span className="text-[10px] text-gray-400">
                                                Tidak bisa dikombinasi dengan role lain
                                            </span>
                                        )}
                                        {/* Hint untuk ADMIN */}
                                        {optUpper === "ADMIN" && (
                                            <span className="text-[10px] text-gray-400">
                                                Bisa dikombinasi dengan role lain
                                            </span>
                                        )}
                                    </div>
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
export default function UserFormModal({
    isOpen,
    onClose,
    onSubmit,
    editUser,
    roleOptions = [],
}) {
    const [form, setForm]           = useState({ username: "", roles: [], guru_id: null });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]         = useState("");

    // User SUPER_ADMIN = semua field terkunci
    const isLockedSuperAdmin = !!editUser && hasSuperAdmin(editUser);

    const rolesLoading = !roleOptions.length;

    useEffect(() => {
        if (!isOpen) return;

        if (!roleOptions.length) {
            setForm((prev) => ({ ...prev, roles: [] }));
            setError("");
            return;
        }

        if (editUser) {
            setForm({
                username: editUser.username || "",
                roles:    pickRoleOptionNames(editUser, roleOptions),
                guru_id:  editUser.guru_id ?? editUser.guru?.id ?? null,
            });
        } else {
            setForm({
                username: "",
                roles:    defaultRoleOptions(roleOptions),
                guru_id:  null,
            });
        }
        setError("");
    }, [editUser, isOpen, roleOptions]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            if (!editUser)          throw new Error("Fitur tambah user telah dinonaktifkan");
            if (!form.roles.length) throw new Error("Pilih minimal satu role");
            if (isLockedSuperAdmin) throw new Error("Role Super Admin tidak dapat diubah");

            const { role, role_names } = deriveRolePayload(form.roles);

            const payload = {
                username:   form.username.trim(),
                role,
                role_names,
                guru_id:    form.guru_id ?? null,
            };

            await onSubmit(payload, editUser?.id);
            onClose();
        } catch (err) {
            setError(err.message || "Terjadi kesalahan");
        } finally {
            setSubmitting(false);
        }
    };

    const upperRoles  = form.roles.map((r) => r.trim().toUpperCase());
    const hasWalas    = upperRoles.includes("WALAS");
    const hasKesiswaan= upperRoles.includes("KESISWAAN");
    const hasGuru     = upperRoles.includes("GURU");
    const needsGuru   = (hasWalas || hasKesiswaan) && !hasGuru;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Role User</h2>
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

                    {/* Info user */}
                    <div className="flex items-center gap-4 p-4 border border-blue-100 rounded-xl bg-blue-50/30">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {editUser?.guru?.nama || editUser?.email || "Nama tidak tersedia"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Username / NIP:{" "}
                                <span className="font-medium text-gray-700">
                                    {editUser?.username} / {editUser?.guru?.NIP ?? "-"}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Banner locked jika SUPER_ADMIN */}
                    {isLockedSuperAdmin && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                User dengan role <span className="font-semibold">Super Admin</span> tidak
                                dapat diubah rolenya. Hubungi developer jika perlu perubahan.
                            </span>
                        </div>
                    )}

                    {/* Role selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Role
                            {!isLockedSuperAdmin && (
                                <span className="text-gray-400 font-normal ml-1">
                                    (bisa pilih lebih dari satu)
                                </span>
                            )}
                        </label>

                        <MultiRoleSelect
                            value={form.roles}
                            onChange={(roles) => setForm({ ...form, roles })}
                            options={roleOptions}
                            disabled={rolesLoading}
                            locked={isLockedSuperAdmin}
                        />

                        {/* Info kontegs */}
                        {!isLockedSuperAdmin && needsGuru && (
                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                Role <b>{hasWalas ? "WALAS" : "KESISWAAN"}</b> otomatis menyertakan
                                role <b>GURU</b> di backend.
                            </p>
                        )}

                        {!isLockedSuperAdmin && upperRoles.includes("ADMIN") && (
                            <p className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                Role <b>ADMIN</b> dapat dikombinasi dengan role lain.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Batal
                            </button>
                            {editUser && (
                                <button
                                    type="submit"
                                    disabled={submitting || rolesLoading || isLockedSuperAdmin}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Simpan Perubahan
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}