import { useState, useEffect } from "react";
import { kelas } from "../../lib/backendApi";

export default function StudentHeader() {
  const [userRole, setUserRole] = useState("");
  const [classNames, setClassNames] = useState("");

  useEffect(() => {
    const fetchClassInfo = async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const role = (user?.role?.name || user?.role || "").toString().toUpperCase();
      setUserRole(role);

      if (role === "WALAS") {
        try {
          const res = await kelas.list("limit=100");
          if (res.success && res.data) {
            const guruId = user?.guru?.id;
            const myClasses = res.data.filter((c) => c.walas_id === guruId);
            if (myClasses.length > 0) {
              const names = myClasses.map((c) => c.kelas).join(", ");
              setClassNames(`- ${names}`);
            }
          }
        } catch (e) {
          console.error("Failed to fetch classes for header", e);
        }
      }
    };

    fetchClassInfo();
  }, []);

  return (
    <h1 className="text-2xl font-semibold text-gray-900">
      Daftar Siswa {classNames}
    </h1>
  );
}
