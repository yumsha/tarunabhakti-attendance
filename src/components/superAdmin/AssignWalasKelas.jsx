import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import PageHeader from "../layout/PageHeader";
import InfoStatCard from "../layout/InfoStatCard";
import { kelas, role as roleApi, users } from "../../lib/backendApi";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm " +
  "text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

function normalizeRoleName(value) {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  return upper === "WALI KELAS" ? "WALAS" : upper;
}

function normalizeUser(raw) {
  const roles = [
    ...(Array.isArray(raw?.roles) ? raw.roles.map((item) => item?.name ?? item) : []),
    ...(Array.isArray(raw?.role_names) ? raw.role_names : []),
    ...(Array.isArray(raw?.userRole) ? raw.userRole.map((item) => item?.role?.name) : []),
    ...(raw?.role?.name ? [raw.role.name] : []),
    ...(typeof raw?.role === "string" ? [raw.role] : []),
  ]
    .map(normalizeRoleName)
    .filter(Boolean);

  return {
    ...raw,
    normalized_roles: Array.from(new Set(roles)),
  };
}

function buildUserUpdatePayload(user, nextRoles) {
  const normalizedRoles = Array.from(
    new Set(nextRoles.map(normalizeRoleName).filter(Boolean))
  );

  if (!normalizedRoles.length && user?.guru_id) {
    normalizedRoles.push("GURU");
  }

  return {
    email: user.email,
    role: normalizedRoles[0],
    role_names: normalizedRoles,
    guru_id: user.guru_id,
  };
}

function getClassLabel(item) {
  if (!item) return "-";
  return `${item.kelas}${item.jurusan ? ` ${item.jurusan}` : ""}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 max-w-sm rounded-2xl border px-4 py-3 shadow-xl ${tone}`}>
      <div className="flex items-start gap-3">
        {toast.type === "error" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button type="button" onClick={onClose} className="opacity-60 transition hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function resolveEffectiveWalas(kelasItem, usersData) {
  if (!kelasItem?.walas_id) {
    return {
      isAssigned: false,
      walasUser: null,
      walasGuru: null,
      issue: null,
    };
  }

  const matchedUser =
    usersData.find(
      (item) =>
        item.guru_id === kelasItem.walas_id &&
        item.normalized_roles.includes("WALAS")
    ) || null;

  if (!matchedUser) {
    return {
      isAssigned: false,
      walasUser: null,
      walasGuru: null,
      issue: "Guru terhubung belum punya role WALAS",
    };
  }

  return {
    isAssigned: true,
    walasUser: matchedUser,
    walasGuru: kelasItem.walas || matchedUser.guru || null,
    issue: null,
  };
}

function AssignWalasModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  kelasOptions,
  guruOptions,
  initialData,
}) {
  const [form, setForm] = useState({ kelas_id: "", user_id: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      kelas_id: initialData?.kelas_id ? String(initialData.kelas_id) : "",
      user_id: initialData?.user_id ? String(initialData.user_id) : "",
    });
    setError("");
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const selectedUser = guruOptions.find((item) => String(item.id) === form.user_id) || null;
  const selectedKelas = kelasOptions.find((item) => String(item.id) === form.kelas_id) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.kelas_id) {
      setError("Pilih kelas terlebih dahulu");
      return;
    }

    if (!form.user_id) {
      setError("Pilih user guru yang akan dijadikan walas");
      return;
    }

    try {
      await onSubmit({
        kelas_id: Number(form.kelas_id),
        user_id: String(form.user_id),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Gagal menyimpan penugasan walas");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!submitting ? onClose : undefined} />
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {initialData ? "Edit Assign Walas" : "Tambah Assign Walas"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Pilih user guru yang sudah punya role WALAS di Kelola Users untuk di-assign ke kelas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Kelas</label>
            <select
              className={inputClass}
              value={form.kelas_id}
              onChange={(e) => setForm((prev) => ({ ...prev, kelas_id: e.target.value }))}
              disabled={submitting}
            >
              <option value="">Pilih kelas</option>
              {kelasOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {getClassLabel(item)}{item.tahun?.tahun_ajaran ? ` - ${item.tahun.tahun_ajaran}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">User WALAS</label>
            <select
              className={inputClass}
              value={form.user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
              disabled={submitting}
            >
              <option value="">Pilih user WALAS</option>
              {guruOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.guru?.nama || item.email} - {item.email}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-400">
              Yang tampil hanya user guru yang sudah punya role WALAS.
            </p>
            {!guruOptions.length ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Belum ada user WALAS yang siap di-assign. Atur role user dulu dari menu Kelola Users.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <School className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-400">Kelas</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedKelas ? getClassLabel(selectedKelas) : "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400">Guru terpilih</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedUser?.guru?.nama || selectedUser?.email || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="text-xs text-gray-400">Role yang dibutuhkan</p>
                  <p className="text-sm font-semibold text-gray-800">WALAS</p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Simpan Assign Walas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemoveConfirmModal({ isOpen, data, loading, onClose, onConfirm }) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!loading ? onClose : undefined} />
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-red-50 p-3">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lepas walas dari kelas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Walas akan dilepas dari kelas <b>{getClassLabel(data)}</b>. Role WALAS pada user terkait juga akan dicabut.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Lepas Walas
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssignWalasKelas() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const [kelasList, setKelasList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [roleList, setRoleList] = useState([]);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setFetchError("");

    try {
      const [kelasRes, usersRes, roleRes] = await Promise.all([
        kelas.list("limit=100"),
        users.list("page=1&limit=10000"),
        roleApi.list(),
      ]);

      setKelasList(Array.isArray(kelasRes?.data) ? kelasRes.data : []);
      setUserList(Array.isArray(usersRes?.data) ? usersRes.data.map(normalizeUser) : []);
      setRoleList(Array.isArray(roleRes?.data) ? roleRes.data : []);
    } catch (err) {
      setFetchError(err?.message || "Gagal memuat data assign walas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedKelas = useMemo(() => {
    const copied = [...kelasList];
    return copied.sort((a, b) => getClassLabel(a).localeCompare(getClassLabel(b), "id"));
  }, [kelasList]);

  const walasUsers = useMemo(
    () =>
      userList
        .filter((item) => item.guru && item.normalized_roles.includes("WALAS"))
        .sort((a, b) => (a.guru?.nama || a.email).localeCompare(b.guru?.nama || b.email, "id")),
    [userList]
  );

  const walasRole = useMemo(
    () => roleList.find((item) => normalizeRoleName(item.name) === "WALAS") || null,
    [roleList]
  );

  const kelasRows = useMemo(
    () =>
      sortedKelas.map((item) => ({
        ...item,
        walasState: resolveEffectiveWalas(item, userList),
      })),
    [sortedKelas, userList]
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return kelasRows.filter((item) => {
      if (!keyword) return true;
      const haystack = [
        item.kelas,
        item.jurusan,
        item.tahun?.tahun_ajaran,
        item.walasState.walasGuru?.nama,
        item.walasState.issue,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [search, kelasRows]);

  const stats = useMemo(() => {
    const walasAssigned = kelasList.filter((item) =>
      resolveEffectiveWalas(item, userList).isAssigned
    ).length;

    return {
      totalKelas: kelasList.length,
      walasAssigned,
      needWalas: Math.max(0, kelasList.length - walasAssigned),
      walasReady: walasUsers.length,
    };
  }, [kelasList, userList, walasUsers.length]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const getSelectedWalasUser = (userId) => {
    const selectedUser = userList.find((item) => item.id === userId);
    if (!selectedUser) throw new Error("User guru tidak ditemukan");
    if (!selectedUser.guru_id) throw new Error("User belum terhubung ke data guru");
    if (!selectedUser.normalized_roles.includes("WALAS")) {
      throw new Error("User belum punya role WALAS. Atur dulu dari Kelola Users");
    }
    return selectedUser;
  };

  const handleSubmitAssign = async ({ kelas_id, user_id }) => {
    if (!walasRole) {
      throw new Error("Role WALAS belum tersedia di master role");
    }

    setSubmitLoading(true);
    try {
      const selectedUser = getSelectedWalasUser(user_id);
      const targetGuruId = selectedUser.guru_id;

      if (!targetGuruId) {
        throw new Error("User terpilih belum memiliki data guru");
      }

      const assignRes = await kelas.assignWalas(kelas_id, Number(targetGuruId));
      if (assignRes?.success === false) {
        throw new Error(assignRes.message || "Gagal assign walas ke kelas");
      }

      showToast("Assign walas berhasil disimpan");
      await loadData({ silent: true });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRemoveWalas = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    let walasReleased = false;
    try {
      const currentUser =
        removeTarget.walasState?.walasUser ||
        userList.find(
          (item) =>
            item.guru_id === removeTarget.walas_id &&
            item.normalized_roles.includes("WALAS")
        ) ||
        null;

      const releaseRes = await kelas.assignWalas(removeTarget.id, null);
      if (releaseRes?.success === false) {
        throw new Error(releaseRes.message || "Gagal melepas walas");
      }
      walasReleased = true;

      if (currentUser) {
        const nextRoles = currentUser.normalized_roles.filter((role) => role !== "WALAS");
        const updateRes = await users.update(
          currentUser.id,
          buildUserUpdatePayload(currentUser, nextRoles)
        );

        if (updateRes?.success === false) {
          throw new Error(
            updateRes.message || "Walas berhasil dilepas dari kelas, tapi role WALAS gagal dihapus dari user"
          );
        }
      }

      showToast("Walas berhasil dilepas dari kelas dan role user ikut diperbarui");
      setRemoveTarget(null);
      await loadData({ silent: true });
    } catch (err) {
      if (walasReleased) {
        await loadData({ silent: true });
      }
      showToast(err?.message || "Gagal melepas walas", "error");
    } finally {
      setRemoveLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRow(null);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    const matchedUser =
      userList.find((item) => item.guru_id === row.walas_id) || null;
    setEditingRow({
      kelas_id: row.id,
      user_id: matchedUser?.id || "",
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-gray-600">Memuat data assign walas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Assign Walas"
        subtitle="Kelola penugasan wali kelas."
        right={
          <button
            type="button"
            onClick={() => loadData({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <InfoStatCard
            label="Kelas Aktif"
            value={stats.totalKelas}
            helper="Kelas yang bisa diisi walas"
            icon={<School className="h-5 w-5" />}
            tone="blue"
          />
          <InfoStatCard
            label="Sudah Ada Walas"
            value={stats.walasAssigned}
            helper="Kelas yang sudah terisi"
            icon={<UserCheck className="h-5 w-5" />}
            tone="emerald"
          />
          <InfoStatCard
            label="Butuh Walas"
            value={stats.needWalas}
            helper="Kelas yang belum ter-assign"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="amber"
          />
          <InfoStatCard
            label="User WALAS Siap Assign"
            value={stats.walasReady}
            helper="Atur role user dulu di Kelola Users"
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="violet"
          />
        </div>

        {fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Data assign walas belum berhasil dimuat.</p>
                <p className="mt-1">{fetchError}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tabel Assign Walas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Halaman ini hanya menampilkan dan meng-assign user yang sudah punya role <b>WALAS</b>.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Cari kelas, jurusan, atau walas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Assign Walas
              </button>
            </div>
          </div>

          <div className="min-w-215">
            <table className="w-full min-w-215">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">No</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kelas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Walas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Update</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, index) => (
                    <tr key={row.id} className="transition hover:bg-blue-50/20">
                      <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{getClassLabel(row)}</span>
                          <span className="text-xs text-gray-400">ID kelas: {row.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {row.walasState.isAssigned ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">
                              {row.walasState.walasGuru?.nama}
                            </span>
                            <span className="text-xs text-gray-400">
                              {row.walasState.walasGuru?.NIP || "Tanpa NIP"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                              Belum ada walas
                            </span>
                            {row.walasState.issue ? (
                              <span className="text-xs text-red-500">{row.walasState.issue}</span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.walasState.isAssigned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(row.updated_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {row.walasState.isAssigned ? "Ubah" : "Assign"}
                          </button>

                          {row.walas_id ? (
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Lepas
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-sm text-gray-500">
                      Tidak ada data assign walas yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AssignWalasModal
        isOpen={showModal}
        onClose={() => {
          if (submitLoading) return;
          setShowModal(false);
          setEditingRow(null);
        }}
        onSubmit={handleSubmitAssign}
        submitting={submitLoading}
        kelasOptions={sortedKelas}
        guruOptions={walasUsers}
        initialData={editingRow}
      />

      <RemoveConfirmModal
        isOpen={!!removeTarget}
        data={removeTarget}
        loading={removeLoading}
        onClose={() => {
          if (removeLoading) return;
          setRemoveTarget(null);
        }}
        onConfirm={handleRemoveWalas}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
