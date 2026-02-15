import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function LateStudents() {
  const [lateStudents, setLateStudents] = useState([]);

  useEffect(() => {
    const fetchLateStudents = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);
        if (res.success && Array.isArray(res.data)) {
            const late = res.data.filter(item => item.status_tapin === "TELAMBAT").map(item => ({
                name: item.siswa.nama,
                time: item.tap_in
            }));
            setLateStudents(late);
        }
      } catch (error) {
        console.error("Failed to fetch late students:", error);
      }
    };

    fetchLateStudents();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4 text-red-600">Terlambat Hari Ini</h3>
      {lateStudents.length > 0 ? (
        <ul>
            {lateStudents.map((student, index) => (
            <li key={index} className="flex items-center justify-between py-2 border-b last:border-none">
                <span className="font-medium text-gray-800">{student.name}</span>
                <span className="text-sm text-red-500 font-semibold">{student.time}</span>
            </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Tidak ada siswa terlambat hari ini.</p>
      )}
    </div>
  );
}
