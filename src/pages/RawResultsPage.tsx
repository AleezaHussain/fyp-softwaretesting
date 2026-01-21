import React from 'react';
import { useLocation } from 'react-router-dom';
import RawSimulationResults from '../components/simulation/RawSimulationResults';

const RawResultsPage: React.FC = () => {
  const location = useLocation();
  let results = location.state;

  // Debug: log location.state and localStorage
  console.log('[RawResultsPage] location.state:', location.state);
  if (!results) {
    const stored = localStorage.getItem('lastSimulationResults');
    console.log('[RawResultsPage] Loaded from localStorage:', stored);
    if (stored) {
      try {
        results = JSON.parse(stored);
        console.log('[RawResultsPage] Parsed results from localStorage:', results);
      } catch (e) {
        console.error('[RawResultsPage] Error parsing localStorage:', e);
        results = null;
      }
    }
  }

  if (!results) {
    console.warn('[RawResultsPage] No simulation results found.');
    return <div style={{ padding: '2rem' }}>No simulation results found.</div>;
  }

  // Pass all results directly to RawSimulationResults
  console.log('[RawResultsPage] Rendering results:', results);
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Full Simulation Output (All Data)</h1>
      <RawSimulationResults {...results} />
      <pre style={{ marginTop: 32, background: '#f8f8f8', padding: 16, borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
};

export default RawResultsPage;
