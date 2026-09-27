import { useState, useEffect, useCallback } from "react";
import { kelas, detailAbsensi, absensiSiswa } from "../../lib/backendApi.js";
import PageHeader from "../layout/PageHeader.jsx";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function formatClassName(cls) {
  if (!cls) return "";
  return `${cls.kelas} ${cls.jurusan || ""}`.trim();
}

function StatusTapBadge({ status }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const map = {
    TEPAT_WAKTU: { label: "Tepat Waktu", cls: "bg-emerald-100 text-emerald-700" },
    TERLAMBAT:   { label: "Terlambat",   cls: "bg-amber-100  text-amber-700"   },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

function StatusAbsensiBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">Belum dikonfirmasi</span>;
  const map = {
    HADIR: { label: "Hadir",  cls: "bg-emerald-100 text-emerald-700" },
    IZIN:  { label: "Izin",   cls: "bg-blue-100    text-blue-700"    },
    SAKIT: { label: "Sakit",  cls: "bg-purple-100  text-purple-700"  },
    ALPHA: { label: "Alpha",  cls: "bg-red-100     text-red-700"     },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-3">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse" />
      </td>
    </tr>
  );
}

export default function PokjaKehadiranTable({ kelasId: propKelasId }) {
  const user    = getUserFromStorage();
  const role    = (user?.userRole?.[0]?.role?.name || user?.role?.name || user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "KESISWAAN";

  const [classList, setClassList] = useState([]);
  const [kelasId, setKelasId]     = useState(() => {
    if (propKelasId) return propKelasId;
    const params = new URLSearchParams(window.location.search);
    return params.get("kelasId") || "";
  });
  const [tanggal, setTanggal]     = useState(getTodayWIB());
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [kState, setKState]       = useState({});

  // FIX: kalo tanggalMulai & tanggalAkhir set, override tanggal
  useEffect(() => {
    if (tanggalMulai && tanggalAkhir) {
      setTanggal("");
    }
  }, [tanggalMulai, tanggalAkhir]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await kelas.list("limit=500");
        if (!res?.success) return;
        let list = res.data ?? [];
        if (!isAdmin) {
          list = list.filter(
            (c) => c.walas_id === walasId || c.walas?.id === walasId
          );
        }
        setClassList(list);
        if (!kelasId && !propKelasId) {
          const params = new URLSearchParams(window.location.search);
          if (!params.get("kelasId")) {
             const firstId = String(list[0]?.id ?? "");
             if (firstId) setKelasId(firstId);
          }
        }
      } catch (e) {
        console.error("Failed to load kelas", e);
      }
    };
    load();
  }, [isAdmin]);

  const fetchRows = useCallback(async () => {
    if (!kelasId) return;
    setLoading(true);
    try {
      let data = [];
      if (tanggalMulai && tanggalAkhir) {
        // Range mode
        const params = new URLSearchParams({
          kelas_id: kelasId,
          tanggal_mulai: tanggalMulai,
          tanggal_akhir: tanggalAkhir,
          limit: 1000
        });
        const res = await absensiSiswa.list(params.toString());
        data = (res.data || []).map(a => ({
          siswa_id: a.siswa?.id,
          nama: a.siswa?.nama,
          NISN: a.siswa?.NISN,
          tap_in: a.tap_in,
          status_tapin: a.status_tapin,
          status_saat_ini: a.status_saat_ini || "HADIR", // fallback
          sudah_diabsen: true,
          tanggal: a.tanggal
        }));
      } else {
        // Daily mode
        const params = new URLSearchParams({ kelas_id: kelasId, tanggal });
        const res = await detailAbsensi.pratinjauWalas(params.toString());
        data = res.data?.daftar_siswa ?? [];
      }

      setRows(data);
      setKState({});
    } catch (e) {
      console.error("Failed to load kehadiran", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kelasId, tanggal, tanggalMulai, tanggalAkhir]);

  const selectedKelas = classList.find((c) => String(c.id) === String(kelasId));

  useEffect(() => {
    if (kelasId) fetchRows();
  }, [kelasId]);

  const doneCount = rows.filter(
    (r) => r.sudah_diabsen || kState[r.siswa_id] === "done"
  ).length;

  const pendingTapIn = rows.filter(
    (r) => r.tap_in && !r.sudah_diabsen && kState[r.siswa_id] !== "done"
  ).length;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title={
          selectedKelas
            ? `Kehadiran ${formatClassName(selectedKelas)}`
            : "Daftar Kehadiran"
        }
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-5">

        <div className="flex flex-wrap items-center gap-3">

          {/* Tanggal */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm text-gray-500">Tanggal</div>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
            />
          </div>

          {/* Multiple Tanggal (range) */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm text-gray-500">Atur Range tanggal</div>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
            />
            <span className="text-gray-400">sampai</span>
            <input
              type="date"
              value={tanggalAkhir}
              onChange={(e) => setTanggalAkhir(e.target.value)}
              className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
            />
            <button
                onClick={() => fetchRows()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 ml-5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-blue-100 font-medium text-[11px]"
            >
                Muat Data
            </button>
          </div>

          {/* Export */}
          <div className="flex items-center gap-2 ml-auto px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                  onClick={() => handleDownloadPdf(cls)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100 font-medium text-[11px]"
                    >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                      Unduh PDF
              </button>
              <button
                onClick={() => handleDownloadExcel(cls)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-green-100 font-medium text-[11px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejfoin="round" strokeWidth="2"
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                  Unduh Excel
              </button>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? (
                <span className="text-gray-400">Memuat data…</span>
              ) : (
                <span className="font-medium text-gray-800">Berhasil memuat {rows.length} data siswa</span>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No</th>
                  {tanggalMulai && tanggalAkhir && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                  )}
                  {["Nama", "NISN", "No Telp", "Waktu Tap In", "Status Tap", "Status Absensi", "Tanggal"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm text-gray-400">Tidak ada data untuk filter ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isDone     = row.sudah_diabsen || kState[row.siswa_id] === "done";
                    const isLoading  = kState[row.siswa_id] === "loading";
                    const isError    = kState[row.siswa_id] === "error";
                    const canConfirm = !!row.tap_in && !isDone;

                    return (
                      <tr
                        key={row.siswa_id}
                        className={`transition-colors duration-150 ${
                          isDone
                            ? "bg-emerald-50/40"
                            : isError
                            ? "bg-red-50/30"
                            : "hover:bg-blue-50/20"
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-400 font-medium">{idx + 1}</td>

                        {tanggalMulai && tanggalAkhir && (
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {row.tanggal ? new Date(row.tanggal).toLocaleDateString("id-ID") : "—"}
                          </td>
                        )}

                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900">{row.nama || "—"}</p>
                          {!row.punya_rfid && (
                            <span className="text-xs text-orange-400">Tanpa RFID</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                          {row.NISN || "—"}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {row.nomor_telepon || "—"}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-700">
                          {row.tap_in ? (
                            <span className="font-medium">{row.tap_in}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusTapBadge status={row.status_tapin} />
                        </td>

                        <td className="px-4 py-4">
                          {isDone ? (
                            <StatusAbsensiBadge status={row.status_saat_ini || row.status_rekomendasi} />
                          ) : (
                            <StatusAbsensiBadge status={row.status_rekomendasi} />
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {tanggal}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 text-center">
              {rows.length} siswa • {doneCount} dikonfirmasi • {rows.length - doneCount} menunggu
            </div>
          )}

        </div>
        {/* Progress bar */}
          {/* {rows.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / rows.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {doneCount}/{rows.length} dikonfirmasi
              </span>
            </div>
          )} */}
      </div>  
    </main>
  );
}