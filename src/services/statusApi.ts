// src/services/statusApi.ts
// Service to fetch real-time dashboard stats from backend

export interface DashboardStatus {
  activeServers: number;
  fansRunning: number;
  cpuUtilization: number;
  racksMonitored: number;
  lastActive: string;
  systemAlerts: number;
}

export async function fetchDashboardStatus(): Promise<DashboardStatus> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error("Failed to fetch dashboard status");
  return res.json();
}
