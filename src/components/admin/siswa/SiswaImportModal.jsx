import React, { useState, useEffect, useRef, useMemo } from "react";
import { XCircle, CheckCircle2, AlertTriangle, CheckCircle, Upload } from "lucide-react";
import XLSX from "xlsx-js-style";
import { siswa, orangTua } from "../../../lib/backendApi";
import { runWithConcurrency, CONCURRENCY, findMatchingKelas } from "./siswaUtils";
import ProgressBar from "./ProgressBar";
import InfoStatCard from "../../layout/InfoStatCard";

export default function SiswaImportModal({ onClose, onImportDone, kelasList = [] }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const fileRef = useRef();

  useEffect(() => {
    if (!importing) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const wb = XLSX.read(data, { type: "binary" });
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

  const runImport = async (rowsToProcess, totalCount) => {
    let orangtuaMap = {};
    try {
      const ortuRes = await orangTua.list("limit=9999");
      if (ortuRes?.success && Array.isArray(ortuRes.data)) {
        ortuRes.data.forEach((o) => {
          orangtuaMap[String(o.id)] = o;
        });
      }
    } catch (_) {}

    const prepared = new Array(totalCount);
    const seenNISN = new Set();
    const seenNIPD = new Set();
    const seenNIK = new Set();
    const toProcess = [];

    rowsToProcess.forEach(({ row, idx }) => {
      const nama = row["Nama"] || "?";
      const NISN = String(row["NISN"] || "").trim();
      const NIPD = String(row["NIPD"] || "").trim();
      const NIK = String(row["NIK"] || "").trim();

      if (!NISN || !NIPD || !NIK || !row["Nama"]) {
        prepared[idx] = { nama, ok: false, msg: "Field wajib siswa kosong (NISN / NIPD / NIK / Nama)" };
        return;
      }
      if (seenNISN.has(NISN)) {
        prepared[idx] = { nama, ok: false, msg: `NISN ${NISN} duplikat dalam file (skip)` };
        return;
      }
      if (seenNIPD.has(NIPD)) {
        prepared[idx] = { nama, ok: false, msg: `NIPD ${NIPD} duplikat dalam file (skip)` };
        return;
      }
      if (seenNIK.has(NIK)) {
        prepared[idx] = { nama, ok: false, msg: `NIK ${NIK} duplikat dalam file (skip)` };
        return;
      }
      seenNISN.add(NISN);
      seenNIPD.add(NIPD);
      seenNIK.add(NIK);
      toProcess.push({ row, idx });
    });

    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ row, idx }) => {
        const nama = row["Nama"] || "?";

        try {
          const idOrtu = String(row["ID Orang Tua"] || "").trim();
          const nikOrtu = String(row["NIK Orang Tua"] || "").trim();
          const namaOrtu = String(row["Nama Orang Tua"] || "").trim();
          const telpOrtu = String(row["No Telp Orang Tua"] || "").trim();
          const pekerjaanOrtu = String(row["Pekerjaan Orang Tua"] || "").trim();
          const alamatOrtu = String(row["Alamat Orang Tua"] || "").trim();

          const hasDetail = Boolean(nikOrtu || namaOrtu || telpOrtu || pekerjaanOrtu || alamatOrtu);
          let orangtuaPayload = undefined;

          if (idOrtu) {
            const matched = orangtuaMap[idOrtu];
            if (matched) {
              orangtuaPayload = {
                NIK: matched.NIK,
                nama_orangtua: matched.nama_orangtua,
                nomor_telepon: matched.nomor_telepon,
                pekerjaan: matched.pekerjaan,
                alamat: matched.alamat,
              };
            } else {
              const entry = { nama, ok: false, msg: `ID Orang Tua "${idOrtu}" tidak ditemukan di database` };
              prepared[idx] = entry;
              return entry;
            }
          } else if (hasDetail) {
            orangtuaPayload = {
              NIK: nikOrtu,
              nama_orangtua: namaOrtu,
              nomor_telepon: telpOrtu,
              pekerjaan: pekerjaanOrtu,
              alamat: alamatOrtu,
            };
          }

          const matchedKelas = findMatchingKelas(row["Kelas"], row["Jurusan"], row["Rombel"], kelasList);

          const payload = {
            nisn: String(row["NISN"] || ""),
            nipd: String(row["NIPD"] || ""),
            nik: String(row["NIK"] || ""),
            nama,
            tempat_lahir: row["Tempat Lahir"] || "",
            tgl_lahir: row["Tanggal Lahir (YYYY-MM-DD)"] || "",
            jenis_kelamin: row["Jenis Kelamin"] || row["Gender"] || "",
            agama: row["Agama"] || "",
            nama_kelas: matchedKelas ? matchedKelas.kelas : String(row["Kelas"] || "").trim(),
            jurusan: matchedKelas ? matchedKelas.jurusan : (() => {
              const rawJ = String(row["Jurusan"] || "").trim();
              const romb = String(row["Rombel"] || "").trim();
              if (romb && !rawJ.toLowerCase().endsWith(romb.toLowerCase())) {
                return `${rawJ} ${romb}`.trim();
              }
              return rawJ;
            })(),
            ...(orangtuaPayload ? { orangtua: orangtuaPayload } : {}),
            ...(matchedKelas ? { kelas_id: matchedKelas.id } : {})
          };

          const result = await siswa.create(payload);
          const entry = { nama, ok: result?.success ?? false, msg: result?.message || "" };
          prepared[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { nama, ok: false, msg: err.message };
          prepared[idx] = entry;
          return entry;
        }
      },
      (doneCount) => {
        setProgress({ current: preDone + doneCount, total: totalCount });
        setResults(prepared.filter(Boolean));
      }
    );

    setDone(true);
    setImporting(false);
    if (onImportDone) onImportDone();
    return prepared;
  };

  const startImport = () => {
    if (!rows.length || importing) return;
    setImporting(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    const allRows = rows.map((row, idx) => ({ row, idx }));
    runImport(allRows, rows.length);
  };

  const retryFailed = () => {
    const failedRows = results
      .map((r, i) => ({ r, originalRow: rows[i] }))
      .filter(({ r }) => !r.ok)
      .map(({ originalRow }, i) => ({ row: originalRow, idx: i }));
    if (!failedRows.length) return;
    setImporting(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: failedRows.length });
    runImport(failedRows, failedRows.length);
  };

  const successCount = results.filter((r) => r?.ok).length;
  const failCount = results.filter((r) => r && !r.ok).length;

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
      list = list.filter((r) => r?.ok);
    } else if (resultFilter === "gagal") {
      list = list.filter((r) => r && !r.ok);
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Siswa</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) untuk import massal</p>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-blue-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
              className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex justify-center mb-3 text-blue-400 group-hover:text-blue-600 transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-blue-600 underline font-semibold">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && !importing && (
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
                  className="w-full text-xs px-3.5 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {Object.keys(rows[0]).map((k) => (
                        <th key={k} className={`px-3 py-2 text-left font-semibold whitespace-nowrap
                          ${["ID Orang Tua", "NIK Orang Tua", "Nama Orang Tua", "No Telp Orang Tua", "Pekerjaan Orang Tua", "Alamat Orang Tua"].includes(k)
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-600"}`}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {Object.entries(r).map(([k, v], j) => (
                          <td key={j} className={`px-3 py-2 whitespace-nowrap
                            ${["ID Orang Tua", "NIK Orang Tua", "Nama Orang Tua", "No Telp Orang Tua", "Pekerjaan Orang Tua", "Alamat Orang Tua"].includes(k)
                              ? "text-blue-700 bg-blue-50/40"
                              : "text-gray-700"}`}>
                            {String(v)}
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
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    Tampilkan lebih banyak (+250 data) ...
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">Menampilkan {Math.min(previewLimit, filteredRows.length)} dari {filteredRows.length} baris</p>
                </div>
              )}
            </div>
          )}

          {(importing || done) && (
            <div className="space-y-3">
              {importing && <ProgressBar current={progress.current} total={progress.total} color="blue" />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang lolos proses import" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
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
                  className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    {importing ? "Menunggu hasil baris pertama..." : "Tidak ada hasil pencarian log yang cocok"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
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
                onClick={startImport}
                disabled={!rows.length || importing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Mengimport...</span>
                  </>
                ) : (
                  "Mulai Import"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
