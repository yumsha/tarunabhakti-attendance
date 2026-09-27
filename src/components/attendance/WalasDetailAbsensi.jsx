import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Save,
  Loader2,
  AlertCircle,
  School,
  Users,
  ScanLine,
  UserX,
  IdCard,
} from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import InfoStatCard from "../layout/InfoStatCard";
import Pagination from "../layout/Pagination.jsx";
import { kelas, detailAbsensi } from "../../lib/backendApi";

const inputClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const STATUS_OPTIONS = [
  { value: "HADIR", label: "Hadir" },
  { value: "IZIN", label: "Izin" },
  { value: "SAKIT", label: "Sakit" },
  { value: "ALPHA", label: "Alpha" },
];

// Palet warna badge read-only per status
const STATUS_BADGE_STYLE = {
  HADIR: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  IZIN:  "bg-blue-100   text-blue-700   border border-blue-200",
  SAKIT: "bg-amber-100  text-amber-700  border border-amber-200",
  ALPHA: "bg-red-100    text-red-700    border border-red-200",
};

const STATUS_DOT_COLOR = {
  HADIR: "bg-emerald-500",
  IZIN:  "bg-blue-500",
  SAKIT: "bg-amber-500",
  ALPHA: "bg-red-500",
};

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// Tanggal hari ini (WIB) — digunakan sebagai batas max date picker
const TODAY_WIB = getToday();

function normalizeStatus(s) {
  const v = String(s || "").toUpperCase();
  return STATUS_OPTIONS.some((o) => o.value === v) ? v : "ALPHA";
}

function resolveDefaultStatus(siswa) {
  if (siswa.status_saat_ini) return normalizeStatus(siswa.status_saat_ini);
  // Siswa yang tap in (tepat waktu MAUPUN terlambat) dianggap Hadir.
  // status_tapin hanya menggambarkan waktu tap, bukan status kehadiran walas.
  if (siswa.tap_in) return "HADIR";
  return "ALPHA";
}

/**
 * Badge read-only untuk status absensi.
 * Status tidak bisa diubah oleh walas karena merupakan rekaman
 * dari sistem (DetailAbsensiSiswa / tap-in). Walas tetap bisa
 * menambah/mengubah keterangan tanpa mengubah status kehadiran.
 */
function StatusBadge({ status }) {
  const key   = normalizeStatus(status);
  const label = STATUS_OPTIONS.find((o) => o.value === key)?.label ?? key;
  const style = STATUS_BADGE_STYLE[key] ?? "bg-gray-100 text-gray-600 border border-gray-200";
  const dot   = STATUS_DOT_COLOR[key] ?? "bg-gray-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {label}
    </span>
  );
}

