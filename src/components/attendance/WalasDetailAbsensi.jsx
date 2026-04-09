import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Save, Loader2, RefreshCw } from "lucide-react";
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
  return new Date().toISOString().split("T")[0];
}

function normalizeStatus(s) {
  const v = String(s || "").toUpperCase();
  return STATUS_OPTIONS.some((o) => o.value === v) ? v : "ALPHA";
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

  const [data, setData] = useState(null); // raw from API
  const [rows, setRows] = useState([]); // editable rows

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
            (c) => c.walas_id === walasId || c.wali_kelas_id === walasId || c.walas?.id === walasId
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
      const params = new URLSearchParams({
        kelas_id: String(kelasId),
        tanggal,
      });
      const res = await detailAbsensi.pratinjauWalas(params.toString());
      if (!res?.success) throw new Error(res?.message || "Gagal memuat detail absensi");

      const payload = res.data;
      setData(payload);

      const daftar = Array.isArray(payload?.daftar_siswa) ? payload.daftar_siswa : [];
      setRows(
        daftar.map((s) => ({
          siswa_id: s.siswa_id,
          nama: s.nama,
          tap_in: s.tap_in,
          tap_out: s.tap_out,
          status_tapin: s.status_tapin,
          punya_rfid: !!s.punya_rfid,
          sudah_tap: !!s.tap_in,
          detail_id: s.detail_id,
          status_awal: normalizeStatus(s.status_saat_ini || s.status_rekomendasi),
          status: normalizeStatus(s.status_saat_ini || s.status_rekomendasi),
          keterangan: s.keterangan || "",
          dirty: false,
        }))
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

  const handleChangeRow = (siswa_id, patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.siswa_id !== siswa_id) return r;
        const next = { ...r, ...patch };
        next.dirty =
          next.status !== next.status_awal || String(next.keterangan || "") !== String(r.keterangan || "");
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
      setSuccess("Absensi berhasil disimpan");
      await fetchDetail();
    } catch (e) {
      setError(e?.message || "Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader
        title="Detail Absensi"
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm">
            {success}
          </div>
        ) : null}

        {/* summary */}
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
            <p className="mt-1 text-sm font-semibold text-gray-900">{summary?.sudah_tap ?? "—"}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Belum Tap</p>
            <div className="mt-1 space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                {summary?.belum_tap ?? "—"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Tanpa RFID</p>
            <div className="mt-1 space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                {summary?.tanpa_rfid ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Detail Absensi Harian</p>
              <p className="text-sm text-gray-500 ml-2">
                {rows.length} siswa
                {dirtyCount ? ` • ${dirtyCount} perubahan` : ""}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-2">
                <select
                  className={`${inputClass} w-56`}
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  disabled={loadingKelas}
                >
                  {loadingKelas ? (
                    <option>Memuat kelas...</option>
                  ) : kelasList.length > 0 ? (
                    kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {(k.kelas || "Kelas") + (k.jurusan?.nama_jurusan ? ` ${k.jurusan.nama_jurusan}` : "")}
                      </option>
                    ))
                  ) : (
                    <option value="">Tidak ada kelas walas</option>
                  )}
                </select>

                <input
                  type="date"
                  className={`${inputClass} w-44`}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <button
                onClick={fetchDetail}
                disabled={loadingData || !kelasId}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>

              <button
                onClick={handleSave}
                disabled={saving || loadingData || !kelasId || rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan {dirtyCount > 0 ? `(${dirtyCount})` : ""}
              </button>
            </div>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  {["No", "Nama", "Tap In", "Tap Out", "RFID", "Status Tap", "Status Absensi", "Keterangan"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingData ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : rows.length > 0 ? (
                  rows.map((r, idx) => (
                    <tr key={r.siswa_id} className={r.dirty ? "bg-amber-50/40" : "hover:bg-blue-50/30"}>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{r.nama}</p>
                        <p className="text-xs text-gray-400">
                          {r.sudah_tap ? "Sudah tap" : "Belum tap"}
                          {!r.punya_rfid ? " • Tanpa RFID" : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.tap_in || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.tap_out || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.punya_rfid ? "Ada" : "Tidak"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.status_tapin || "—"}</td>
                      <td className="px-6 py-4">
                        <select
                          className={`${inputClass} w-40`}
                          value={r.status}
                          onChange={(e) => handleChangeRow(r.siswa_id, { status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          className={`${inputClass} w-64`}
                          value={r.keterangan}
                          onChange={(e) => handleChangeRow(r.siswa_id, { keterangan: e.target.value })}
                          placeholder="Opsional"
                        />
                      </td>
                    </tr>
                  ))
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

