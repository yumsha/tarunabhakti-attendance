import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa } from "../../lib/backendApi";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function YearlyAttendanceChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear, currentYear - 1, currentYear - 2]);
  const [attendanceData, setAttendanceData] = useState(Array(12).fill(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchYearlyData = async () => {
      setIsLoading(true);
      try {
        const res = await absensiSiswa.rekapTahunan(selectedYear);
        if (res.success && Array.isArray(res.data)) {
          const data = Array(12).fill(0);
          res.data.forEach(item => {
            data[item.month - 1] = item.count;
          });
          setAttendanceData(data);
        }
      } catch (error) {
        console.error("Failed to fetch yearly attendance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchYearlyData();
  }, [selectedYear]);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    // Gradient for current selection
    const gradientBlue = ctx.createLinearGradient(0, 0, 0, 260);
    gradientBlue.addColorStop(0, "rgba(37,99,235,0.15)");
    gradientBlue.addColorStop(1, "rgba(37,99,235,0)");

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: `Attendance ${selectedYear}`,
            data: attendanceData,
            borderColor: "#2563eb",
            backgroundColor: gradientBlue,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#2563eb",
          }
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          title: {
            display: false
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [attendanceData, isLoading]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8 relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Yearly School Attendance</h3>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Pilih Tahun:</span>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
        </div>
      </div>
      
      {isLoading ? (
          <div className="h-[260px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
      ) : (
          <canvas ref={chartRef} width={600} height={260}></canvas>
      )}
    </div>
  );
}