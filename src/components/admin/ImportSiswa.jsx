import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import { siswa, kelas } from "../../lib/backendApi";
import SiswaTable from "./siswa/SiswaTable.jsx";
import SiswaAddModal from "./siswa/SiswaAddModal.jsx";
import SiswaEditModal from "./siswa/SiswaEditModal.jsx";
import SiswaDeleteModal from "./siswa/SiswaDeleteModal.jsx";
import SiswaImportModal from "./siswa/SiswaImportModal.jsx";
import SiswaUpdateModal from "./siswa/SiswaUpdateModal.jsx";
import SiswaToast from "./siswa/SiswaToast.jsx";

export default function ImportSiswa() {
  const [pageStudents, setPageStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchKelas = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success && res.data) setKelasList(res.data);
      } catch (err) {
        console.error("Error fetching kelas:", err);
      }
    };
    fetchKelas();
  }, []);

  const fetchPageStudents = async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (
        user?.userRole?.[0]?.role?.name || user?.role?.name || user?.role || ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;
      const queryParams = {
        page: targetPage.toString(),
        limit: itemsPerPage.toString(),
      };
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
      if (selectedKelas) queryParams.kelas_id = selectedKelas;
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await siswa.list(queryString);
      if (res.success) {
        setPageStudents(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.total || 0);
        }
      } else {
        setError(res.message || "Gagal memuat data siswa");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudentsBackground = async () => {
    setBackgroundLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (
        user?.userRole?.[0]?.role?.name || user?.role?.name || user?.role || ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;
      const queryParams = {
        limit: "9999",
      };
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await siswa.list(queryString);
      if (res.success && Array.isArray(res.data)) {
        setAllStudents(res.data);
      }
    } catch {
      console.warn("Background fetch siswa failed");
    } finally {
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchPageStudents(page);
  }, [page, selectedKelas, itemsPerPage]);

  useEffect(() => {
    fetchAllStudentsBackground();
  }, []);

  const filteredStudents = useMemo(() => {
    let filtered = allStudents;
    if (selectedKelas) filtered = filtered.filter((s) => s.kelas_id === parseInt(selectedKelas));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) =>
        s.nama?.toLowerCase().includes(q) ||
        (s.nisn || s.NISN || "").toLowerCase().includes(q) ||
        (s.nipd || s.NIPD || "").toLowerCase().includes(q) ||
        (s.nik || s.NIK || "").toLowerCase().includes(q) ||
        s.nomor_telepon?.toLowerCase().includes(q) ||
        s.orang_tua?.nama_orangtua?.toLowerCase().includes(q) ||
        (s.kelas && `${s.kelas.kelas} ${s.kelas.jurusan || ""}`.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allStudents, selectedKelas, searchQuery]);

  const totalPagesCount = useMemo(() => {
    if (searchQuery.trim()) {
      const newTotal = Math.ceil(filteredStudents.length / itemsPerPage);
      return newTotal === 0 ? 1 : newTotal;
    }
    return totalPages;
  }, [filteredStudents, searchQuery, totalPages, itemsPerPage]);

  useEffect(() => {
    if (page > totalPagesCount) setPage(1);
  }, [totalPagesCount, page]);

  const currentPageData = useMemo(() => {
    if (searchQuery.trim()) {
      const start = (page - 1) * itemsPerPage;
      return filteredStudents.slice(start, start + itemsPerPage);
    }
    return pageStudents;
  }, [filteredStudents, page, pageStudents, searchQuery, itemsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [selectedKelas, searchQuery, itemsPerPage]);

  const refreshData = () => {
    fetchPageStudents(page);
    fetchAllStudentsBackground();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Data Siswa" subtitle="Kelola data siswa & import massal" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="flex items-center gap-2 p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SiswaTable
          loading={loading}
          backgroundLoading={backgroundLoading}
          pageStudents={pageStudents}
          allStudents={allStudents}
          filteredStudents={filteredStudents}
          currentPageData={currentPageData}
          totalRecords={totalRecords}
          kelasList={kelasList}
          selectedKelas={selectedKelas}
          onKelasChange={setSelectedKelas}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          page={page}
          setPage={setPage}
          totalPagesCount={totalPagesCount}
          onAddManual={() => setShowAddModal(true)}
          onOpenImportModal={() => setShowImportModal(true)}
          onOpenUpdateModal={() => setShowUpdateModal(true)}
          onEditSiswa={(student) => setEditTarget(student)}
          onDeleteSiswa={(student) => setDeleteTarget(student)}
        />
      </div>

      {showImportModal && (
        <SiswaImportModal
          onClose={() => setShowImportModal(false)}
          onImportDone={refreshData}
          kelasList={kelasList}
        />
      )}

      {showUpdateModal && (
        <SiswaUpdateModal
          onClose={() => setShowUpdateModal(false)}
          onUpdateDone={refreshData}
          kelasList={kelasList}
        />
      )}

      {showAddModal && (
        <SiswaAddModal
          kelasList={kelasList}
          onClose={() => setShowAddModal(false)}
          onAdded={(nama) => {
            setShowAddModal(false);
            refreshData();
            setToast({ type: "success", message: `Siswa "${nama}" berhasil ditambahkan` });
          }}
        />
      )}

      {editTarget && (
        <SiswaEditModal
          student={editTarget}
          kelasList={kelasList}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            setEditTarget(null);
            refreshData();
            setToast({ type: "success", message: `Data siswa "${editTarget.nama}" berhasil diperbarui` });
          }}
        />
      )}

      {deleteTarget && (
        <SiswaDeleteModal
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            refreshData();
            setToast({ type: "success", message: `Siswa "${deleteTarget.nama}" berhasil dihapus` });
          }}
        />
      )}

      <SiswaToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}