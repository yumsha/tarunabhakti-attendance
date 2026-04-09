import { useEffect, useMemo, useState } from "react";
import { kelas, users } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

function resolveRoles(userData) {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles
        .map((r) => (typeof r === "string" ? r : r?.name))
        .filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];
  const fromUserRole = Array.isArray(userData?.userRole)
    ? userData.userRole.map((ur) => ur?.role?.name ?? ur?.role).filter(Boolean)
    : [];

  const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr, ...fromUserRole]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase())
    .map((r) => (r === "WALI KELAS" ? "WALAS" : r));

  return Array.from(new Set(merged));
}

export default function AdminKelasList() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const limit = 10;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [kelasRes, usersRes] = await Promise.all([
          kelas.list("limit=10000"),
          users.list("page=1&limit=10000"),
        ]);

        if (!kelasRes?.success || !Array.isArray(kelasRes.data)) {
          throw new Error(kelasRes?.message || "Gagal memuat daftar kelas");
        }

        const walasGuruIdSet = new Set(
          (usersRes?.success && Array.isArray(usersRes.data) ? usersRes.data : [])
            .filter((u) => resolveRoles(u).includes("WALAS"))
            .map((u) => Number(u?.guru?.id ?? u?.guru_id))
            .filter(Boolean)
        );

        const normalized = kelasRes.data.map((k) => {
          const walasId = Number(k?.walas?.id ?? k?.walas_id);
          const hasWalasRole = !!walasId && walasGuruIdSet.has(walasId);
          const walasName = hasWalasRole ? k?.walas?.nama : null;

          return {
          id: k?.id,
          nama_walas: walasName || "-",
          kelas: k?.kelas || "-",
          jurusan: k?.jurusan?.nama_jurusan || "-",
          };
        });

        setRows(normalized);
        setPage(1);
      } catch (e) {
        setError(e?.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const hasData = useMemo(() => rows.length > 0, [rows.length]);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, page]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Daftar Kelas"
        subtitle="Kelola informasi kelas & wali kelas"
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? (
                <span>Memuat…</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-700">
                    {rows.length}
                  </span>{" "}
                  kelas ditemukan
                </>
              )}
            </p>
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {["ID Kelas", "Nama Walas", "Kelas", "Jurusan"].map((col) => (
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
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : hasData ? (
                  pagedRows.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-blue-50/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {r.id ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {r.nama_walas}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.kelas}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.jurusan}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">Belum ada data kelas.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

