import { useState, useEffect, useCallback } from "react";
import { kelas, detailAbsensi } from "../../lib/backendApi";
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

export default function KehadiranTable() {
  const user    = getUserFromStorage();
  const walasId = user?.guru?.id ?? null;

  const [classList, setClassList] = useState([]);
  const [kelasId, setKelasId]     = useState("");
  const [tanggal, setTanggal]     = useState(getTodayWIB());
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [kState, setKState]       = useState({});

  // FIX: load semua kelas yang diampu walas, expose selector jika >1
  useEffect(() => {
    const load = async () => {
      try {
        const res = await kelas.list("limit=200");
        if (!res?.success) return;
        let list = res.data ?? [];
        if (walasId) {
          list = list.filter(
            (c) => c.walas_id === walasId || c.walas?.id === walasId
          );
        }
        setClassList(list);
        // set ke kelas pertama sebagai default
        const firstId = String(list[0]?.id ?? "");
        if (firstId) setKelasId(firstId);
      } catch (e) {
        console.error("Failed to load kelas", e);
      }
    };
    load();
  }, [walasId]);

  const fetchRows = useCallback(async () => {
    if (!kelasId || !tanggal) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ kelas_id: kelasId, tanggal });
      const res = await detailAbsensi.pratinjauWalas(params.toString());
      setRows(res.data?.daftar_siswa ?? []);
      // hapus state yang bukan "loading" agar tidak stale
      setKState((prev) => {
        const next = {};
        for (const [id, s] of Object.entries(prev)) {
          if (s === "loading") next[id] = s;
        }
        return next;
      });
    } catch (e) {
      console.error("Failed to load kehadiran", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kelasId, tanggal]);

  useEffect(() => {
    setKState({});
    fetchRows();
  }, [kelasId, tanggal]);

  const handleKonfirmasi = async (row) => {
    if (!walasId) {
      alert("User tidak punya informasi guru. Pastikan akun terhubung ke data guru.");
      return;
    }
    const sid = row.siswa_id;
    setKState((prev) => ({ ...prev, [sid]: "loading" }));
    try {
      const res = await detailAbsensi.absensiWalas({
        walas_id:     walasId,
        kelas_id:     parseInt(kelasId),
        tanggal,
        data_absensi: [{ siswa_id: sid, status: "HADIR" }],
      });
      if (!res?.success) throw new Error(res?.message || "Gagal konfirmasi");

      setRows((prev) =>
        prev.map((r) =>
          r.siswa_id === sid
            ? { ...r, sudah_diabsen: true, status_saat_ini: "HADIR" }
            : r
        )
      );
      setKState((prev) => ({ ...prev, [sid]: "done" }));
      setTimeout(fetchRows, 800);
    } catch (err) {
      console.error("Konfirmasi error:", err);
      setKState((prev) => ({ ...prev, [sid]: "error" }));
    }
  };

  const handleKonfirmasiSemua = async () => {
    if (!walasId) { alert("User tidak punya informasi guru."); return; }
    const pending = rows.filter(
      (r) => r.tap_in && !r.sudah_diabsen && kState[r.siswa_id] !== "done"
    );
    if (!pending.length) return;

    const loadingPatch = Object.fromEntries(pending.map((r) => [r.siswa_id, "loading"]));
    setKState((prev) => ({ ...prev, ...loadingPatch }));

    try {
      const res = await detailAbsensi.absensiWalas({
        walas_id:     walasId,
        kelas_id:     parseInt(kelasId),
        tanggal,
        data_absensi: pending.map((r) => ({ siswa_id: r.siswa_id, status: "HADIR" })),
      });
      if (!res?.success) throw new Error(res?.message || "Gagal konfirmasi semua");

      const pendingIds = new Set(pending.map((r) => r.siswa_id));
      setRows((prev) =>
        prev.map((r) =>
          pendingIds.has(r.siswa_id)
            ? { ...r, sudah_diabsen: true, status_saat_ini: "HADIR" }
            : r
        )
      );
      const donePatch = Object.fromEntries(pending.map((r) => [r.siswa_id, "done"]));
      setKState((prev) => ({ ...prev, ...donePatch }));
      setTimeout(fetchRows, 800);
    } catch (err) {
      console.error("Konfirmasi semua error:", err);
      const errPatch = Object.fromEntries(pending.map((r) => [r.siswa_id, "error"]));
      setKState((prev) => ({ ...prev, ...errPatch }));
    }
  };

  const selectedKelas = classList.find((c) => String(c.id) === String(kelasId));

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
        right={
          pendingTapIn > 0 ? (
            <button
              onClick={handleKonfirmasiSemua}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Konfirmasi Semua ({pendingTapIn})
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-5">

        <div className="flex flex-wrap items-center gap-3">

          {/* FIX: Selector kelas — tampil jika walas pegang lebih dari 1 kelas */}
          {classList.length > 1 && (
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
              >
                {classList.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    {formatClassName(cls)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tanggal */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
            />
          </div>

          {/* Progress bar */}
          {rows.length > 0 && (
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
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? (
                <span className="text-gray-400">Memuat data…</span>
              ) : (
                <><span className="font-semibold text-gray-800">{rows.length}</span> siswa</>
              )}
            </p>
            {!loading && rows.length > 0 && (
              <p className="text-xs text-gray-400">
                {doneCount} sudah dikonfirmasi
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {["No", "Nama", "NISN", "No Telp", "Waktu Tap In", "Status Tap", "Status Absensi", "Aksi"].map((h) => (
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
                            <StatusAbsensiBadge status={row.status_saat_ini || "HADIR"} />
                          ) : (
                            <StatusAbsensiBadge status={null} />
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Terkonfirmasi
                            </span>
                          ) : isError ? (
                            <button
                              onClick={() => handleKonfirmasi(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Coba Lagi
                            </button>
                          ) : (
                            <button
                              onClick={() => handleKonfirmasi(row)}
                              disabled={isLoading || !canConfirm}
                              title={
                                !row.tap_in
                                  ? "Siswa belum tap in"
                                  : isLoading
                                  ? "Memproses…"
                                  : "Konfirmasi kehadiran"
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              {isLoading ? (
                                <>
                                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                  </svg>
                                  Memproses…
                                </>
                              ) : !row.tap_in ? (
                                <span className="text-gray-400">Belum Tap</span>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Konfirmasi
                                </>
                              )}
                            </button>
                          )}
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
      </div>
    </main>
  );
}