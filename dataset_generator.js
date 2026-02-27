// dataset_generator.js
// This script generates a CSV of random scenarios by calling
// your three simulator APIs and saving the best technique.

import fs from "fs";

// change these URLs to point at your running services
const AIR_URL = "http://localhost:8081/simulate";
const EVAP_URL = "http://localhost:8082/simulate";
const CHILL_URL = "http://localhost:8083/simulate";

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function sampleScenario() {
  return {
    weather: {
      tempC: Number(rand(15, 45).toFixed(1)),
      rh: Number(rand(20, 90).toFixed(1)),
    },
    dc: {
      itLoadKW: Number(rand(200, 2000).toFixed(0)),
      inletMaxC: 27,
    },
    economics: {
      electricity: 55,     // you can randomize these if you like
      water: 0.2,
      carbonFactor: 0.45,
    },
    constraints: {
      rhMin: 20,
      rhMax: 80,
    },
  };
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

function pickWinner(air, evap, chill) {
  const options = [
    { name: "AirSide", r: air },
    { name: "Evaporative", r: evap },
    { name: "ChilledWater", r: chill },
  ].filter(o => o.r?.feasible);

  if (options.length === 0) return "None";

  options.sort((a, b) => a.r.energyKWh - b.r.energyKWh);
  return options[0].name;
}

async function main() {
  const N = 2000; // number of rows to generate
  const out = fs.createWriteStream("dataset.csv");
  out.write("tempC,rh,itLoadKW,bestTechnique\n");

  for (let i = 0; i < N; i++) {
    const s = sampleScenario();
    const [air, evap, chill] = await Promise.all([
      postJSON(AIR_URL, s),
      postJSON(EVAP_URL, s),
      postJSON(CHILL_URL, s),
    ]);
    const best = pickWinner(air, evap, chill);
    out.write(`${s.weather.tempC},${s.weather.rh},${s.dc.itLoadKW},${best}\n`);
    if ((i + 1) % 100 === 0) console.log(`Generated ${i + 1}/${N}`);
  }

  out.end();
  console.log("✅ dataset.csv created");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
});
