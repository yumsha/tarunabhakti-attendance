import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Clock,
  Users,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import { absensiSiswa, finalAbsensi } from "../../lib/backendApi";

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 max-w-sm rounded-2xl border px-4 py-3 shadow-xl ${tone}`}>
      <div className="flex items-start gap-3">
        {toast.type === "error" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button type="button" onClick={onClose} className="opacity-60 transition hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, tanggal, summary, loading, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-50 p-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Finalisasi Absensi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Anda akan memfinalisasi absensi untuk <b>{summary?.total || 0} siswa hadir</b> pada tanggal <b>{tanggal}</b>.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Tindakan ini tidak dapat dibatalkan. Pastikan data sudah benar sebelum melanjutkan.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            Ya, Finalisasi
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultModal({ isOpen, result, onClose }) {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hasil Finalisasi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Finalisasi untuk tanggal <b>{result.tanggal}</b> telah selesai.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-blue-50 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{result.total_siswa}</p>
            <p className="text-xs text-blue-500">Total Siswa</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{result.berhasil}</p>
            <p className="text-xs text-emerald-500">Berhasil</p>
          </div>
          <div className="rounded-xl bg-red-50 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-red-700">{result.gagal}</p>
            <p className="text-xs text-red-500">Gagal</p>
          </div>
        </div>

        {result.detail_gagal?.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
            <p className="text-xs font-semibold text-red-600 mb-2">Detail Gagal:</p>
            {result.detail_gagal.map((item, i) => (
              <p key={i} className="text-xs text-red-500">
                Siswa ID {item.siswa_id}: {item.alasan}
              </p>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinalAbsensiAdmin() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [selectedDate, setSelectedDate] = useState(today);
  const [tapInList, setTapInList] = useState([]);
  const [finalizedIds, setFinalizedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const loadTapInData = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");
    setTapInList([]);
    setFinalizedIds(new Set());

    try {
      const [laporanRes, finalRes] = await Promise.all([
        absensiSiswa.laporanHarian(`tanggal=${selectedDate}`),
        finalAbsensi.list(`tanggal=${selectedDate}`),
      ]);

      const list = laporanRes?.success && Array.isArray(laporanRes.data) ? laporanRes.data : [];
      setTapInList(list);

      const finalData = finalRes?.data || [];
      const finalized = new Set(
        finalData
          .filter((r) => r.is_finalized)
          .map((r) => r.siswa_id)
      );
      setFinalizedIds(finalized);
    } catch (e) {
      console.error("Gagal memuat data tap-in:", e);
      setError(e?.message || "Gagal memuat data absensi siswa.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadTapInData();
  }, [loadTapInData]);

  const handleFinalisasi = async () => {
    setFinalizing(true);
    try {
      const res = await finalAbsensi.finalisasiSemuaSiswa({ tanggal: selectedDate });
      if (res?.success === false) {
        throw new Error(res.message || "Gagal melakukan finalisasi");
      }
      setResult(res?.data || res);
      setShowResult(true);
      setShowConfirm(false);
      setToast({ message: "Finalisasi absensi berhasil!", type: "success" });
      await loadTapInData();
    } catch (e) {
      console.error("Finalisasi gagal:", e);
      setToast({ message: e?.message || "Gagal melakukan finalisasi absensi", type: "error" });
      setShowConfirm(false);
    } finally {
      setFinalizing(false);
    }
  };

  const isHadir = (r) => {
    if (r.status_harian === "Hadir") return true;
    if (r.status_tapin === "Tepat_Waktu" || r.status_tapin === "Terlambat") return true;
    if (r.status_harian === "Izin" || r.status_harian === "Sakit" || r.status_harian === "Alpha") return true;
    return false;
  };

  const hadirOnlyList = tapInList.filter(isHadir).filter((r) => !finalizedIds.has(r.siswa_id));

  const summary = {
    total: hadirOnlyList.length,
    terlambat: hadirOnlyList.filter((r) => r.status_tapin === "Terlambat").length,
    tepatWaktu: hadirOnlyList.filter((r) => r.status_tapin === "Tepat_Waktu" || (!r.status_tapin && r.status_harian === "Hadir")).length,
    finalized: tapInList.filter(isHadir).length - hadirOnlyList.length,
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Finalisasi Absensi"
        subtitle="Finalisasi absensi untuk siswa yang hadir pada tanggal tertentu."
      />

      <div className="flex-1 overflow-auto p-8">
        {/* Date Selector */}
        <div className="mb-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Pilih Tanggal</h3>
              <p className="mt-1 text-xs text-gray-500">
                Pilih tanggal untuk melihat dan memfinalisasi siswa yang hadir.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={loadTapInData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Muat Ulang
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-blue-50 p-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              <p className="text-xs text-gray-500">Total Hadir</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.tepatWaktu}</p>
              <p className="text-xs text-gray-500">Tepat Waktu</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-50 p-3">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.terlambat}</p>
              <p className="text-xs text-gray-500">Terlambat</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Gagal memuat data.</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-800">Daftar Siswa Hadir</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedDate === today
                    ? "Menampilkan data absensi hari ini."
                    : `Menampilkan data absensi tanggal ${new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`}
                  {summary.finalized > 0 && (
                    <span className="ml-1 text-emerald-600 font-medium">
                      ({summary.finalized} siswa sudah difinalisasi)
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={loading || hadirOnlyList.length === 0 || finalizing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarCheck className="h-4 w-4" />
                Finalisasi Semua ({hadirOnlyList.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                      </tr>
                    ))
                ) : tapInList.length > 0 ? (
                  hadirOnlyList.length > 0 ? (
                    hadirOnlyList.map((row, idx) => {
                      const isTerlambat = row.status_tapin === "Terlambat";
                      const statusBadge = isTerlambat
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700";

                      const statusLabel = isTerlambat ? "Terlambat" : "Hadir";

                      return (
                        <tr key={row.siswa_id || idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{row.nama}</p>
                              <p className="text-xs text-gray-400">NISN: {row.nisn || "-"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {row.nama_kelas || row.kelas || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isTerlambat ? "bg-amber-500" : "bg-emerald-500"}`} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {row.jam_tap_in || row.jam_masuk || "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                        Tidak ada siswa dengan status Hadir pada tanggal ini.
                      </td>
                    </tr>
                  )
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                      Tidak ada siswa yang melakukan tap-in pada tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        tanggal={selectedDate}
        summary={summary}
        loading={finalizing}
        onClose={() => !finalizing && setShowConfirm(false)}
        onConfirm={handleFinalisasi}
      />

      <ResultModal
        isOpen={showResult}
        result={result}
        onClose={() => setShowResult(false)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
