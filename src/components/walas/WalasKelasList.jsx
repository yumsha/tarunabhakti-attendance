import { useEffect, useMemo, useState } from "react";
import { kelas } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function resolveGuruIdFromLocalStorage() {
  const cached = safeJsonParse(localStorage.getItem("user") || "null");
  return cached?.guru?.id ? Number(cached.guru.id) : null;
}

export default function WalasKelasList() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const guruId = resolveGuruIdFromLocalStorage();
        if (!guruId) {
          setRows([]);
          return;
        }

        const res = await kelas.list("limit=10000");
        if (!res?.success || !Array.isArray(res.data)) {
          throw new Error(res?.message || "Gagal memuat daftar kelas");
        }

        const filtered = res.data.filter(
          (k) =>
            Number(k?.walas?.id ?? k?.walas_id ?? k?.wali_kelas_id) === guruId
        );

        const normalized = filtered.map((k) => ({
          id: k?.id,
          nama: k?.walas?.nama || "—",
          kelas: k?.kelas || "—",
          jurusan: k?.jurusan || "—",
        }));

        setRows(normalized);
      } catch (e) {
        setError(e?.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const hasData = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Informasi Kelas Walas"
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">


          {error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100/80">
                  {["ID Kelas", "Nama", "Kelas", "Jurusan"].map((col) => (
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
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : hasData ? (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-blue-50/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {r.id ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {r.nama}
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
                      <p className="text-gray-500 text-sm">
                        Kamu belum ditugaskan sebagai wali kelas.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

