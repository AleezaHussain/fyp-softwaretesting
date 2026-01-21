import React from 'react';

interface HourlyResult {
  timestamp: string;
  itLoadKW: number;
  fanPowerKW: number;
  coolingPowerKW: number;
  totalEnergyKW: number;
  cost: number;
  co2: number;
  met: boolean;
  supplyAirTemp?: number;
  returnAirTemp?: number;
  airflowCFM?: number;
  deltaT?: number;
}

interface RawSimulationResultsProps {
  hourlyProfile: HourlyResult[];
  totalCost: number;
  totalCO2: number;
  totalEnergyKWh: number;
  totalCoolingKWh: number;
  totalFanKWh: number;
  allHoursMet: boolean;
}

const RawSimulationResults: React.FC<RawSimulationResultsProps> = ({
  hourlyProfile,
  totalCost,
  totalCO2,
  totalEnergyKWh,
  totalCoolingKWh,
  totalFanKWh,
  allHoursMet
}) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Raw Simulation Results</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3>Summary</h3>
        <ul>
          <li><strong>Total Cost:</strong> {totalCost.toFixed(2)}</li>
          <li><strong>Total CO₂ Emissions:</strong> {totalCO2.toFixed(2)}</li>
          <li><strong>Total Energy (kWh):</strong> {totalEnergyKWh.toFixed(2)}</li>
          <li><strong>Total Cooling Energy (kWh):</strong> {totalCoolingKWh.toFixed(2)}</li>
          <li><strong>Total Fan Energy (kWh):</strong> {totalFanKWh.toFixed(2)}</li>
          <li><strong>All Hours Met:</strong> {allHoursMet ? 'Yes' : 'No'}</li>
        </ul>
      </div>
      <h3>Hourly Profile</h3>
      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
        <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Hour</th>
              <th>IT Load (kW)</th>
              <th>Fan Power (kW)</th>
              <th>Cooling Power (kW)</th>
              <th>Total Energy (kW)</th>
              <th>Cost</th>
              <th>CO₂</th>
              <th>Met</th>
              <th>Supply Air Temp</th>
              <th>Return Air Temp</th>
              <th>Airflow (CFM)</th>
              <th>ΔT (°C)</th>
            </tr>
          </thead>
          <tbody>
            {hourlyProfile.map((h, idx) => (
              <tr key={h.timestamp || idx} style={{ background: h.met ? '#f6fff6' : '#fff6f6' }}>
                <td>{h.timestamp}</td>
                <td>{h.itLoadKW.toFixed(2)}</td>
                <td>{h.fanPowerKW.toFixed(2)}</td>
                <td>{h.coolingPowerKW.toFixed(2)}</td>
                <td>{h.totalEnergyKW.toFixed(2)}</td>
                <td>{h.cost.toFixed(2)}</td>
                <td>{h.co2.toFixed(2)}</td>
                <td>{h.met ? '✔️' : '❌'}</td>
                <td>{h.supplyAirTemp ?? '-'}</td>
                <td>{h.returnAirTemp ?? '-'}</td>
                <td>{h.airflowCFM ?? '-'}</td>
                <td>{h.deltaT ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RawSimulationResults;
