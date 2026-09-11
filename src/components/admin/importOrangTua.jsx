import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "../layout/PageHeader.jsx";
import { orangTua } from "../../lib/backendApi.js";
import OrtuTable from "./orangTua/OrtuTable.jsx";
import OrtuFormModal from "./orangTua/OrtuFormModal.jsx";
import OrtuDeleteModal from "./orangTua/OrtuDeleteModal.jsx";
import OrtuImportModal from "./orangTua/OrtuImportModal.jsx";
import OrtuUpdateModal from "./orangTua/OrtuUpdateModal.jsx";
import OrtuToast from "./orangTua/OrtuToast.jsx";

let ortuCache = null;

export default function AdminImport() {
  const [pageData, setPageData] = useState([]);
  const [allData, setAllData] = useState(() => ortuCache || []);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(!ortuCache);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toast, setToast] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchPageData = async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: itemsPerPage.toString(),
      });
      const res = await orangTua.list(queryParams.toString());
      if (res.success) {
        setPageData(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.total || 0);
        }
      } else {
        setError(res.message || "Gagal memuat data orang tua");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDataBackground = async () => {
    setBackgroundLoading(true);
    try {
      const res = await orangTua.list("limit=9999");
      if (res.success) {
        ortuCache = res.data;
        setAllData(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat data background:", err);
    } finally {
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData(page);
  }, [page]);

  useEffect(() => {
    fetchAllDataBackground();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const searchableData = useMemo(() => {
    return allData.map((item) => ({
      ...item,
      __search: [
        item.nama_orangtua,
        item.NIK,
        item.nomor_telepon,
        item.pekerjaan,
        item.alamat,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));
  }, [allData]);

  const filteredData = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return searchableData;
    return searchableData.filter((item) => item.__search.includes(q));
  }, [searchableData, debouncedSearch]);

  const totalPagesCount = useMemo(() => {
    if (debouncedSearch.trim()) {
      const t = Math.ceil(filteredData.length / itemsPerPage);
      return t === 0 ? 1 : t;
    }
    return totalPages;
  }, [filteredData, debouncedSearch, totalPages]);

  useEffect(() => {
    if (page > totalPagesCount) setPage(1);
  }, [totalPagesCount, page]);

  const currentPageData = useMemo(() => {
    if (debouncedSearch.trim()) {
      const start = (page - 1) * itemsPerPage;
      return filteredData.slice(start, start + itemsPerPage);
    }
    return pageData;
  }, [filteredData, page, pageData, debouncedSearch]);

  const refreshData = () => {
    fetchPageData(page);
    fetchAllDataBackground();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Data Orang Tua"
        subtitle="Kelola data orang tua & import massal"
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        <OrtuTable
          pageData={pageData}
          allData={allData}
          filteredData={filteredData}
          currentPageData={currentPageData}
          loading={loading}
          backgroundLoading={backgroundLoading}
          totalRecords={totalRecords}
          page={page}
          setPage={setPage}
          totalPagesCount={totalPagesCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          onAddManual={() => setShowAddModal(true)}
          onOpenImportModal={() => setShowImportModal(true)}
          onOpenUpdateModal={() => setShowUpdateModal(true)}
          onEditOrtu={(o) => setEditTarget(o)}
          onDeleteOrtu={(o) => setDeleteTarget(o)}
        />
      </div>

      {/* Modal Tambah Mandiri */}
      <OrtuFormModal
        isOpen={showAddModal}
        isEdit={false}
        onClose={() => setShowAddModal(false)}
        onSuccess={(nama) => {
          setShowAddModal(false);
          refreshData();
          setToast({
            type: "success",
            message: `Orang tua "${nama}" berhasil ditambahkan`,
          });
        }}
      />

      {/* Modal Edit */}
      <OrtuFormModal
        isOpen={!!editTarget}
        isEdit={true}
        ortu={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={(nama) => {
          setEditTarget(null);
          refreshData();
          setToast({
            type: "success",
            message: `Data orang tua "${nama}" berhasil diperbarui`,
          });
        }}
      />

      {/* Modal Hapus */}
      <OrtuDeleteModal
        ortu={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          const nama = deleteTarget?.nama_orangtua;
          setDeleteTarget(null);
          refreshData();
          setToast({
            type: "success",
            message: `Orang tua "${nama}" berhasil dihapus`,
          });
        }}
      />

      {/* Modal Import Excel */}
      <OrtuImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportDone={refreshData}
      />

      {/* Modal Update Excel */}
      <OrtuUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onUpdateDone={refreshData}
        ortuList={allData}
      />

      {/* Toast Notification */}
      <OrtuToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}