export default function WalasDetailAbsensi() {
  const pageSize = 10;
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [kelasList, setKelasList] = useState([]);
  const [kelasId, setKelasId] = useState("");
  const [tanggal, setTanggal] = useState(getToday());
  const [page, setPage] = useState(1);

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
      if (!res?.success) {
        throw new Error(res?.message || "Gagal memuat detail absensi");
      }

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
            // Status tidak bisa diubah — hanya keterangan yang bisa diedit
            status: defaultStatus,
            keterangan: s.keterangan || "",
            keterangan_awal: s.keterangan || "",
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
  // dirty hanya berlaku untuk perubahan keterangan (status tidak bisa diubah)
  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page]
  );

  useEffect(() => {
    setPage(1);
  }, [kelasId, tanggal, rows.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Hanya perubahan keterangan yang bisa di-save — status read-only
  const handleChangeKeterangan = (siswaId, keterangan) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.siswa_id !== siswaId) return r;
        const next = { ...r, keterangan };
        next.dirty = String(next.keterangan || "") !== String(next.keterangan_awal || "");
        return next;
      })
    );
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!walasId) {
      setError("Walas ID tidak ditemukan (user.guru.id)");
      return;
    }
    if (!kelasId) {
      setError("Kelas belum dipilih");
      return;
    }
    if (!tanggal) {
      setError("Tanggal belum dipilih");
      return;
    }

    const mapToBackend = {
      HADIR: "Hadir",
      IZIN: "Izin",
      SAKIT: "Sakit",
      ALPHA: "Alpha",
    };

    // Hanya kirim baris yang keterangannya berubah (status tidak berubah)
    const payloadRows = rows
      .filter((r) => r.dirty)
      .map((r) => ({
        siswa_id: r.siswa_id,
        status: mapToBackend[normalizeStatus(r.status)] || "Alpha",
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

      setSuccess("Keterangan absensi berhasil disimpan");

      // Reset dirty rows locally
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          keterangan_awal: r.keterangan, // baseline baru = yang baru disimpan
          dirty: false,
        }))
      );
    } catch (e) {
      setError(e?.message || "Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  const getTapBadge = (row) => {
    if (row.sudah_tap) {
      // Normalise ke uppercase untuk menangani variasi casing dari API
      // ("TERLAMBAT", "Terlambat", "terlambat" semuanya tertangkap)
      const tapStatus = String(row.status_tapin || "").toUpperCase();
      const isLate = tapStatus === "TERLAMBAT";
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isLate
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLate ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          {isLate ? "Terlambat" : "Tepat Waktu"}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        -
      </span>
    );
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader
        title="Detail Absensi"
        subtitle="Detail absensi seluruh siswa wali kelas"
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">
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

        <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <InfoStatCard
            label="Kelas"
            value={selectedKelasName || "-"}
            helper="Kelas yang sedang dikelola walas"
            icon={<School className="h-5 w-5" />}
            tone="blue"
            loading={loadingKelas}
          />
          <InfoStatCard
            label="Total Siswa"
            value={summary?.total ?? rows.length}
            helper="Jumlah siswa di daftar absensi hari ini"
            icon={<Users className="h-5 w-5" />}
            tone="slate"
            loading={loadingData}
          />
          <InfoStatCard
            label="Sudah Tap"
            value={summary?.sudah_tap ?? "-"}
            helper="Siswa yang sudah tercatat tap masuk"
            icon={<ScanLine className="h-5 w-5" />}
            tone="emerald"
            loading={loadingData}
          />
          <InfoStatCard
            label="Belum Tap"
            value={summary?.belum_tap ?? "-"}
            helper="Masih perlu ditindaklanjuti walas"
            icon={<UserX className="h-5 w-5" />}
            tone="amber"
            loading={loadingData}
          />
          <InfoStatCard
            label="Tanpa RFID"
            value={summary?.tanpa_rfid ?? "-"}
            helper="Perlu perhatian pada perangkat kartu"
            icon={<IdCard className="h-5 w-5" />}
            tone="violet"
            loading={loadingData}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">
                Detail Absensi Harian
              </p>
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
                  max={TODAY_WIB}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTanggal(v > TODAY_WIB ? TODAY_WIB : v);
                  }}
                />
              </div>

              <div>
                <button
                  onClick={handleSave}
                  disabled={saving || loadingData || !kelasId || dirtyCount === 0}
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {[
                    "No",
                    "Nama",
                    "Tap In",
                    "Tap Out",
                    "RFID",
                    "Status Tap",
                    "Status Absensi",
                    "Keterangan",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
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
                  pagedRows.map((r, idx) => {
                    return (
                      <tr
                        key={r.siswa_id}
                        className={`transition-colors ${r.dirty ? "bg-blue-50/30" : "hover:bg-gray-50/60"}`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {r.nama}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {!r.sudah_tap && (
                              <span className="text-xs text-gray-400">Belum tap</span>
                            )}
                            {!r.punya_rfid && (
                              <span className="text-xs text-orange-400">
                                • Tanpa RFID
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {r.tap_in || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {r.tap_out || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {r.punya_rfid ? "Ada" : "Tidak"}
                        </td>
                        <td className="px-6 py-4">{getTapBadge(r)}</td>

                        {/* Status Absensi — read-only, tidak bisa diubah walas */}
                        <td className="px-6 py-4">
                          <StatusBadge status={r.status} />
                        </td>

                        {/* Keterangan — masih bisa diedit */}
                        <td className="px-6 py-4">
                          <input
                            className={`${inputClass} w-56`}
                            value={r.keterangan}
                            onChange={(e) =>
                              handleChangeKeterangan(r.siswa_id, e.target.value)
                            }
                            placeholder="Opsional"
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

          {!loadingData && rows.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`Halaman ${page} dari ${totalPages} (Menampilkan ${pagedRows.length} dari ${rows.length} siswa)`}
            />
          )}
        </div>
      </div>
    </main>
  );
}