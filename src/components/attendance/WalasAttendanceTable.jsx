import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function WalasAttendanceTable({ kelasId, kelasName }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!kelasId) {
        setAttendanceData([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          kelas_id: kelasId,
          tanggal: filterDate,
          limit: "100",
        });
        const res = await absensiSiswa.list(params.toString());
        if (res.success) {
          setAttendanceData(res.data || []);
        } else {
          setAttendanceData([]);
        }
      } catch (e) {
        console.error("Failed to fetch walas attendance:", e);
        setAttendanceData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [kelasId, filterDate]);

  // search query filt
  const filteredData = attendanceData.filter((item) => {
    if (!searchQuery.trim()) return true;
    const name = (item.siswa?.nama || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "TEPAT_WAKTU":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Hadir
          </span>
        );
      case "TELAMBAT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Terlambat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Belum Hadir
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Daftar Kehadiran {kelasName || ""}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredData.length} siswa ditemukan
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* searchbar */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Cari nama ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="date"
                className="outline-none text-sm text-gray-700 bg-transparent"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                No
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nama Siswa
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Waktu Masuk
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Waktu Keluar
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </>
            ) : filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.siswa?.nama || "-"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tap_in || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.tap_out || "-"}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(item.status_tapin)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-gray-500 text-sm">
                      Belum ada data kehadiran untuk tanggal ini.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      {filteredData.length > 0 && (
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 text-center">
          Menampilkan {filteredData.length} dari {attendanceData.length} data
        </div>
      )}
    </div>
  );
}
