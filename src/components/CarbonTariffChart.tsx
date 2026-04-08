import React from "react";
import { Bar, Chart } from "react-chartjs-2";
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

interface CarbonTariffChartProps {
  data: Array<{ country: string; co2: number; tariff: number }>;
}

const CarbonTariffChart: React.FC<CarbonTariffChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.country),
    datasets: [
      {
        label: "CO₂ Factor",
        data: data.map((d) => d.co2),
        backgroundColor: "#5ce1e5",
      },
      {
        label: "Tariff",
        data: data.map((d) => d.tariff),
        backgroundColor: "#fd5757",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "CO₂ Factor and Tariff by Country",
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: false,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default CarbonTariffChart;
