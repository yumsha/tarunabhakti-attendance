import React, { useState, useEffect, useRef, useMemo } from "react";
import { XCircle, CheckCircle2, AlertTriangle, CheckCircle, Upload } from "lucide-react";
import XLSX from "xlsx-js-style";
import { siswa } from "../../../lib/backendApi";
import { runWithConcurrency, CONCURRENCY, findMatchingKelas, UPDATE_HEADERS } from "./siswaUtils";
import ProgressBar from "./ProgressBar";
import InfoStatCard from "../../layout/InfoStatCard";

export default function SiswaUpdateModal({ onClose, onUpdateDone, kelasList = [] }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const fileRef = useRef();

  useEffect(() => {
    if (!updating) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [updating]);

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
      setProgress({ current: 0, total: 0 });
      setPreviewLimit(250);
      setResultSearch("");
      setDraftSearch("");
      setResultFilter("all");
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const runUpdate = async (rowsToProcess, totalCount) => {
    let siswaMap = {};
    try {
      const r = await siswa.list("limit=9999");
      if (r?.success && Array.isArray(r.data)) {
        r.data.forEach((s) => {
          siswaMap[String(s.nisn || s.NISN)] = s;
        });
      }
    } catch (_) {}

    const prepared = new Array(totalCount);
    const toProcess = [];

    rowsToProcess.forEach(({ row, idx }) => {
      const nisnKey = String(row["NISN"] || "").trim();
      if (!nisnKey) {
        prepared[idx] = { nama: row["Nama"] || "?", ok: false, msg: "NISN kosong – wajib diisi" };
        return;
      }

      const existing = siswaMap[nisnKey];
      if (!existing) {
        prepared[idx] = { nama: row["Nama"] || nisnKey, ok: false, msg: `Siswa NISN ${nisnKey} tidak ditemukan` };
        return;
      }

      const matchedKelas = findMatchingKelas(row["Kelas"], row["Jurusan"], row["Rombel"], kelasList);

      if (!matchedKelas) {
        prepared[idx] = {
          nama: row["Nama"] || nisnKey,
          ok: false,
          msg: `Kelas "${row["Kelas"] || ""}" tidak ditemukan`,
        };
        return;
      }

      const kelasId = matchedKelas.id;
      const jurusanStr = matchedKelas.jurusan;
      const ortuId = row["ID Orang Tua"] ? parseInt(row["ID Orang Tua"]) : null;

      const existingDateStr = existing.tgl_lahir
        ? existing.tgl_lahir.slice(0, 10)
        : existing.tanggal_lahir
        ? existing.tanggal_lahir.slice(0, 10)
        : "";
      const inputDateStr = String(row["Tanggal Lahir (YYYY-MM-DD)"] || "").trim();

      const hasChanged =
        String(existing.nisn || existing.NISN || "").trim() !== String(row["NISN"] || "").trim() ||
        String(existing.nipd || existing.NIPD || "").trim() !== String(row["NIPD"] || "").trim() ||
        String(existing.nik || existing.NIK || "").trim() !== String(row["NIK"] || "").trim() ||
        String(existing.nama || "").trim() !== String(row["Nama"] || "").trim() ||
        String(existing.jenis_kelamin || existing.gender || "").trim() !== String(row["Jenis Kelamin"] || row["Gender"] || "").trim() ||
        String(existing.tempat_lahir || "").trim() !== String(row["Tempat Lahir"] || "").trim() ||
        String(existing.agama || "").trim() !== String(row["Agama"] || "").trim() ||
        String(existing.jurusan || "").trim() !== jurusanStr ||
        existingDateStr !== inputDateStr ||
        existing.kelas_id !== kelasId ||
        existing.orangtua_id !== (ortuId || null);

      if (!hasChanged) {
        prepared[idx] = {
          nama: row["Nama"] || nisnKey,
          ok: false,
          msg: "Data sama dengan sebelumnya (tidak ada perubahan)",
        };
        return;
      }

      toProcess.push({ idx, row, existing, kelasId, ortuId, nisnKey, jurusanStr });
    });

    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ idx, row, existing, kelasId, ortuId, nisnKey, jurusanStr }) => {
        try {
          const payload = {
            nisn: String(row["NISN"] || "").trim(),
            nipd: String(row["NIPD"] || "").trim(),
            nik: String(row["NIK"] || "").trim(),
            nama: String(row["Nama"] || "").trim(),
            tempat_lahir: String(row["Tempat Lahir"] || "").trim(),
            tgl_lahir: String(row["Tanggal Lahir (YYYY-MM-DD)"] || "").trim(),
            jenis_kelamin: String(row["Jenis Kelamin"] || row["Gender"] || "").trim(),
            agama: String(row["Agama"] || "").trim(),
            jurusan: jurusanStr,
            kelas_id: kelasId,
            ...(ortuId ? { orangtua_id: ortuId } : {}),
          };

          const result = await siswa.update(existing.id, payload);
          const entry = { nama: payload.nama || nisnKey, ok: result?.success ?? false, msg: result?.message || "" };
          prepared[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { nama: row["Nama"] || nisnKey, ok: false, msg: err.message };
          prepared[idx] = entry;
          return entry;
        }
      },
      (doneCount) => {
        setProgress({ current: preDone + doneCount, total: totalCount });
        setResults(prepared.filter(Boolean));
      }
    );

    return prepared;
  };

  const startUpdate = async () => {
    if (!rows.length) return;
    setUpdating(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    setResultFilter("all");

    const allRows = rows.map((row, idx) => ({ row, idx }));
    await runUpdate(allRows, rows.length);

    setUpdating(false);
    setDone(true);
    if (onUpdateDone) onUpdateDone();
  };

  const retryFailed = async () => {
    const failedRows = results
      .map((r, i) => ({ r, originalRow: rows[i] }))
      .filter(({ r }) => !r.ok)
      .map(({ originalRow }, i) => ({ row: originalRow, idx: i }));
    if (!failedRows.length) return;
    setUpdating(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: failedRows.length });
    setResultFilter("all");
    await runUpdate(failedRows, failedRows.length);
    setUpdating(false);
    setDone(true);
    if (onUpdateDone) onUpdateDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  const filteredRows = useMemo(() => {
    if (!draftSearch.trim()) return rows;
    const q = draftSearch.toLowerCase().trim();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, draftSearch]);

  const filteredResults = useMemo(() => {
    let list = results;
    if (resultFilter === "berhasil") {
      list = list.filter((r) => r.ok);
    } else if (resultFilter === "gagal") {
      list = list.filter((r) => !r.ok);
    }
    if (!resultSearch.trim()) return list;
    const q = resultSearch.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) || r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch, resultFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-200">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Update Data Siswa</h2>
            <p className="text-emerald-200 text-xs mt-0.5">Upload Excel dengan kolom NISN (key), field siswa, Kelas, Jurusan, ID Orang Tua</p>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="text-emerald-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-emerald-200 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
            >
              <div className="flex justify-center mb-3 text-emerald-400 group-hover:text-emerald-600 transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-emerald-600 underline font-semibold">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && !updating && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{filteredRows.length} dari {rows.length} baris ditemukan</p>
                <button
                  type="button"
                  onClick={() => { setRows([]); setResults([]); setPreviewLimit(250); setResultSearch(""); setDraftSearch(""); }}
                  className="text-xs text-red-500 hover:underline cursor-pointer font-medium"
                >
                  Ganti file
                </button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={draftSearch}
                  onChange={(e) => { setDraftSearch(e.target.value); setPreviewLimit(250); }}
                  placeholder="Cari di data draft Excel..."
                  className="w-full text-xs px-3.5 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {UPDATE_HEADERS.map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                            {String(r[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length > previewLimit && (
                <div className="text-center py-2 bg-gray-50 border-t border-gray-100 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setPreviewLimit((prev) => prev + 250)}
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Tampilkan lebih banyak (+250 data) ...
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">Menampilkan {Math.min(previewLimit, filteredRows.length)} dari {filteredRows.length} baris</p>
                </div>
              )}
            </div>
          )}

          {(updating || done) && (
            <div className="space-y-3">
              {updating && <ProgressBar current={progress.current} total={progress.total} color="emerald" />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang berhasil diupdate" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="flex items-center gap-2">
                {[["all", "Semua"], ["berhasil", "Berhasil"], ["gagal", "Gagal"]].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setResultFilter(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${resultFilter === val
                      ? val === "berhasil" ? "bg-emerald-100 text-emerald-700" : val === "gagal" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                  >
                    {label}
                  </button>
                ))}
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari nama atau status hasil log..."
                  className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-xl divide-y divide-gray-100">
                {filteredResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm">
                    <span className={r.ok ? "text-emerald-500" : "text-red-500"}>
                      {r.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </span>
                    <span className="font-medium text-gray-800 flex-1 truncate">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500 text-right max-w-xs">{r.msg}</span>}
                  </div>
                ))}
                {filteredResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {updating ? "Menunggu hasil baris pertama..." : "Tidak ada hasil pencarian log yang cocok"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {done ? "Tutup" : "Batal"}
            </button>
            {done && failCount > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Retry Gagal ({failCount})
              </button>
            )}
            {!done && (
              <button
                type="button"
                onClick={startUpdate}
                disabled={!rows.length || updating}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {updating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Mengupdate...</span>
                  </>
                ) : (
                  "Mulai Update"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
