import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Printer,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { detailAbsensi, statusRequest, exportApi } from "../../lib/backendApi";
import Pagination from "../layout/Pagination.jsx";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// Tanggal hari ini (WIB) — digunakan sebagai batas max date picker
const TODAY_WIB = getTodayWIB();

const getStatusText = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "TEPAT_WAKTU":
      return "Hadir";
    case "TERLAMBAT":
      return "Terlambat";
    case "HADIR":
      return "Hadir (Walas)";
    case "IZIN":
      return "Izin";
    case "SAKIT":
      return "Sakit";
    case "ALPHA":
      return "Alpha";
    default:
      return "Belum Hadir";
  }
};

const formatFileDate = (dateStr) => {
  const d = new Date(dateStr);
  return d
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
};

const formatDateTitle = (dateStr) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function WalasAttendanceTable({ kelasId, kelasName, walasId }) {
  const pageSize = 10;
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(getTodayWIB());
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState("");
  const [page, setPage] = useState(1);

  // ── Pending requests from GURU ──────────────────────────────────────────
  const [pendingRequests, setPendingRequests] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const pollRef = useRef(null);

  const fetchPending = useCallback(async () => {
    if (!walasId) return;
    try {
      const res = await statusRequest.getPending(`walas_id=${walasId}${kelasId ? `&kelas_id=${kelasId}` : ""}`);
      if (res?.success) setPendingRequests(res.data ?? []);
    } catch (_) {}
  }, [walasId, kelasId]);

  useEffect(() => {
    fetchPending();
    // Tick clock every second for countdown
    const clockId = setInterval(() => setNow(new Date()), 1000);
    // Poll pending every 30 s
    pollRef.current = setInterval(fetchPending, 30_000);
    return () => { clearInterval(clockId); clearInterval(pollRef.current); };
  }, [fetchPending]);

  const handleRespond = async (id, approved) => {
    setRespondingId(id);
    try {
      const res = await statusRequest.respond(id, { approved });
      if (res?.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== id));
        // refresh attendance table so new status shows
        setFilterDate((d) => d); // triggers useEffect below
      }
    } catch (err) {
      console.error("Respond error:", err);
    } finally {
      setRespondingId(null);
    }
  };

  const formatCountdown = (expiresAt) => {
    const diff = Math.max(0, new Date(expiresAt) - now);
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return diff === 0 ? "Kedaluwarsa" : `${m}:${String(s).padStart(2, "0")}`;
  };

  const STATUS_LABEL = { HADIR: "Hadir", IZIN: "Izin", SAKIT: "Sakit", ALPHA: "Alpha" };
  const STATUS_CLS   = { HADIR: "bg-emerald-100 text-emerald-700", IZIN: "bg-blue-100 text-blue-700", SAKIT: "bg-purple-100 text-purple-700", ALPHA: "bg-red-100 text-red-700" };

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!kelasId) {
        setAttendanceData([]);
        return;
      }

      setLoading(true);
      try {
        const res = await detailAbsensi.pratinjauWalas(
          new URLSearchParams({ kelas_id: kelasId, tanggal: filterDate }).toString()
        );
        if (!res?.success) {
          setAttendanceData([]);
          return;
        }

        const normalized = (res.data?.daftar_siswa || []).map((s) => ({
          id: s.siswa_id,
          siswa: { nama: s.nama },
          tap_in: s.tap_in,
          tap_out: s.tap_out,
          status_tapin: s.status_tapin,
          walasStatus: s.status_saat_ini,
          walasKeterangan: s.keterangan,
          sudahDiabsenWalas: s.sudah_diabsen,
        }));

        setAttendanceData(normalized);
      } catch (e) {
        console.error("Failed to fetch walas attendance:", e);
        setAttendanceData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [kelasId, filterDate]);

  const filteredData = useMemo(
    () =>
      attendanceData.filter((item) => {
        if (!searchQuery.trim()) return true;
        return (item.siswa?.nama || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }),
    [attendanceData, searchQuery]
  );
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterDate, kelasId, attendanceData.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getStatusBadge = (item) => {
    const walasStatus = item.walasStatus;

    if (item.sudahDiabsenWalas && walasStatus) {
      const map = {
        HADIR: {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          label: "Hadir",
        },
        IZIN: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          dot: "bg-blue-500",
          label: "Izin",
        },
        SAKIT: {
          bg: "bg-purple-100",
          text: "text-purple-700",
          dot: "bg-purple-500",
          label: "Sakit",
        },
        ALPHA: {
          bg: "bg-red-100",
          text: "text-red-700",
          dot: "bg-red-500",
          label: "Alpha",
        },
      };
      const key = String(walasStatus).toUpperCase();
      const s = map[key] || map.ALPHA;
      return (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
            {s.label}
          </span>
        </div>
      );
    }

    // Normalise ke uppercase agar tidak sensitif terhadap casing dari API
    // (misal "Terlambat" vs "TERLAMBAT" keduanya tertangkap dengan benar)
    const tapStatus = String(item.status_tapin || "").toUpperCase();

    switch (tapStatus) {
      case "TEPAT_WAKTU":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Hadir
          </span>
        );
      case "TERLAMBAT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Terlambat
          </span>
        );
      default:
        if (item.tap_in) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Hadir
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Belum Hadir
          </span>
        );
    }
  };

  const handleExportExcel = async () => {
    if (!kelasId || !filterDate) return;
    setExporting("excel");
    try {
      const url = exportApi.rekapKelasHarian(kelasId, filterDate);
      const blob = await exportApi.downloadBlob(url);
      if (!blob) {
        console.error("Excel export failed: no blob returned");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Rekap_Harian_${kelasName || "Kelas"}_${formatFileDate(filterDate)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Excel export failed:", err);
    } finally {
      setExporting("");
    }
  };

  const handleExportPDF = async () => {
    if (filteredData.length === 0) return;
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Daftar Kehadiran ${kelasName || ""}`, 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(formatDateTitle(filterDate), 14, 28);
      doc.text(`Total: ${filteredData.length} siswa`, 14, 34);

      autoTable(doc, {
        startY: 40,
        head: [
          [
            "No",
            "Nama Siswa",
            "Waktu Masuk",
            "Waktu Keluar",
            "Status Tap",
            "Status Walas",
            "Keterangan",
          ],
        ],
        body: filteredData.map((item, i) => [
          i + 1,
          item.siswa?.nama || "-",
          item.tap_in || "-",
          item.tap_out || "-",
          getStatusText(item.status_tapin),
          item.walasStatus || "-",
          item.walasKeterangan || "-",
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { cellPadding: 3 },
        columnStyles: { 0: { halign: "center", cellWidth: 10 } },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          doc.internal.pageSize.getWidth() - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }

      doc.save(
        `Kehadiran_${kelasName || "Kelas"}_${formatFileDate(filterDate)}.pdf`
      );
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting("");
    }
  };

  const handlePrint = () => {
    if (filteredData.length === 0) return;
    const rows = filteredData
      .map(
        (item, i) => `
      <tr>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${item.siswa?.nama || "-"}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${item.tap_in || "-"}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${item.tap_out || "-"}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${getStatusText(item.status_tapin)}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${item.walasStatus || "-"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${item.walasKeterangan || "-"}</td>
      </tr>`
      )
      .join("");

    const html = `
      <html><head><title>Daftar Kehadiran ${kelasName || ""}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#1f2937}
        h1{font-size:20px;margin-bottom:4px}
        .subtitle{color:#6b7280;font-size:13px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#3b82f6;color:white;padding:10px 8px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #3b82f6}
        td{font-size:13px}
        tr:nth-child(even){background:#f9fafb}
        .footer{margin-top:24px;font-size:11px;color:#9ca3af;text-align:right}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <h1>Daftar Kehadiran ${kelasName || ""}</h1>
        <p class="subtitle">${formatDateTitle(filterDate)} - Total: ${filteredData.length} siswa</p>
        <table>
          <thead><tr>
            <th style="width:40px">No</th><th>Nama Siswa</th>
            <th style="width:110px">Waktu Masuk</th><th style="width:110px">Waktu Keluar</th>
            <th style="width:100px">Status Tap</th><th style="width:110px">Status Walas</th>
            <th>Keterangan</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">Dicetak pada ${new Date().toLocaleString("id-ID")}</p>
      </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <div className="space-y-4">
      {/* ── Pending requests panel ────────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-800">
              Permintaan Perubahan Status ({pendingRequests.length})
            </h4>
            <span className="ml-auto text-xs text-amber-600">
              Auto-disetujui jika tidak direspons dalam 15 menit
            </span>
          </div>

          <ul className="divide-y divide-gray-100">
            {pendingRequests.map((req) => {
              const countdown = formatCountdown(req.expires_at);
              const isExpiring = new Date(req.expires_at) - now < 3 * 60 * 1000;
              const isMe = respondingId === req.id;
              return (
                <li key={req.id} className="px-6 py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{req.siswa?.nama}</p>
                    <p className="text-xs text-gray-500">
                      Diajukan oleh <span className="font-medium">{req.guru?.nama}</span>
                      {" · "}{req.tanggal}
                    </p>
                  </div>

                   <div className="flex items-center gap-2">
                    {req.status_lama && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[String(req.status_lama).toUpperCase()] ?? "bg-gray-100 text-gray-600"}  opacity-60`}>
                        {STATUS_LABEL[String(req.status_lama).toUpperCase()] ?? req.status_lama}
                      </span>
                    )}
                    <span className="text-gray-400 text-xs">→</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[String(req.status_baru).toUpperCase()] ?? "bg-gray-100 text-gray-600"}` }>
                      {STATUS_LABEL[String(req.status_baru).toUpperCase()] ?? req.status_baru}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1 text-xs ${ isExpiring ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                    <Clock className="w-3 h-3" />{countdown}
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={!!respondingId}
                      onClick={() => handleRespond(req.id, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40"
                    >
                      {isMe ? <span className="animate-pulse">...</span> : <><CheckCircle className="w-3.5 h-3.5" /> Setujui</>}
                    </button>
                    <button
                      disabled={!!respondingId}
                      onClick={() => handleRespond(req.id, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Main attendance table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Daftar Kehadiran {kelasName || ""}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredData.length} siswa ditemukan
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={handleExportExcel}
                disabled={filteredData.length === 0 || exporting === "excel"}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={handleExportPDF}
                disabled={filteredData.length === 0 || exporting === "pdf"}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={handlePrint}
                disabled={filteredData.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
            </div>

            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="date"
                className="outline-none text-sm text-gray-700 bg-transparent"
                value={filterDate}
                max={TODAY_WIB}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterDate(v > TODAY_WIB ? TODAY_WIB : v);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {["No", "Nama Siswa", "Waktu Masuk", "Waktu Keluar", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Keterangan Walas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan="6" className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : filteredData.length > 0 ? (
              pagedData.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {item.siswa?.nama || "-"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tap_in || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tap_out || "-"}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(item)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 italic">
                    {item.walasKeterangan || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500 text-sm">
                      Belum ada data kehadiran untuk tanggal ini.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={
            searchQuery.trim()
              ? `Halaman ${page} dari ${totalPages} (Menampilkan ${pagedData.length} hasil pencarian dari ${filteredData.length} data, total ${attendanceData.length} siswa)`
              : `Halaman ${page} dari ${totalPages} (Menampilkan ${pagedData.length} dari ${attendanceData.length} siswa)`
          }
        />
      )}
    </div>
    </div>
  );
}
