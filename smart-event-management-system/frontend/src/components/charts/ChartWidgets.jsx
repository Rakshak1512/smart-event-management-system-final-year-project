import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const gridColor = "rgba(148, 163, 184, 0.15)";
const textColor = "#94a3b8";

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: textColor, font: { family: "Inter" } } },
  },
  scales: {
    x: { ticks: { color: textColor }, grid: { color: "transparent" } },
    y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
  },
};

export function MonthlyLineChart({ labels, data, label = "Registrations", height = 280 }) {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.18)",
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#8b5cf6",
              pointRadius: 4,
            },
          ],
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function ComparisonBarChart({ labels, datasets, height = 280 }) {
  const palette = ["#6366f1", "#d946ef", "#22c55e", "#f59e0b"];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, height }}>
      <Bar
        data={{
          labels,
          datasets: datasets.map((ds, i) => ({
            backgroundColor: palette[i % palette.length],
            borderRadius: 8,
            maxBarThickness: 34,
            ...ds,
          })),
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function CategoryDoughnutChart({ labels, data, height = 260 }) {
  const palette = ["#6366f1", "#8b5cf6", "#d946ef", "#22c55e", "#f59e0b", "#0ea5e9", "#ef4444"];
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "100%", minWidth: 0, height, display: "flex", justifyContent: "center" }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: labels.map((_, i) => palette[i % palette.length]),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: undefined,
          cutout: "68%",
          plugins: { legend: { position: "bottom", labels: { color: textColor } } },
        }}
      />
    </div>
  );
}
