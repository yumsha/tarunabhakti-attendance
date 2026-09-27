import { useState, useRef, useEffect } from "react";
import { Users, Search, Pencil, Trash2, X, Filter, ChevronDown } from "lucide-react";
import Pagination from "../layout/Pagination.jsx";

const ROLE_DISPLAY = [
  { value: "ADMIN",       label: "Admin",       color: "bg-purple-100 text-purple-700" },
  { value: "GURU",        label: "Guru",         color: "bg-blue-100 text-blue-700" },
  { value: "WALAS",       label: "Walas",        color: "bg-emerald-100 text-emerald-700" },
  { value: "KESISWAAN",   label: "Kesiswaan",    color: "bg-amber-100 text-amber-800" },
  { value: "SUPER ADMIN", label: "Super Admin",  color: "bg-rose-100 text-rose-800" },
  { value: "SUPERADMIN",  label: "Super Admin",  color: "bg-rose-100 text-rose-800" },
  { value: "SUPER_ADMIN", label: "Super Admin",  color: "bg-rose-100 text-rose-800" },
  { value: "SISWA",       label: "Siswa",        color: "bg-teal-100 text-teal-700" },
];

function getRoleDisplay(roleValue) {
  const upper = String(roleValue).toUpperCase();
  return (
    ROLE_DISPLAY.find((r) => r.value === upper) || {
      value: upper,
      label: roleValue,
      color: "bg-gray-100 text-gray-700",
    }
  );
}

function resolveRoles(user) {
  const fromRoles = Array.isArray(user?.roles)
    ? user.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(user?.role_names) ? user.role_names : [];
  const fromRoleObj = user?.role?.name ? [user.role.name] : [];
  const fromRoleStr = typeof user?.role === "string" ? [user.role] : [];

  const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase())
    .map((r) => (r === "WALI KELAS" ? "WALAS" : r));

  return Array.from(new Set(merged));
}

function getRoleBadges(user) {
  const roles = resolveRoles(user);
  if (!roles.length) return <span className="text-gray-400">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((roleName) => {
        const opt = getRoleDisplay(roleName);
        return (
          <span
            key={roleName}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${opt.color}`}
          >
            {opt.label}
          </span>
        );
      })}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Dropdown panel filter role multi-select.
 * Menggunakan position: fixed + getBoundingClientRect agar tidak terpotong
 * oleh parent yang memiliki overflow: hidden / overflow-x: auto.
 */
function RoleFilterPanel({ roleOptions, roleFilters, onToggleRoleFilter, onClearRoleFilters }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  // Tutup dropdown saat scroll / resize supaya posisi tidak meleset
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  // Dedupe berdasarkan label display agar SUPER ADMIN / SUPERADMIN tidak dobel
  const seenLabels = new Set();
  const sourceOptions =
    roleOptions && roleOptions.length > 0
      ? roleOptions.map((o) => ({
          value: (o.name || o.value || "").toUpperCase(),
          label: o.name || o.value,
        }))
      : ROLE_DISPLAY.filter((r) => !["SUPERADMIN", "SUPER_ADMIN"].includes(r.value));

  const deduped = sourceOptions.filter((opt) => {
    const disp = getRoleDisplay(opt.value || opt.label);
    if (seenLabels.has(disp.label)) return false;
    seenLabels.add(disp.label);
    return true;
  });

  const activeCount = roleFilters instanceof Set ? roleFilters.size : 0;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition ${
          activeCount > 0
            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
            : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filter Role</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-xs font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* backdrop transparan untuk menangkap klik di luar */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* dropdown menggunakan fixed agar tidak terpotong overflow parent */}
          <div
            className="fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[210px]"
            style={{ top: dropPos.top, right: dropPos.right }}
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Filter Role
              </span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => { onClearRoleFilters(); setOpen(false); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {deduped.map((opt) => {
                const disp = getRoleDisplay(opt.value || opt.label);
                const key = (opt.value || opt.label).trim().toUpperCase();
                const isActive = roleFilters instanceof Set && roleFilters.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleRoleFilter(opt.value || opt.label)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-left transition ${
                      isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition ${
                        isActive ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      }`}
                    >
                      {isActive && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path
                            d="M1.5 5l2.5 2.5 4.5-4.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${disp.color}`}>
                      {disp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}


export default function UserTable({
  users,
  loading,
  searchQuery,
  onSearchChange,
  roleFilters,
  roleOptions,
  onToggleRoleFilter,
  onClearRoleFilters,
  onEdit,
  onDelete,
  pagination,
  page,
  onPageChange,
}) {
  const foundCount = pagination?.total ?? users.length;
  const activeRoleFilters = roleFilters instanceof Set ? roleFilters : new Set();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* table header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{foundCount}</span>{" "}
            user ditemukan
          </p>
          {/* Active filter pills */}
          {activeRoleFilters.size > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {[...activeRoleFilters].map((roleVal) => {
                const disp = getRoleDisplay(roleVal);
                return (
                  <span
                    key={roleVal}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100"
                  >
                    {disp.label}
                    <button
                      type="button"
                      onClick={() => onToggleRoleFilter(roleVal)}
                      className="p-0.5 rounded-full hover:bg-blue-100 text-blue-700"
                      title={`Hapus filter ${disp.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={onClearRoleFilters}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Hapus semua
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari username, nama, NIP, NISN..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition"
            />
          </div>
          {/* Multi-role filter panel */}
          <RoleFilterPanel
            roleOptions={roleOptions || []}
            roleFilters={activeRoleFilters}
            onToggleRoleFilter={onToggleRoleFilter}
            onClearRoleFilters={onClearRoleFilters}
          />
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {["No", "Nama / Username", "NIP / NISN", "Role", "Dibuat", "Aksi"].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      i === 5 ? "text-center" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              </>
            ) : users.length > 0 ? (
              users.map((user, index) => {
                const isSiswa = user.siswa && (user.siswa.nama || user.siswa.nisn);
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-blue-50/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {(page - 1) * (pagination?.limit || 10) + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.guru?.nama
                            ? user.guru.nama
                            : isSiswa
                            ? `${user.siswa.nama}${user.siswa.nisn ? ` (${user.siswa.nisn})` : ""}`
                            : user.username || "—"}
                        </p>
                        {/* sub baris: username/email */}
                        {(user.guru?.nama || isSiswa) && user.username && (
                          <p className="text-xs text-gray-400">{user.username}</p>
                        )}
                        {user.email && (
                          <p className="text-xs text-gray-400">{user.email}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.guru ? (
                        <p className="text-sm font-medium text-gray-900">{user.guru.NIP}</p>
                      ) : isSiswa ? (
                        <p className="text-sm font-mono text-gray-700">{user.siswa.nisn || "—"}</p>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Non-guru</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getRoleBadges(user)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition active:scale-[0.98] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition active:scale-[0.98] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500 text-sm">
                      {activeRoleFilters.size > 0
                        ? `Tidak ada user dengan role: ${[...activeRoleFilters].map((r) => getRoleDisplay(r).label).join(", ")}`
                        : "Belum ada data user."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
        summary={`Halaman ${page} dari ${pagination.totalPages} (${pagination.total} total)`}
      />
    </div>
  );
}


