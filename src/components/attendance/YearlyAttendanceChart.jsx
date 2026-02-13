import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const attendanceYear = [
  620, 640, 610, 700, 680, 720, 690, 710, 730, 750, 740, 760
];
const attendancePrevYear = [
  600, 660, 650, 690, 670, 710, 700, 720, 740, 760, 770, 780
];

export default function YearlyAttendanceChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    // Gradient for current year
    const gradientBlue = ctx.createLinearGradient(0, 0, 0, 260);
    gradientBlue.addColorStop(0, "rgba(37,99,235,0.15)");
    gradientBlue.addColorStop(1, "rgba(37,99,235,0)");
    // Gradient for previous year
    const gradientYellow = ctx.createLinearGradient(0, 0, 0, 260);
    gradientYellow.addColorStop(0, "rgba(251,191,36,0.15)");
    gradientYellow.addColorStop(1, "rgba(251,191,36,0)");

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Attendance",
            data: attendanceYear,
            borderColor: "#2563eb",
            backgroundColor: gradientBlue,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#2563eb",
          },
          {
            label: "Attendance (previous year)",
            data: attendancePrevYear,
            borderColor: "#fbbf24",
            backgroundColor: gradientYellow,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#fbbf24",
            pointBorderColor: "#fbbf24",
          },
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
            display: true,
            text: "Yearly School Attendance",
          },
          filler: {
            propagate: false,
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function (value) {
                return value;
              },
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
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Yearly School Attendance</h3>
      <canvas ref={chartRef} width={600} height={260}></canvas>
    </div>
  );
}
