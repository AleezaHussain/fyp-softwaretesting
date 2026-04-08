export type CoolingTechnique = "air" | "water" | "evaporative" | "hybrid";
export type SimulationStatus = "pending" | "running" | "completed" | "failed";
export type Theme = "light" | "dark";
export type Units = "metric" | "imperial";

export interface User {
  id: number;
  name: string;
  email: string;
  profilePicture?: string;
  preferences: {
    theme: Theme;
    units: Units;
    notifications: boolean;
  };
}

export interface SimulationInput {
  dataCenterName: string;
  location: string;
  itLoad: number;
  numberOfRacks: number;
  coolingTechnique: CoolingTechnique;
  supplyAirTemp: number;
  chilledWaterTemp: number;
  efficiencyFactor: number;
  electricityTariff: number;
  co2EmissionFactor: number;
  weatherData?: WeatherData;
  reviewed: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  location: string;
}

export interface SimulationResult {
  id: number;
  simulationId: number;
  pue: number;
  wue: number;
  totalEnergyConsumption: number;
  estimatedCost: number;
  carbonFootprint: number;
  hourlyEnergyUse: number[];
  temperatureTrends: number[];
  copOverTime: number[];
  timestamp: string;
}

export interface Simulation {
  id: number;
  name: string;
  location: string;
  itLoad: number;
  coolingTechnique: CoolingTechnique;
  createdAt: string;
  status: SimulationStatus;
}

export interface Report {
  id: number;
  simulationId: number;
  templateType: "executive" | "technical" | "sustainability";
  createdAt: string;
  format: "pdf" | "ppt" | "png" | "csv";
}
