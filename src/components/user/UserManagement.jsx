import { useState, useEffect, useCallback, useMemo } from "react";
import { users, auth, guru as guruApi, role as roleApi } from "../../lib/backendApi";

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

// role normalize
function normalizeUser(raw) {
  if (!raw) return raw;
  const fromRoles = Array.isArray(raw?.roles)
    ? raw.roles.map((r) => r?.name).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(raw?.role_names) ? raw.role_names : [];
  const fromRoleObj = raw?.role?.name ? [raw.role.name] : [];
  const fromRoleStr = typeof raw?.role === "string" ? [raw.role] : [];

  const userRole = raw.userRole;
  const fromUserRole = Array.isArray(userRole)
    ? userRole.map((ur) => ur?.role?.name ?? ur?.role).filter(Boolean)
    : userRole?.role?.name
      ? [userRole.role.name]
      : userRole?.role
        ? [userRole.role]
        : [];

  const merged = [
    ...fromRoles,
    ...fromRoleNames,
    ...fromRoleObj,
    ...fromRoleStr,
    ...fromUserRole,
  ]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase())
    .map((r) => (r === "WALI KELAS" ? "WALAS" : r));

  const roles = Array.from(new Set(merged));
  const primaryRole = roles[0] ?? "UNKNOWN";

  return {
    ...raw,
    roles,
    role: raw.role ?? raw.role_names ?? primaryRole,
  };
}

/** Saat GET /role gagal (mis. bukan superadmin), dropdown tetap punya pilihan dasar. */
const FALLBACK_ROLE_OPTIONS = ["ADMIN", "GURU", "WALAS", "KESISWAAN", "SUPER ADMIN"];

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
  const [roleFilter, setRoleFilter] = useState("");

  // modal states
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // toast
  const [toast, setToast] = useState(null);

  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await roleApi.list();
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setRoleOptions(res.data.filter((r) => r?.name).map((r) => ({ id: r.id, name: r.name })));
        } else {
          setRoleOptions(FALLBACK_ROLE_OPTIONS.map((name) => ({ id: null, name })));
        }
      } catch {
        if (!cancelled) setRoleOptions(FALLBACK_ROLE_OPTIONS.map((name) => ({ id: null, name })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const roleFilterTrimmed = roleFilter.trim();
  const needsClientFilter = !!normalizedQuery || !!roleFilterTrimmed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fr = params.get("filterRole");
    if (fr) setRoleFilter(fr);
  }, []);

  const clearRoleFilter = () => {
    setRoleFilter("");
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("filterRole");
    const next = url.pathname + (url.search || "");
    window.history.replaceState({}, "", next || url.pathname);
  };

  // Fetch
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Saat filter pencarian atau role di klien, ambil banyak baris sekali lalu slice lokal.
      const effectivePage = needsClientFilter ? 1 : page;
      const effectiveLimit = needsClientFilter ? 10000 : pagination.limit;
      const res = await users.list(`page=${effectivePage}&limit=${effectiveLimit}`);
      if (res.success) {
        const normalized = (res.data || []).map(normalizeUser);
        setUserList(normalized);
        if (!needsClientFilter && res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showToast("Gagal memuat data user", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit, needsClientFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter]);

  const filteredUsers = useMemo(() => {
    let rows = userList;
    if (roleFilterTrimmed) {
      const target = roleFilterTrimmed.toUpperCase();
      rows = rows.filter((u) =>
        (u.roles || []).some((r) => String(r).trim().toUpperCase() === target)
      );
    }
    if (normalizedQuery) {
      rows = rows.filter((u) => {
        return (
          (u.email || "").toLowerCase().includes(normalizedQuery) ||
          (u.guru?.nama || "").toLowerCase().includes(normalizedQuery) ||
          (u.guru?.NIP || "").toLowerCase().includes(normalizedQuery)
        );
      });
    }
    return rows;
  }, [userList, roleFilterTrimmed, normalizedQuery]);

  useEffect(() => {
    if (!needsClientFilter) return;
    setPagination((p) => ({
      ...p,
      total: filteredUsers.length,
      totalPages: Math.max(1, Math.ceil(filteredUsers.length / p.limit)),
    }));
  }, [needsClientFilter, filteredUsers.length, pagination.limit]);

  const pagedUsers = useMemo(() => {
    if (needsClientFilter) {
      return filteredUsers.slice(
        (page - 1) * pagination.limit,
        (page - 1) * pagination.limit + pagination.limit
      );
    }
    return userList;
  }, [needsClientFilter, filteredUsers, page, pagination.limit, userList]);

  // Create / Update
  const handleSubmit = async (payload, userId, guruData, existingGuruId) => {
    if (userId) {
      // UPDATE
      if (guruData && existingGuruId) {
        const guruRes = await guruApi.update(existingGuruId, guruData);
        if (!guruRes.success)
          throw new Error(guruRes.message || "Gagal mengupdate data guru");
        payload.guru_id = Number(existingGuruId);
      } else if (guruData && !existingGuruId) {
        const guruRes = await guruApi.create(guruData);
        if (!guruRes.success)
          throw new Error(guruRes.message || "Gagal membuat data guru");
        payload.guru_id = Number(guruRes.data?.id);
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
          payload.guru_id = Number(existingGuru.id);
        } else {
          const guruRes = await guruApi.create(guruData);
          if (!guruRes.success)
            throw new Error(guruRes.message || "Gagal membuat data guru");
          payload.guru_id = Number(guruRes.data?.id);
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
    (async () => {
      setLoading(true);
      try {
        const res = await users.get(user.id);
        if (!res?.success) {
          throw new Error(res?.message || "Gagal memuat detail user");
        }
        setEditUser(normalizeUser(res.data));
        setShowForm(true);
      } catch (err) {
        console.error("Failed to fetch user detail:", err);
        showToast(err?.message || "Gagal memuat detail user", "error");
      } finally {
        setLoading(false);
      }
    })();
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
          users={pagedUsers}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          roleFilterLabel={roleFilterTrimmed}
          onClearRoleFilter={clearRoleFilter}
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
        roleOptions={roleOptions}
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
