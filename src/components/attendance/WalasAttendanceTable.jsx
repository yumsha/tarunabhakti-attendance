import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { detailAbsensi } from "../../lib/backendApi";
import Pagination from "../layout/Pagination.jsx";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

const getStatusText = (status) => {
  switch (status) {
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

const buildExportRows = (data) =>
  data.map((item, i) => ({
    No: i + 1,
    "Nama Siswa": item.siswa?.nama || "-",
    "Waktu Masuk": item.tap_in || "-",
    "Waktu Keluar": item.tap_out || "-",
    "Status Tap": getStatusText(item.status_tapin),
    "Status Absensi Walas": item.walasStatus || "-",
    Keterangan: item.walasKeterangan || "-",
  }));

export default function WalasAttendanceTable({ kelasId, kelasName }) {
  const pageSize = 10;
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(getTodayWIB());
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState("");
  const [page, setPage] = useState(1);

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
      const s = map[walasStatus] || map.ALPHA;
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

    switch (item.status_tapin) {
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Belum Hadir
          </span>
        );
    }
  };

  const handleExportExcel = async () => {
    if (filteredData.length === 0) return;
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const rows = buildExportRows(filteredData);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 25 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
      XLSX.writeFile(
        wb,
        `Kehadiran_${kelasName || "Kelas"}_${formatFileDate(filterDate)}.xlsx`
      );
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
                onChange={(e) => setFilterDate(e.target.value)}
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
  );
}
