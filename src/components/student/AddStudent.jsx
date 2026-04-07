import { useState, useEffect } from "react";

export default function AddStudent() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const role = (user?.role?.name || user?.role || "").toString().toUpperCase();
      setIsAdmin(role === "ADMIN");
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium">
      Tambah Siswa
    </button>
  );
}
