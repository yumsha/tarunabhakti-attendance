import { Users, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin", color: "bg-purple-100 text-purple-700" },
  { value: "GURU", label: "Guru", color: "bg-blue-100 text-blue-700" },
];

function getRoleBadge(role) {
  if (!role) return <span className="text-gray-400">—</span>;
  const roleName = typeof role === "object" ? role.name : role;
  const opt = ROLE_OPTIONS.find(
    (r) => r.value === roleName?.toUpperCase()
  ) || { label: roleName, color: "bg-gray-100 text-gray-700" };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${opt.color}`}
    >
      {opt.label}
    </span>
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
  onAdd,
  onEdit,
  onDelete,
  pagination,
  page,
  onPageChange,
}) {
  const normalizedQuery = (searchQuery || "").trim();
  const foundCount = normalizedQuery
    ? users.length
    : pagination?.total ?? users.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* table header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{foundCount}</span>{" "}
            user ditemukan
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari email atau nama..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 transition"
            />
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {["No", "Email", "Role", "Guru", "No Telepon", "Dibuat", "Aksi"].map(
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
                    <p className="text-sm font-medium text-gray-900">
                      {user.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.guru ? (
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.guru.nama}
                        </p>
                        <p className="text-xs text-gray-400">
                          NIP: {user.guru.NIP}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.guru?.nomor_telepon || "—"}
                  </td>
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
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Halaman {page} dari {pagination.totalPages} ({pagination.total}{" "}
            total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                onPageChange((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
