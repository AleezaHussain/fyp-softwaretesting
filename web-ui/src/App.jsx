import { useState } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import Scene3D from './Scene3D'

function App() {
  const [form, setForm] = useState({
    climateLabel: 'Houston',
    days: 1,
    scaleFactor: 50,
    racks: 5,
    itLoadPerRack: 5.0,
    waterAvailability: 100,
    windSpeed: 2.0,
    techniques: ['CRAC', 'CRAH', 'AirEconomizer', 'ChilledWater']
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedHour, setSelectedHour] = useState(0)

  const run = async () => {
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:8081/api/simulate', form)
      setResult(res.data)
    } catch (e) {
      alert('API error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Cooling Simulation</h1>
      <div style={{ marginBottom: 20, maxWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 8, alignItems: 'center' }}>
          <label>Climate: </label>
          <input value={form.climateLabel} onChange={e => setForm({ ...form, climateLabel: e.target.value })} />

          <label>Days: </label>
          <input type="number" value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })} />

          <label>Scale Factor: </label>
          <input type="number" value={form.scaleFactor} onChange={e => setForm({ ...form, scaleFactor: Number(e.target.value) })} />

          <label>Number of Racks: </label>
          <input type="number" value={form.racks} onChange={e => setForm({ ...form, racks: Number(e.target.value) })} />

          <label>IT Load per Rack (kW): </label>
          <input type="number" step="0.1" value={form.itLoadPerRack} onChange={e => setForm({ ...form, itLoadPerRack: Number(e.target.value) })} />

          <label>Water Availability (%): </label>
          <input type="number" min="0" max="100" value={form.waterAvailability} onChange={e => setForm({ ...form, waterAvailability: Number(e.target.value) })} />

          <label>Wind Speed (m/s): </label>
          <input type="number" step="0.1" value={form.windSpeed} onChange={e => setForm({ ...form, windSpeed: Number(e.target.value) })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Techniques: </label>
          {['CRAC', 'CRAH', 'AirEconomizer', 'ChilledWater'].map(tech => (
            <label key={tech} style={{ marginLeft: 10 }}>
              <input
                type="checkbox"
                checked={form.techniques.includes(tech)}
                onChange={e => {
                  if (e.target.checked) {
                    setForm({ ...form, techniques: [...form.techniques, tech] })
                  } else {
                    setForm({ ...form, techniques: form.techniques.filter(t => t !== tech) })
                  }
                }}
              />
              {tech}
            </label>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={loading}>Run Simulation</button>

      {result && (
        <>
          <h2>Summary</h2>
          <table border="1" cellPadding="4">
            <thead><tr><th>Tech</th><th>Energy (kWh)</th><th>Cost ($)</th><th>CO2 (kg)</th><th>Water (L)</th></tr></thead>
            <tbody>
              {result.summary.map((row, i) => (
                <tr key={i}><td>{row.tech}</td><td>{row.energy_kWh}</td><td>{row.cost_usd}</td><td>{row.co2_kg}</td><td>{row.water_L}</td></tr>
              ))}
            </tbody>
          </table>

          <h2>3D Data Center View</h2>
          <div style={{ marginBottom: 10 }}>
            <label>Hour: </label>
            <input
              type="range"
              min="0"
              max={result.hours.length - 1}
              value={selectedHour}
              onChange={e => setSelectedHour(Number(e.target.value))}
            />
            <span> {selectedHour}</span>
          </div>
          <Scene3D result={result} selectedHour={selectedHour} form={form} />

          <h2>Hourly Cooling Power</h2>
          <LineChart width={600} height={300} data={result.hours}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            {result.hours.length > 0 && Object.keys(result.hours[0]).filter(k => k.endsWith('_kW')).map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke="#8884d8" />
            ))}
          </LineChart>
        </>
      )}
    </div>
  )
}

export default App
