import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface KPIBarChartProps {
  kpiData: { label: string; value: number }[];
  isDark: boolean;
}

export const KPIBarChart: React.FC<KPIBarChartProps> = ({
  kpiData,
  isDark,
}) => {
  // Example: kpiData = [{ label: 'PUE', value: 1.45 }, { label: 'CUE', value: 0.7 }]
  const data = {
    labels: kpiData.map((k) => k.label),
    datasets: [
      {
        label: "KPI Values",
        data: kpiData.map((k) => k.value),
        backgroundColor: isDark ? "#5ce1e5" : "#0ea5e9",
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <Bar data={data} options={options} />
    </div>
  );
};
