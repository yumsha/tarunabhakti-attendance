import React, { useState, useEffect, useRef, useMemo } from "react";
import { orangTua } from "../../../lib/backendApi";
import {
  loadXLSX,
  runWithConcurrency,
  CONCURRENCY,
  UPDATE_ORTU_HEADERS,
} from "./ortuUtils";

function ProgressBar({ current, total, color = "emerald" }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Memproses {current} dari {total} baris...</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function OrtuUpdateModal({ isOpen, onClose, onUpdateDone, ortuList = [] }) {
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

  if (!isOpen) return null;

  const parseFile = async (file) => {
    const XLSX = await loadXLSX();
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
    const prepared = new Array(totalCount);
    const toProcess = [];

    rowsToProcess.forEach(({ row, idx }) => {
      const id = parseInt(row["ID"] || "");
      if (!id) {
        prepared[idx] = {
          nama: row["Nama Orang Tua"] || "?",
          ok: false,
          msg: "ID kosong atau tidak valid (harus angka)",
        };
        return;
      }

      const nama = String(row["Nama Orang Tua"] || "").trim();
      const nik = String(row["NIK"] || "").trim();
      const telp = String(row["Nomor Telepon"] || "").trim();
      const kerja = String(row["Pekerjaan"] || "").trim();
      const alamat = String(row["Alamat"] || "").trim();

      if (!nama || !nik || !telp || !kerja || !alamat) {
        prepared[idx] = { nama: nama || String(id), ok: false, msg: "Semua field wajib diisi" };
        return;
      }

      const existing = ortuList?.find((o) => o.id === id);
      if (existing) {
        const hasChanged =
          String(existing.nama_orangtua || "").trim() !== nama ||
          String(existing.NIK || "").trim() !== nik ||
          String(existing.nomor_telepon || "").trim() !== telp ||
          String(existing.pekerjaan || "").trim() !== kerja ||
          String(existing.alamat || "").trim() !== alamat;

        if (!hasChanged) {
          prepared[idx] = { nama, ok: false, msg: "Data sama dengan sebelumnya (tidak ada perubahan)" };
          return;
        }
      }

      toProcess.push({ row, idx, id, nama, nik, telp, kerja, alamat });
    });

    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ idx, id, nama, nik, telp, kerja, alamat }) => {
        try {
          const result = await orangTua.update(id, {
            nama_orangtua: nama,
            NIK: nik,
            nomor_telepon: telp,
            pekerjaan: kerja,
            alamat: alamat,
          });
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
    onUpdateDone();
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
    onUpdateDone();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-emerald-600 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base sm:text-lg">Update Data Orang Tua</h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              Upload Excel dengan kolom ID (key), Nama, NIK, Telepon, Pekerjaan, Alamat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="text-emerald-200 hover:text-white transition-colors text-sm font-semibold cursor-pointer disabled:opacity-40"
          >
            Tutup
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-emerald-200 rounded-2xl p-8 sm:p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
            >
              <p className="text-xs sm:text-sm font-semibold text-gray-700">
                Pilih file Excel (.xlsx) di sini
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && !updating && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  {filteredRows.length} dari {rows.length} baris ditemukan
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRows([]);
                    setResults([]);
                    setPreviewLimit(250);
                    setResultSearch("");
                    setDraftSearch("");
                  }}
                  className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                >
                  Ganti file
                </button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={draftSearch}
                  onChange={(e) => {
                    setDraftSearch(e.target.value);
                    setPreviewLimit(250);
                  }}
                  placeholder="Cari di data draft Excel..."
                  className="w-full text-xs px-3.5 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {UPDATE_ORTU_HEADERS.map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_ORTU_HEADERS.map((h) => (
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
                <div className="text-center py-2 bg-gray-50 border-t border-gray-100 flex flex-col items-center justify-center rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewLimit((prev) => prev + 250)}
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Tampilkan lebih banyak (+250 data) ...
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Menampilkan {Math.min(previewLimit, filteredRows.length)} dari {filteredRows.length} baris
                  </p>
                </div>
              )}
            </div>
          )}

          {(updating || done) && (
            <div className="space-y-3 sm:space-y-4">
              {updating && <ProgressBar current={progress.current} total={progress.total} color="emerald" />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-2xl font-black text-emerald-600">{successCount}</p>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">Berhasil Diupdate</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                  <p className="text-2xl font-black text-red-500">{failCount}</p>
                  <p className="text-xs font-semibold text-red-700 mt-0.5">Gagal / Dilewati</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[["all", "Semua"], ["berhasil", "Berhasil"], ["gagal", "Gagal"]].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setResultFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        resultFilter === val
                          ? val === "berhasil"
                            ? "bg-emerald-100 text-emerald-700"
                            : val === "gagal"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari log nama atau status..."
                  className="flex-1 text-xs px-3.5 py-1.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="overflow-auto max-h-44 border border-gray-200 rounded-xl divide-y divide-gray-100">
                {filteredResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2 text-xs sm:text-sm">
                    <span className="font-medium text-gray-800 truncate">{r.nama}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {r.ok ? "Berhasil" : r.msg || "Gagal"}
                    </span>
                  </div>
                ))}
                {filteredResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {updating ? "Memproses..." : "Tidak ada hasil log"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 cursor-pointer"
            >
              {done ? "Tutup" : "Batal"}
            </button>
            {done && failCount > 0 && (
              <button
                type="button"
                onClick={retryFailed}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-200"
              >
                Retry Gagal ({failCount})
              </button>
            )}
            {!done && (
              <button
                type="button"
                onClick={startUpdate}
                disabled={!rows.length || updating}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-200 cursor-pointer"
              >
                {updating ? "Mengupdate..." : "Mulai Update"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
