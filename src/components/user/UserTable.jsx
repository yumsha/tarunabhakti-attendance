import { Users, Plus, Search, Pencil, Trash2, X } from "lucide-react";
import Pagination from "../layout/Pagination.jsx";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin", color: "bg-purple-100 text-purple-700" },
  { value: "GURU", label: "Guru", color: "bg-blue-100 text-blue-700" },
  { value: "WALAS", label: "Walas", color: "bg-emerald-100 text-emerald-700" },
  { value: "KESISWAAN", label: "Kesiswaan", color: "bg-amber-100 text-amber-800" },
  { value: "SUPER ADMIN", label: "Super Admin", color: "bg-rose-100 text-rose-800" },
  { value: "SUPERADMIN", label: "Super Admin", color: "bg-rose-100 text-rose-800" },
  { value: "SUPER_ADMIN", label: "Super Admin", color: "bg-rose-100 text-rose-800" },
];

function resolveRoles(user) {
  const fromRoles = Array.isArray(user?.roles)
    ? user.roles
        .map((r) => (typeof r === "string" ? r : r?.name))
        .filter(Boolean)
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
        const upper = roleName?.toUpperCase();
        const opt =
          ROLE_OPTIONS.find((r) => r.value === upper) || {
            label: roleName,
            color: "bg-gray-100 text-gray-700",
          };
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

export default function UserTable({
  users,
  loading,
  searchQuery,
  onSearchChange,
  roleFilterLabel,
  onClearRoleFilter,
  onAdd,
  onEdit,
  onDelete,
  pagination,
  page,
  onPageChange,
}) {
  const normalizedQuery = (searchQuery || "").trim();
  const foundCount = pagination?.total ?? users.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* table header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{foundCount}</span>{" "}
            user ditemukan
          </p>
          {roleFilterLabel ? (
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100">
              Role: {roleFilterLabel}
              <button
                type="button"
                onClick={onClearRoleFilter}
                className="p-0.5 rounded-full hover:bg-blue-100 text-blue-700"
                title="Hapus filter role"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari username atau nama..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 transition"
            />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {["No", "Username", "NIP", "Role", "Dibuat", "Aksi"].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      i === 6 ? "text-center" : "text-left"
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
                    <td colSpan="7" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              </>
            ) : users.length > 0 ? (
              users.map((user, index) => (
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
                        {user.guru?.nama || user.username || "—"}
                      </p>
                      {user.email && (
                        <p className="text-xs text-gray-400">{user.email}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.guru ? (
                      <p className="text-sm font-medium text-gray-900">{user.guru.NIP}</p>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Non-guru</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{getRoleBadges(user)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(user)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500 text-sm">
                      Belum ada data user.
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
