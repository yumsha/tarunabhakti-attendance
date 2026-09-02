import React, { useEffect, useState, useCallback, useRef } from "react";
import PageHeader from "../layout/PageHeader";
import { mapel as mapelApi } from "../../lib/backendApi";
import MapelTable from "./mapel/MapelTable";
import MapelFormModal from "./mapel/MapelFormModal";
import MapelDeleteModal from "./mapel/MapelDeleteModal";
import MapelToast from "./mapel/MapelToast";

export default function MapelManagement() {
  const [mapels, setMapels] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const pageSize = 10;

  const [showModal, setShowModal] = useState(false);
  const [editMapel, setEditMapel] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  // Fetch all mapel
  const fetchAll = useCallback(async () => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const res = await mapelApi.list();
      setMapels(res?.data ?? []);
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data mata pelajaran");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filter search
  const filtered = mapels.filter((m) =>
    m.nama_mapel?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedMapels = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Create / Update
  const handleSubmitMapel = async (namaMapel) => {
    setSubmitLoading(true);
    try {
      if (editMapel) {
        const res = await mapelApi.update(editMapel.id, { nama_mapel: namaMapel });
        if (res?.success === false) {
          throw new Error(res.message || "Gagal memperbarui mata pelajaran");
        }
        showToast("Mata pelajaran berhasil diperbarui");
      } else {
        const res = await mapelApi.create({ nama_mapel: namaMapel });
        if (res?.success === false) {
          throw new Error(res.message || "Gagal menambahkan mata pelajaran");
        }
        showToast("Mata pelajaran berhasil ditambahkan");
      }
      await fetchAll();
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const targetId = confirmDelete.id;
    setDeleteLoading(true);
    setConfirmDelete(null);
    try {
      const res = await mapelApi.delete(targetId);
      if (res?.success === false) {
        showToast(res.message || "Gagal menghapus mata pelajaran", "error");
      } else {
        showToast("Mata pelajaran berhasil dihapus");
        await fetchAll();
      }
    } catch (err) {
      showToast(err.message || "Gagal menghapus mata pelajaran", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/60">
      {/* Header */}
      <PageHeader
        title="Manajemen Mata Pelajaran"
        subtitle="Kelola daftar mata pelajaran yang tersedia dalam sistem."
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <MapelTable
          mapels={mapels}
          filteredMapels={filtered}
          pagedMapels={pagedMapels}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setPage}
          search={search}
          onSearchChange={setSearch}
          searchRef={searchRef}
          fetchLoading={fetchLoading}
          fetchError={fetchError}
          onRetry={fetchAll}
          onAddMapel={() => {
            setEditMapel(null);
            setShowModal(true);
          }}
          onEditMapel={(mapel) => {
            setEditMapel(mapel);
            setShowModal(true);
          }}
          onDeleteMapel={(mapel) => {
            setConfirmDelete(mapel);
          }}
        />
      </div>

      {/* Modals & Toast */}
      <MapelFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmitMapel}
        editMapel={editMapel}
        loading={submitLoading}
      />

      <MapelDeleteModal
        isOpen={!!confirmDelete}
        mapel={confirmDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteLoading}
      />

      {toast && (
        <MapelToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
