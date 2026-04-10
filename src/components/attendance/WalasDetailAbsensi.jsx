import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Save, Loader2, AlertCircle } from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import { kelas, detailAbsensi } from "../../lib/backendApi";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const STATUS_OPTIONS = [
  { value: "HADIR", label: "Hadir" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
  { value: "ALPHA", label: "Alpha" },
];

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function normalizeStatus(s) {
  const v = String(s || "").toUpperCase();
  return STATUS_OPTIONS.some((o) => o.value === v) ? v : "ALPHA";
}

// Tentukan status awal: 
// - Sudah diabsen sebelumnya → pakai status yang ada
// - Sudah tap in → HADIR
// - Belum tap in → ALPHA (walas bisa ubah manual)
function resolveDefaultStatus(siswa) {
  if (siswa.status_saat_ini) return normalizeStatus(siswa.status_saat_ini);
  if (siswa.tap_in) return "HADIR";
  return "ALPHA";
}

export default function WalasDetailAbsensi() {
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [kelasList, setKelasList] = useState([]);
  const [kelasId, setKelasId] = useState("");
  const [tanggal, setTanggal] = useState(getToday());

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);

  const walasId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.guru?.id ? Number(u.guru.id) : null;
    } catch {
      return null;
    }
  }, []);

  // Fetch kelas milik walas
  useEffect(() => {
    const fetchKelas = async () => {
      setLoadingKelas(true);
      setError("");
      try {
        const res = await kelas.list("limit=100");
        if (!res?.success || !Array.isArray(res.data)) {
          throw new Error(res?.message || "Gagal memuat kelas");
        }

        let list = res.data;
        if (walasId) {
          list = list.filter(
            (c) =>
              c.walas_id === walasId ||
              c.wali_kelas_id === walasId ||
              c.walas?.id === walasId
          );
        }

        setKelasList(list);
        if (!kelasId && list.length > 0) setKelasId(String(list[0].id));
      } catch (e) {
        setError(e?.message || "Gagal memuat kelas");
      } finally {
        setLoadingKelas(false);
      }
    };
    fetchKelas();
  }, [walasId]);

  const selectedKelasName = useMemo(() => {
    const found = kelasList.find((k) => String(k.id) === String(kelasId));
    if (!found) return "";
    const jur = found.jurusan?.nama_jurusan || "";
    return `${found.kelas || ""} ${jur}`.trim();
  }, [kelasList, kelasId]);

  const fetchDetail = async () => {
    if (!kelasId || !tanggal) return;
    setLoadingData(true);
    setError("");
    setSuccess("");
    try {
      const params = new URLSearchParams({ kelas_id: String(kelasId), tanggal });
      const res = await detailAbsensi.pratinjauWalas(params.toString());
      if (!res?.success) throw new Error(res?.message || "Gagal memuat detail absensi");

      const payload = res.data;
      setData(payload);

      const daftar = Array.isArray(payload?.daftar_siswa) ? payload.daftar_siswa : [];
      setRows(
        daftar.map((s) => {
          const defaultStatus = resolveDefaultStatus(s);
          return {
            siswa_id: s.siswa_id,
            nama: s.nama,
            tap_in: s.tap_in,
            tap_out: s.tap_out,
            status_tapin: s.status_tapin,
            punya_rfid: !!s.punya_rfid,
            sudah_tap: !!s.tap_in,
            sudah_diabsen: !!s.sudah_diabsen,
            detail_id: s.detail_id,
            // status awal dari DB (null jika belum pernah diabsen walas)
            status_awal: defaultStatus,
            status: defaultStatus,
            keterangan: s.keterangan || "",
            dirty: false,
          };
        })
      );
    } catch (e) {
      setError(e?.message || "Gagal memuat detail absensi");
      setData(null);
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [kelasId, tanggal]);

  const summary = data?.summary || null;
  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows]);

  // Hitung siswa belum tap tapi diberi Hadir oleh walas
  const manualHadirCount = useMemo(
    () => rows.filter((r) => !r.sudah_tap && r.status === "HADIR").length,
    [rows]
  );

  const handleChangeRow = (siswa_id, patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.siswa_id !== siswa_id) return r;
        const next = { ...r, ...patch };
        next.dirty =
          next.status !== next.status_awal ||
          String(next.keterangan || "") !== String(r.keterangan || "");
        return next;
      })
    );
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!walasId) { setError("Walas ID tidak ditemukan (user.guru.id)"); return; }
    if (!kelasId) { setError("Kelas belum dipilih"); return; }
    if (!tanggal) { setError("Tanggal belum dipilih"); return; }

    const payloadRows = rows.map((r) => ({
      siswa_id: r.siswa_id,
      status: normalizeStatus(r.status),
      keterangan: r.keterangan?.trim() ? r.keterangan.trim() : null,
    }));

    setSaving(true);
    try {
      const res = await detailAbsensi.absensiWalas({
        walas_id: walasId,
        kelas_id: Number(kelasId),
        tanggal,
        data_absensi: payloadRows,
      });
      if (!res?.success) throw new Error(res?.message || "Gagal menyimpan absensi");
      setSuccess(`Absensi berhasil disimpan${manualHadirCount > 0 ? ` (${manualHadirCount} siswa dihadirkan manual oleh walas)` : ""}`);
      await fetchDetail();
    } catch (e) {
      setError(e?.message || "Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  // Badge status tap in
  const getTapBadge = (row) => {
    if (row.sudah_tap) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          {row.status_tapin === "TELAMBAT" ? "Terlambat" : "Tepat Waktu"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        —
      </span>
    );
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader title="Detail Absensi" />

      <div className="flex-1 overflow-auto p-8 space-y-6">

        {/* Alert banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm">
            {success}
          </div>
        )}

        {/* Info banner: ada siswa belum tap yang diberi Hadir */}
        {manualHadirCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              <strong>{manualHadirCount} siswa</strong> belum tap in tetapi akan dicatat{" "}
              <strong>Hadir</strong> oleh walas. Pastikan sudah sesuai sebelum menyimpan.
            </span>
          </div>
        )}

        {/* Summary cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Kelas</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{selectedKelasName || "—"}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Siswa</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{summary?.total ?? rows.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Sudah Tap</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">{summary?.sudah_tap ?? "—"}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Belum Tap</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{summary?.belum_tap ?? "—"}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Tanpa RFID</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{summary?.tanpa_rfid ?? "—"}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Detail Absensi Harian</p>
              <p className="text-sm text-gray-500 ml-2">
                {rows.length} siswa
                {dirtyCount > 0 ? ` • ${dirtyCount} perubahan` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div>
                <input
                  type="date"
                  className={`${inputClass} w-44`}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>
              
              <div>
                <button
                  onClick={handleSave}
                  disabled={saving || loadingData || !kelasId || rows.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
                </button>                
              </div>
            </div>
          </div>

          {/* Table body */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {["No", "Nama", "Tap In", "Tap Out", "RFID", "Status Tap", "Status Absensi", "Keterangan"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingData ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length > 0 ? (
                  rows.map((r, idx) => {
                    // Highlight baris: belum tap tapi status Hadir → kuning
                    const isManualHadir = !r.sudah_tap && r.status === "HADIR";
                    const rowClass = isManualHadir
                      ? "bg-amber-50/60"
                      : r.dirty
                      ? "bg-blue-50/30"
                      : "hover:bg-gray-50/60";

                    return (
                      <tr key={r.siswa_id} className={`transition-colors ${rowClass}`}>
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium ">{idx + 1}</td>

                        {/* Nama */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{r.nama}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {/* Tag belum tap */}
                            {!r.sudah_tap && (
                              <span className="text-xs text-gray-400">Belum tap</span>
                            )}
                            {!r.punya_rfid && (
                              <span className="text-xs text-orange-400">• Tanpa RFID</span>
                            )}
                            {/* Tag manual hadir (peringatan) */}
                            {isManualHadir && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Manual walas
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">{r.tap_in || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.tap_out || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{r.punya_rfid ? "Ada" : "Tidak"}</td>
                        <td className="px-6 py-4">{getTapBadge(r)}</td>

                        {/* Status Absensi dropdown */}
                        <td className="px-6 py-4">
                          <select
                            className={`${inputClass} w-36 ${
                              isManualHadir
                                ? "border-amber-300 bg-amber-50 text-amber-800 font-medium"
                                : ""
                            }`}
                            value={r.status}
                            onChange={(e) =>
                              handleChangeRow(r.siswa_id, { status: e.target.value })
                            }
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Keterangan */}
                        <td className="px-6 py-4">
                          <input
                            className={`${inputClass} w-56 ${
                              isManualHadir && !r.keterangan
                                ? "border-amber-300 placeholder:text-amber-400"
                                : ""
                            }`}
                            value={r.keterangan}
                            onChange={(e) =>
                              handleChangeRow(r.siswa_id, { keterangan: e.target.value })
                            }
                            placeholder={isManualHadir ? "Alasan hadir manual..." : "Opsional"}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ClipboardList className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-500 text-sm">Belum ada data.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}