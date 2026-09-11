import React, { useState, useEffect, useMemo } from "react";
import { jadwal, guru, kelas, mapel, auth } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader";
import {
  HARI_ORDER,
  formatTimeForInput,
  exportJadwalToExcel,
  downloadJadwalTemplate,
  downloadJadwalUpdateTemplate,
} from "./jadwal/jadwalUtils";
import JadwalTable from "./jadwal/JadwalTable";
import JadwalFormModal from "./jadwal/JadwalFormModal";
import JadwalDeleteModal from "./jadwal/JadwalDeleteModal";
import JadwalImportModal from "./jadwal/JadwalImportModal";
import JadwalToast from "./jadwal/JadwalToast";

export default function DaftarJadwal() {
  const [jadwalList, setJadwalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKelasFilter, setSelectedKelasFilter] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const [guruList, setGuruList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [mapelList, setMapelList] = useState([]);

  const [selectedJadwal, setSelectedJadwal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newJadwal, setNewJadwal] = useState({
    hari: "Senin",
    kelas_id: "",
    mapel_id: "",
    guru_id: "",
    jam_mulai: "07:00",
    jam_selesai: "08:00",
  });

  const [editJadwalData, setEditJadwalData] = useState({
    id: null,
    hari: "Senin",
    kelas_id: "",
    mapel_id: "",
    guru_id: "",
    jam_mulai: "07:00",
    jam_selesai: "08:00",
  });

  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [canManageJadwal, setCanManageJadwal] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const sortJadwal = (list) =>
    [...list].sort((a, b) => {
      const hariDiff = HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari);
      if (hariDiff !== 0) return hariDiff;
      return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
    });

  // Check user role permission
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await auth.me();
        if (res?.success && res?.data?.roles) {
          const roles = res.data.roles.map((r) => r.name.toUpperCase());
          const hasAccess = roles.some((r) =>
            ["SUPER_ADMIN", "SUPERADMIN", "KESISWAAN"].includes(r)
          );
          setCanManageJadwal(hasAccess);
        }
      } catch (e) {
        // console.error(e);
      }
    };
    fetchUserRole();
  }, []);

  // Initial fetch for jadwal and kelas
  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        const res = await jadwal.list("limit=100");
        if (res.success && res.data) {
          setJadwalList(sortJadwal(res.data));
        }
      } catch (e) {
        console.error("Failed to fetch schedules", e);
      } finally {
        setLoading(false);
      }
    };

    const fetchKelas = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success) setKelasList(res.data);
      } catch (e) {
        console.error("Failed to fetch kelas", e);
      }
    };

    fetchJadwal();
    fetchKelas();
  }, []);

  const fetchDataForCreate = async () => {
    try {
      const [resGuru, resKelas, resMapel] = await Promise.all([
        guru.list("limit=100"),
        kelas.list("limit=100"),
        mapel.list("limit=100"),
      ]);
      if (resGuru.success) setGuruList(resGuru.data);
      if (resKelas.success) setKelasList(resKelas.data);
      if (resMapel.success) setMapelList(resMapel.data);
    } catch (e) {
      console.error("Failed to fetch data for create", e);
    }
  };

  // Filtered schedules
  const filteredJadwal = useMemo(() => {
    return jadwalList.filter((item) => {
      const matchSearch =
        item.hari?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mata_pelajaran?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.jurusan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guru?.nama?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchKelas = selectedKelasFilter
        ? String(item.kelas?.id) === String(selectedKelasFilter)
        : true;

      return matchSearch && matchKelas;
    });
  }, [jadwalList, searchTerm, selectedKelasFilter]);

  const totalPagesCount = Math.ceil(filteredJadwal.length / itemsPerPage);

  const currentPageData = useMemo(() => {
    return filteredJadwal.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredJadwal, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedKelasFilter]);

  // Export Data
  const handleExportData = async () => {
    if (filteredJadwal.length === 0) {
      showNotification("Tidak ada data untuk diekspor", "error");
      return;
    }
    try {
      await exportJadwalToExcel(filteredJadwal);
      showNotification("Data jadwal berhasil diekspor");
    } catch (e) {
      console.error("Export error", e);
      showNotification("Gagal mengekspor data", "error");
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      await downloadJadwalTemplate();
      showNotification("Template berhasil diunduh");
    } catch (e) {
      console.error("Download template error", e);
      showNotification("Gagal mengunduh template", "error");
    }
  };

  // Download Update Template
  const handleDownloadUpdateTemplate = async () => {
    try {
      await downloadJadwalUpdateTemplate(filteredJadwal);
      showNotification("Template update berhasil diunduh");
    } catch (e) {
      console.error("Download template update error", e);
      showNotification("Gagal mengunduh template update", "error");
    }
  };

  // Create Manual
  const handleCreateManual = () => {
    setShowCreateMenu(false);
    fetchDataForCreate();
    setShowCreateModal(true);
  };

  const handleSaveNewJadwal = async () => {
    if (!newJadwal.kelas_id || !newJadwal.mapel_id || !newJadwal.guru_id) {
      showNotification("Harap isi semua field yang wajib", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await jadwal.create({
        ...newJadwal,
        kelas_id: parseInt(newJadwal.kelas_id),
        mapel_id: parseInt(newJadwal.mapel_id),
        guru_id: parseInt(newJadwal.guru_id),
      });
      if (res.success) {
        const refreshed = await jadwal.list("limit=100");
        if (refreshed?.success && refreshed.data) {
          setJadwalList(sortJadwal(refreshed.data));
        }
        setShowCreateModal(false);
        setNewJadwal({
          hari: "Senin",
          kelas_id: "",
          mapel_id: "",
          guru_id: "",
          jam_mulai: "07:00",
          jam_selesai: "08:00",
        });
        showNotification("Jadwal baru berhasil dibuat");
      } else {
        showNotification(res.message || "Gagal membuat jadwal baru", "error");
      }
    } catch (e) {
      console.error("Error creating jadwal", e);
      showNotification("Terjadi kesalahan saat membuat jadwal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Jadwal
  const handleEditJadwal = (item) => {
    fetchDataForCreate();
    setEditJadwalData({
      id: item.id,
      hari: item.hari || "Senin",
      kelas_id: String(item.kelas?.id || ""),
      mapel_id: String(item.mata_pelajaran?.id || ""),
      guru_id: String(item.guru?.id || ""),
      jam_mulai: formatTimeForInput(item.jam_mulai),
      jam_selesai: formatTimeForInput(item.jam_selesai),
    });
    setShowEditModal(true);
  };

  const handleSaveEditJadwal = async () => {
    if (!editJadwalData.kelas_id || !editJadwalData.mapel_id || !editJadwalData.guru_id) {
      showNotification("Harap isi semua field yang wajib", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await jadwal.update(editJadwalData.id, {
        hari: editJadwalData.hari,
        kelas_id: parseInt(editJadwalData.kelas_id),
        mapel_id: parseInt(editJadwalData.mapel_id),
        guru_id: parseInt(editJadwalData.guru_id),
        jam_mulai: editJadwalData.jam_mulai,
        jam_selesai: editJadwalData.jam_selesai,
      });
      if (res.success) {
        const refreshed = await jadwal.list("limit=100");
        if (refreshed?.success && refreshed.data) {
          setJadwalList(sortJadwal(refreshed.data));
        }
        setShowEditModal(false);
        showNotification("Jadwal berhasil diperbarui");
      } else {
        showNotification(res.message || "Gagal memperbarui jadwal", "error");
      }
    } catch (e) {
      console.error("Error updating jadwal", e);
      showNotification("Terjadi kesalahan saat memperbarui jadwal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Jadwal
  const handleDeleteJadwal = (item) => {
    setSelectedJadwal(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteJadwal = async () => {
    if (!selectedJadwal) return;
    setIsSubmitting(true);
    try {
      const res = await jadwal.delete(selectedJadwal.id);
      if (res.success) {
        setJadwalList((prev) => prev.filter((item) => item.id !== selectedJadwal.id));
        setShowDeleteModal(false);
        setSelectedJadwal(null);
        showNotification("Jadwal berhasil dihapus");
      } else {
        showNotification(res.message || "Gagal menghapus jadwal", "error");
      }
    } catch (e) {
      console.error("Error deleting jadwal", e);
      showNotification("Terjadi kesalahan saat menghapus jadwal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import XLSX
  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsSubmitting(true);
    try {
      const res = await jadwal.importXlsx(importFile);
      if (res?.success) {
        const refreshed = await jadwal.list("limit=100");
        if (refreshed?.success && refreshed.data) {
          setJadwalList(sortJadwal(refreshed.data));
        }
        setImportResult(res.data);
      } else {
        showNotification(res?.message || "Gagal mengimport jadwal", "error");
        setShowImportModal(false);
        setImportFile(null);
      }
    } catch (e) {
      console.error("Import error", e);
      showNotification("Terjadi kesalahan saat import", "error");
      setShowImportModal(false);
      setImportFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader
        title="Manajemen Jadwal Pelajaran"
        subtitle="Atur waktu, mata pelajaran, dan penugasan kelas"
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <JadwalTable
          jadwalList={jadwalList}
          filteredJadwal={filteredJadwal}
          currentPageData={currentPageData}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedKelasFilter={selectedKelasFilter}
          setSelectedKelasFilter={setSelectedKelasFilter}
          kelasList={kelasList}
          page={page}
          setPage={setPage}
          totalPagesCount={totalPagesCount}
          canManageJadwal={canManageJadwal}
          showCreateMenu={showCreateMenu}
          setShowCreateMenu={setShowCreateMenu}
          onExportData={handleExportData}
          onCreateManual={handleCreateManual}
          onOpenImportModal={() => setShowImportModal(true)}
          onEditJadwal={handleEditJadwal}
          onDeleteJadwal={handleDeleteJadwal}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-1 px-1">
          <p>
            Total {filteredJadwal.length} sesi jadwal ditemukan
            {selectedKelasFilter && kelasList.find((k) => String(k.id) === String(selectedKelasFilter))
              ? ` — ${kelasList.find((k) => String(k.id) === String(selectedKelasFilter))?.kelas} ${kelasList.find((k) => String(k.id) === String(selectedKelasFilter))?.jurusan}`
              : ""}.
          </p>
        </div>
      </div>

      {/* ── Modal Tambah Jadwal ──────────────────────────────────────── */}
      <JadwalFormModal
        isOpen={showCreateModal}
        isEdit={false}
        formData={newJadwal}
        setFormData={setNewJadwal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSaveNewJadwal}
        isSubmitting={isSubmitting}
        kelasList={kelasList}
        mapelList={mapelList}
        guruList={guruList}
      />

      {/* ── Modal Edit Jadwal ────────────────────────────────────────── */}
      <JadwalFormModal
        isOpen={showEditModal}
        isEdit={true}
        formData={editJadwalData}
        setFormData={setEditJadwalData}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleSaveEditJadwal}
        isSubmitting={isSubmitting}
        kelasList={kelasList}
        mapelList={mapelList}
        guruList={guruList}
      />

      {/* ── Modal Hapus Jadwal ───────────────────────────────────────── */}
      <JadwalDeleteModal
        isOpen={showDeleteModal}
        selectedJadwal={selectedJadwal}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedJadwal(null);
        }}
        onConfirm={confirmDeleteJadwal}
        isSubmitting={isSubmitting}
      />

      {/* ── Modal Import Jadwal ──────────────────────────────────────── */}
      <JadwalImportModal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
        importFile={importFile}
        setImportFile={setImportFile}
        importResult={importResult}
        onDownloadTemplate={handleDownloadTemplate}
        onDownloadUpdateTemplate={handleDownloadUpdateTemplate}
        onImportSubmit={handleImportSubmit}
        isSubmitting={isSubmitting}
      />

      {/* ── Notification Toast ───────────────────────────────────────── */}
      <JadwalToast notification={notification} />
    </main>
  );
}