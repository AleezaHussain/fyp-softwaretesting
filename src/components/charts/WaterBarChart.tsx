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

interface WaterBarChartProps {
  waterData: { label: string; value: number }[];
  isDark: boolean;
}

export const WaterBarChart: React.FC<WaterBarChartProps> = ({
  waterData,
  isDark,
}) => {
  // Example: waterData = [{ label: 'Jan', value: 1200 }, { label: 'Feb', value: 900 }]
  const data = {
    labels: waterData.map((d) => d.label),
    datasets: [
      {
        label: "Water Usage (L)",
        data: waterData.map((d) => d.value),
        backgroundColor: isDark ? "#6366f1" : "#0ea5e9",
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
    <div className="bg-white rounded-xl p-4 shadow-md mt-6">
      <Bar data={data} options={options} />
    </div>
  );
};
