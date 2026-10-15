import { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Save,
  Search,
  Users,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Info,
  Check,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import { kenaikanKelas } from "../../lib/backendApi";

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export default function WalasKenaikanKelas() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Server data
  const [apiData, setApiData] = useState(null);
  const [activeClassIndex, setActiveClassIndex] = useState(0);

  // Local decision state: map of siswa_id -> { keputusan: 'Naik' | 'Tinggal' | 'Lulus', catatan: string, modified: boolean }
  const [decisions, setDecisions] = useState({});

  // Simulation mode: allows tester/dev to preview and test unlocked actions when current date is before -1 bulan
  const [simulationUnlocked, setSimulationUnlocked] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'Naik', 'Tinggal', 'Lulus', 'unreviewed'

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [noteModalStudent, setNoteModalStudent] = useState(null);

  // Load preview data
  const loadData = async (isSim = simulationUnlocked) => {
    setLoading(true);
    setError("");
    try {
      const query = isSim ? "simulate_unlocked=true" : "";
      const res = await kenaikanKelas.preview(query);

      if (!res?.success) {
        throw new Error(res?.message || "Gagal memuat data kenaikan kelas");
      }

      setApiData(res.data);

      // Initialize decisions from server data
      const initDecisions = {};
      if (Array.isArray(res.data?.kelas)) {
        res.data.kelas.forEach((k) => {
          if (Array.isArray(k.siswa)) {
            k.siswa.forEach((s) => {
              initDecisions[s.siswa_id] = {
                keputusan: s.keputusan || (k.is_tingkat_akhir ? "Lulus" : "Naik"),
                catatan: s.catatan || "",
                sudah_direview: s.sudah_direview,
                initialKeputusan: s.keputusan || (k.is_tingkat_akhir ? "Lulus" : "Naik"),
                initialCatatan: s.catatan || "",
                modified: false,
              };
            });
          }
        });
      }
      setDecisions(initDecisions);
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(simulationUnlocked);
  }, [simulationUnlocked]);

  const currentClass = useMemo(() => {
    if (!apiData?.kelas || apiData.kelas.length === 0) return null;
    return apiData.kelas[activeClassIndex] || apiData.kelas[0];
  }, [apiData, activeClassIndex]);

  // Derived lock state
  const isLocked = useMemo(() => {
    if (simulationUnlocked) return false;
    return apiData?.is_locked ?? true;
  }, [simulationUnlocked, apiData]);

  // Check if any student has unsaved changes
  const hasChanges = useMemo(() => {
    return Object.values(decisions).some((d) => d.modified);
  }, [decisions]);

  const modifiedCount = useMemo(() => {
    return Object.values(decisions).filter((d) => d.modified).length;
  }, [decisions]);

  // Handle single student decision change
  const handleDecisionChange = (siswaId, newKeputusan) => {
    if (isLocked) return;
    setDecisions((prev) => {
      const current = prev[siswaId] || {};
      const isModified =
        newKeputusan !== current.initialKeputusan ||
        current.catatan !== current.initialCatatan;
      return {
        ...prev,
        [siswaId]: {
          ...current,
          keputusan: newKeputusan,
          modified: isModified,
        },
      };
    });
  };

  // Handle student note change
  const handleNoteChange = (siswaId, catatan) => {
    if (isLocked) return;
    setDecisions((prev) => {
      const current = prev[siswaId] || {};
      const isModified =
        current.keputusan !== current.initialKeputusan ||
        catatan !== current.initialCatatan;
      return {
        ...prev,
        [siswaId]: {
          ...current,
          catatan,
          modified: isModified,
        },
      };
    });
  };

  // Bulk mark for current class
  const handleBulkMark = (targetKeputusan) => {
    if (isLocked || !currentClass) return;
    setDecisions((prev) => {
      const updated = { ...prev };
      currentClass.siswa.forEach((s) => {
        const cur = updated[s.siswa_id] || {};
        const isModified =
          targetKeputusan !== cur.initialKeputusan ||
          cur.catatan !== cur.initialCatatan;
        updated[s.siswa_id] = {
          ...cur,
          keputusan: targetKeputusan,
          modified: isModified,
        };
      });
      return updated;
    });
  };

  // Reset all changes in current class
  const handleResetCurrentClass = () => {
    if (!currentClass) return;
    setDecisions((prev) => {
      const updated = { ...prev };
      currentClass.siswa.forEach((s) => {
        const cur = updated[s.siswa_id];
        if (cur) {
          updated[s.siswa_id] = {
            ...cur,
            keputusan: cur.initialKeputusan,
            catatan: cur.initialCatatan,
            modified: false,
          };
        }
      });
      return updated;
    });
  };

  // Submit decisions to backend
  const handleSubmitDecisions = async () => {
    if (isLocked) {
      setError("Aksi belum dibuka sebelum 1 bulan menjelang kenaikan kelas.");
      return;
    }
    if (!apiData?.tahun_ajaran_id || !currentClass) return;

    setSaving(true);
    setError("");
    setSuccessMsg("");
    setShowConfirmModal(false);

    try {
      // Build payload for all students in current class
      const payloadRows = currentClass.siswa.map((s) => {
        const d = decisions[s.siswa_id] || {};
        return {
          siswa_id: s.siswa_id,
          kelas_id: currentClass.kelas_id,
          keputusan: d.keputusan || (currentClass.is_tingkat_akhir ? "Lulus" : "Naik"),
          catatan: d.catatan || null,
        };
      });

      const params = simulationUnlocked ? "?simulate_unlocked=true" : "";
      const res = await kenaikanKelas.submit(
        {
          tahun_ajaran_id: apiData.tahun_ajaran_id,
          keputusan: payloadRows,
          simulate_unlocked: simulationUnlocked,
        },
        params
      );

      if (!res?.success) {
        throw new Error(res?.message || "Gagal menyimpan keputusan kenaikan kelas");
      }

      setSuccessMsg(res.message || "Keputusan kenaikan kelas berhasil disimpan!");
      // Reload server data to refresh review status
      await loadData(simulationUnlocked);
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  // Export current class decision table to Excel
  const handleExportExcel = async () => {
    if (!currentClass) return;
    try {
      const XLSX = await import("xlsx");
      const rows = currentClass.siswa.map((s, idx) => {
        const dec = decisions[s.siswa_id]?.keputusan || s.keputusan;
        const cat = decisions[s.siswa_id]?.catatan || s.catatan || "-";
        return {
          No: idx + 1,
          "Nama Siswa": s.nama,
          NISN: s.nisn || "-",
          NIPD: s.nipd || "-",
          "Jenis Kelamin": s.jenis_kelamin || "-",
          Kelas: `${currentClass.kelas} ${currentClass.jurusan || ""}`.trim(),
          "Tahun Ajaran": apiData?.tahun_ajaran || "-",
          "Keputusan Kenaikan": dec === "Naik" ? "Naik Kelas" : dec === "Tinggal" ? "Tinggal Kelas (Tidak Naik)" : "Lulus",
          "Catatan Walas": cat,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 26 },
        { wch: 35 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kenaikan Kelas");
      const filename = `Sortir_Kenaikan_${currentClass.kelas}_${currentClass.jurusan || ""}_${new Date().toISOString().slice(0, 10)}.xlsx`.replace(/\s+/g, "_");
      XLSX.writeFile(wb, filename);
    } catch (err) {
      setError("Gagal mendownload Excel: " + err.message);
    }
  };

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    if (!currentClass?.siswa) return [];
    let list = currentClass.siswa;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.nama?.toLowerCase().includes(q) ||
          s.nisn?.toLowerCase().includes(q) ||
          s.nipd?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "unreviewed") {
        list = list.filter((s) => !decisions[s.siswa_id]?.sudah_direview);
      } else {
        list = list.filter((s) => decisions[s.siswa_id]?.keputusan === statusFilter);
      }
    }

    return list;
  }, [currentClass, searchTerm, statusFilter, decisions]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!currentClass?.siswa) {
      return { total: 0, naik: 0, tinggal: 0, lulus: 0, reviewed: 0, tinggalList: [] };
    }
    let total = currentClass.siswa.length;
    let naik = 0;
    let tinggal = 0;
    let lulus = 0;
    let reviewed = 0;
    const tinggalList = [];

    currentClass.siswa.forEach((s) => {
      const dec = decisions[s.siswa_id]?.keputusan || s.keputusan;
      if (dec === "Naik") naik++;
      else if (dec === "Tinggal") {
        tinggal++;
        tinggalList.push(s);
      } else if (dec === "Lulus") lulus++;

      if (decisions[s.siswa_id]?.sudah_direview) reviewed++;
    });

    return { total, naik, tinggal, lulus, reviewed, tinggalList };
  }, [currentClass, decisions]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 min-h-screen">
      <PageHeader
        title="Sortir Kenaikan Kelas"
        subtitle="Penetapan status kenaikan kelas siswa"
      />

      <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">
                  {currentClass
                    ? `Kelas ${currentClass.kelas} ${currentClass.jurusan || ""}`
                    : "Data Kenaikan Kelas"}
                </h2>
                {apiData?.tahun_ajaran && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    TA {apiData.tahun_ajaran}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentClass?.walas?.nama ? `Wali Kelas: ${currentClass.walas.nama}` : "Pilih dan tetapkan status siswa"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimulationUnlocked((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                simulationUnlocked
                  ? "bg-amber-100 border-amber-300 text-amber-800 font-semibold"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="Toggle simulasi buka aksi untuk testing"
            >
              {simulationUnlocked ? "Simulasi: Buka Aksi" : "Waktu Riil"}
            </button>

            <button
              onClick={() => loadData(simulationUnlocked)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Lock Warning */}
        {isLocked ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Aksi belum dibuka.</strong> Pengisian keputusan baru dapat dilakukan mulai{" "}
                <span className="font-semibold underline decoration-amber-300">
                  {formatDateIndo(apiData?.batas_awal_aksi)}
                </span>{" "}
                (H-1 bulan kenaikan kelas).
              </span>
            </div>
            {apiData?.sisa_hari > 0 && (
              <span className="self-start sm:self-auto px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium text-[11px] whitespace-nowrap">
                {apiData.sisa_hari} hari lagi
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
            <div className="flex items-center gap-2.5">
              <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Periode pengisian aktif hingga <strong>{formatDateIndo(apiData?.tanggal_selesai)}</strong>.
              </span>
            </div>
            {simulationUnlocked && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium text-[11px]">
                Simulasi
              </span>
            )}
          </div>
        )}

        {/* Success or Error Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Perhatian</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="font-medium flex-1">{successMsg}</p>
            <button
              onClick={() => setSuccessMsg("")}
              className="text-emerald-500 hover:text-emerald-800 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Multi-Class Tabs (if walas handles more than 1 class) */}
        {apiData?.kelas && apiData.kelas.length > 1 && (
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Pilih Kelas:</span>
            {apiData.kelas.map((k, idx) => (
              <button
                key={k.kelas_id}
                onClick={() => setActiveClassIndex(idx)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  activeClassIndex === idx
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {k.kelas} {k.jurusan} ({k.total_siswa} Siswa)
              </button>
            ))}
          </div>
        )}

        {/* Statistical Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Siswa
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">{stats.total}</span>
              <span className="text-xs text-gray-500">siswa</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <span className="font-medium text-emerald-600">{stats.reviewed}</span> sudah ditinjau
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Naik Kelas
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">{stats.naik}</span>
              <span className="text-xs text-gray-500">
                ({stats.total > 0 ? Math.round((stats.naik / stats.total) * 100) : 0}%)
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Lanjut ke tingkat selanjutnya
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Tidak Naik Kelas
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600">{stats.tinggal}</span>
              <span className="text-xs text-gray-500">
                ({stats.total > 0 ? Math.round((stats.tinggal / stats.total) * 100) : 0}%)
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {stats.tinggal > 0 ? "Memerlukan catatan pertimbangan" : "Tidak ada siswa tinggal"}
            </div>
          </div>

          {currentClass?.is_tingkat_akhir ? (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Lulus
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-600">{stats.lulus}</span>
                <span className="text-xs text-gray-500">
                  ({stats.total > 0 ? Math.round((stats.lulus / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">Siswa tingkat XII</div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kelengkapan Review
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0}%
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{
                    width: `${stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter and Bulk Action Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa atau NISN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-gray-900 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Naik")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === "Naik"
                    ? "bg-white text-emerald-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Naik ({stats.naik})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Tinggal")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === "Tinggal"
                    ? "bg-white text-rose-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tinggal ({stats.tinggal})
              </button>
              {currentClass?.is_tingkat_akhir && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("Lulus")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === "Lulus"
                      ? "bg-white text-indigo-700 shadow-sm font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Lulus ({stats.lulus})
                </button>
              )}
            </div>
          </div>

          {/* Bulk Operations & Save Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold cursor-pointer transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>

            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleBulkMark(currentClass?.is_tingkat_akhir ? "Lulus" : "Naik")
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  Semua {currentClass?.is_tingkat_akhir ? "Lulus" : "Naik"}
                </button>

                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleResetCurrentClass}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-medium cursor-pointer transition"
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={saving || !hasChanges}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer ${
                    hasChanges
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving
                    ? "Menyimpan..."
                    : `Simpan Keputusan ${hasChanges ? `(${modifiedCount})` : ""}`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Students Decision Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase w-12 text-center">
                    No
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase min-w-[220px]">
                    Identitas Siswa
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase">
                    NISN / NIPD
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase text-center w-20">
                    Gender
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase min-w-[280px]">
                    Keputusan Kenaikan
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase min-w-[240px]">
                    Catatan Walas
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase text-center w-28">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="py-4 px-4">
                        <div className="h-5 bg-gray-100 rounded-lg w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto text-center">
                        <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-gray-700">
                          Tidak ada siswa yang cocok
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {searchTerm
                            ? `Pencarian "${searchTerm}" tidak ditemukan.`
                            : "Tidak ada siswa pada filter ini."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, index) => {
                    const dec = decisions[s.siswa_id] || {
                      keputusan: s.keputusan,
                      catatan: s.catatan || "",
                      modified: false,
                    };
                    const isNaik = dec.keputusan === "Naik";
                    const isTinggal = dec.keputusan === "Tinggal";
                    const isLulus = dec.keputusan === "Lulus";

                    return (
                      <tr
                        key={s.siswa_id}
                        className={`transition-colors hover:bg-gray-50/60 ${
                          isTinggal ? "bg-rose-50/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-xs text-gray-500 text-center font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900 text-sm">
                            {s.nama}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            ID: {s.siswa_id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 font-mono">
                          <div>NISN: {s.nisn || "-"}</div>
                          <div className="text-gray-400">NIPD: {s.nipd || "-"}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              s.jenis_kelamin === "L"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-pink-100 text-pink-700"
                            }`}
                          >
                            {s.jenis_kelamin || "-"}
                          </span>
                        </td>

                        {/* Keputusan Buttons (Naik / Tinggal / Lulus) */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                            {currentClass?.is_tingkat_akhir ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleDecisionChange(s.siswa_id, "Lulus")}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isLulus
                                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                                      : "text-gray-600 hover:text-gray-900"
                                  } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  Lulus
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleDecisionChange(s.siswa_id, "Tinggal")}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isTinggal
                                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                                      : "text-gray-600 hover:text-gray-900"
                                  } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Tidak Lulus
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleDecisionChange(s.siswa_id, "Naik")}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isNaik
                                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                                      : "text-gray-600 hover:text-gray-900"
                                  } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  Naik Kelas
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleDecisionChange(s.siswa_id, "Tinggal")}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isTinggal
                                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                                      : "text-gray-600 hover:text-gray-900"
                                  } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Tinggal Kelas
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Catatan Field */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder={
                              isTinggal
                                ? "Wajib masukkan alasan tinggal kelas..."
                                : "Catatan walas (opsional)..."
                            }
                            value={dec.catatan}
                            onChange={(e) => handleNoteChange(s.siswa_id, e.target.value)}
                            className={`w-full text-xs px-3 py-1.5 rounded-xl border transition focus:outline-none focus:ring-2 ${
                              isTinggal && !dec.catatan
                                ? "border-rose-300 bg-rose-50/50 focus:ring-rose-400 placeholder:text-rose-400"
                                : "border-gray-200 bg-gray-50 focus:ring-blue-500 focus:bg-white"
                            } ${isLocked ? "cursor-not-allowed opacity-75" : ""}`}
                          />
                        </td>

                        {/* Review Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {dec.modified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                              Diubah
                            </span>
                          ) : s.sudah_direview ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Tersimpan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">
                              Belum Disimpan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer of Table */}
          <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
            <div>
              Menampilkan {filteredStudents.length} dari {currentClass?.siswa?.length || 0} siswa
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Naik Kelas: {stats.naik}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Tinggal Kelas: {stats.tinggal}
              </span>
              {currentClass?.is_tingkat_akhir && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Lulus: {stats.lulus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Saving */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                <Save className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Simpan Keputusan Kenaikan Kelas?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pastikan status kenaikan siswa sudah sesuai sebelum disimpan.
                </p>
              </div>
            </div>

            {/* Warning if there are students marked as 'Tinggal' */}
            {stats.tinggal > 0 && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{stats.tinggal} siswa berstatus Tinggal Kelas:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-700 text-[11px]">
                  {stats.tinggalList.map((s) => (
                    <li key={s.siswa_id}>
                      <strong>{s.nama}</strong>: {decisions[s.siswa_id]?.catatan || "Tanpa catatan"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 py-3 border-y border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>Kelas: <strong>{currentClass?.kelas} {currentClass?.jurusan}</strong></span>
              <span>Total Diperbarui: <strong>{currentClass?.siswa?.length} Siswa</strong></span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitDecisions}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Menyimpan..." : "Ya, Simpan Keputusan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
