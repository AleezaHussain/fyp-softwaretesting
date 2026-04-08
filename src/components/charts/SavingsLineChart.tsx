import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface SavingsLineChartProps {
  savingsData: { label: string; value: number }[];
  isDark: boolean;
}

export const SavingsLineChart: React.FC<SavingsLineChartProps> = ({
  savingsData,
  isDark,
}) => {
  // Example: savingsData = [{ label: 'Jan', value: 120 }, { label: 'Feb', value: 150 }]
  const data = {
    labels: savingsData.map((d) => d.label),
    datasets: [
      {
        label: "Savings ($)",
        data: savingsData.map((d) => d.value),
        borderColor: isDark ? "#5ce1e5" : "#0ea5e9",
        backgroundColor: isDark ? "#5ce1e580" : "#0ea5e980",
        tension: 0.4,
        fill: true,
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
      <Line data={data} options={options} />
    </div>
  );
};
