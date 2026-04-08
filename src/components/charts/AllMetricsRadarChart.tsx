import React from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface AllMetricsRadarChartProps {
  metricsData: { label: string; value: number }[];
  isDark: boolean;
}

export const AllMetricsRadarChart: React.FC<AllMetricsRadarChartProps> = ({
  metricsData,
  isDark,
}) => {
  // Example: metricsData = [{ label: 'PUE', value: 1.45 }, { label: 'CUE', value: 0.7 }, ...]
  const data = {
    labels: metricsData.map((d) => d.label),
    datasets: [
      {
        label: "All Metrics",
        data: metricsData.map((d) => d.value),
        backgroundColor: isDark
          ? "rgba(139,92,246,0.4)"
          : "rgba(14,165,233,0.4)",
        borderColor: isDark ? "#8b5cf6" : "#0ea5e9",
        borderWidth: 2,
        pointBackgroundColor: isDark ? "#8b5cf6" : "#0ea5e9",
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
      },
    },
  };
  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-6">
      <Radar data={data} options={options} />
    </div>
  );
};
