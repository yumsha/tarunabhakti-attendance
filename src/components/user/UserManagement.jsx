import { useState, useEffect, useCallback } from "react";
import { users, auth, guru as guruApi } from "../../lib/backendApi";

import UserPageHeader from "./UserPageHeader";
import UserTable from "./UserTable";
import UserFormModal from "./UserFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

// Toast 
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        toast.type === "error"
          ? "bg-red-600 text-white"
          : "bg-emerald-600 text-white"
      }`}
    >
      {toast.message}
    </div>
  );
}

// Main Orchestrator
export default function UserManagement() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 10,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // modal states
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await users.list();
      if (res.success) {
        setUserList(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showToast("Gagal memuat data user", "error");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter
  const filteredUsers = userList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.guru?.nama || "").toLowerCase().includes(q)
    );
  });

  // Create / Update
  const handleSubmit = async (payload, userId, guruData, existingGuruId) => {
    if (userId) {
      // UPDATE
      if (guruData && existingGuruId) {
        const guruRes = await guruApi.update(existingGuruId, guruData);
        if (!guruRes.success)
          throw new Error(guruRes.message || "Gagal mengupdate data guru");
        payload.guru_id = existingGuruId;
      } else if (guruData && !existingGuruId) {
        const guruRes = await guruApi.create(guruData);
        if (!guruRes.success)
          throw new Error(guruRes.message || "Gagal membuat data guru");
        payload.guru_id = guruRes.data?.id;
      }
      const res = await users.update(userId, payload);
      if (!res.success) throw new Error(res.message || "Gagal mengupdate user");
      showToast("User berhasil diperbarui");
    } else {
      // CREATE
      if (guruData) {
        const guruListRes = await guruApi.list();
        const existingGuru =
          guruListRes.success &&
          Array.isArray(guruListRes.data) &&
          guruListRes.data.find((g) => g.NIP === guruData.NIP);

        if (existingGuru) {
          payload.guru_id = existingGuru.id;
        } else {
          const guruRes = await guruApi.create(guruData);
          if (!guruRes.success)
            throw new Error(guruRes.message || "Gagal membuat data guru");
          payload.guru_id = guruRes.data?.id;
        }
      }
      const res = await auth.register(payload);
      if (!res.success) throw new Error(res.message || "Gagal menambah user");
      showToast("User baru berhasil ditambahkan");
    }
    fetchUsers();
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await users.delete(deleteTarget.id);
      if (res.success) {
        showToast("User berhasil dihapus");
        fetchUsers();
      } else {
        showToast(res.message || "Gagal menghapus user", "error");
      }
    } catch {
      showToast("Gagal menghapus user", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Handlers
  const handleAdd = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditUser(null);
  };

  // Render
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Header row — title + profile avatar */}
      <UserPageHeader />

      {/* Content area */}
      <div className="flex-1 overflow-auto p-8">
        <UserTable
          users={filteredUsers}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        editUser={editUser}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        userName={deleteTarget?.email}
        deleting={deleting}
      />

      {/* Toast notification */}
      <Toast toast={toast} />
    </div>
  );
}
