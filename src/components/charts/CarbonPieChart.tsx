import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CarbonPieChartProps {
  carbonData: { label: string; value: number }[];
  isDark: boolean;
}

export const CarbonPieChart: React.FC<CarbonPieChartProps> = ({
  carbonData,
  isDark,
}) => {
  // Example: carbonData = [{ label: 'Renewable', value: 60 }, { label: 'Grid', value: 40 }]
  const data = {
    labels: carbonData.map((d) => d.label),
    datasets: [
      {
        data: carbonData.map((d) => d.value),
        backgroundColor: isDark
          ? ["#6366f1", "#fd5757", "#10b981", "#fbbf24"]
          : ["#10b981", "#fd5757", "#fbbf24", "#6366f1"],
        borderColor: ["#fff", "#fff", "#fff", "#fff"],
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
    },
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-6">
      <Pie data={data} options={options} />
    </div>
  );
};
