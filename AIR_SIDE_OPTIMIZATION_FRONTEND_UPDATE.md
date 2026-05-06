# Air-Side Economizer Optimization - Frontend Update Complete

## Status: ✅ READY FOR TESTING

### What Was Done

1. **Updated Frontend to Call New Optimized Endpoint**
   - Changed: `src/store/store.ts` (line ~1275)
   - Old endpoint: `http://localhost:8080/api/simulate` (EconomizerController - slow 3-phase)
   - New endpoint: `http://localhost:8080/api/simulation/run-full-year` (SimulationController - optimized lock-step)
   - Updated progress messages to reflect lock-step mode

2. **Backend Status**
   - Application running on port 8080
   - Both endpoints available:
     - `/api/simulation/run` - Old 3-phase approach (30+ minutes)
     - `/api/simulation/run-full-year` - New lock-step approach (7-8 minutes)
   - CloudSim workload generation integrated
   - Full 8760-hour simulation with lock-step physics calculations

### Expected Performance Improvement

| Metric | Old Endpoint | New Endpoint | Improvement |
|--------|-------------|-------------|------------|
| Simulation Time | 30+ minutes | 7-8 minutes | 75-80% faster |
| Architecture | 3-phase sequential | Lock-step co-simulation | Parallel processing |
| CloudSim Integration | Phase 1 only | Full 8760 hours | Continuous workload |
| Physics Calculations | Phase 3 only | Lock-step with CloudSim | Integrated |

### How It Works

**New Lock-Step Architecture:**
1. CloudSim generates full 8760-hour workload profile upfront
2. Physics calculations run in parallel with CloudSim results
3. Each hour: IT load from CloudSim + weather data → physics model → results
4. Results collected every 24 hours to reduce response size
5. Annual metrics computed from hourly data

### Testing Instructions

1. **Start Backend** (already running):
   ```bash
   java -jar cooling-air-economizer/api/target/cooling-air-economizer-api-0.0.1-SNAPSHOT.jar
   ```

2. **Run Frontend Simulation**:
   - Open the air-side economizer simulation form
   - Fill in parameters (servers, power, weather data, etc.)
   - Click "Run Simulation"
   - Monitor progress messages (should show "lock-step mode")
   - Expected completion: 7-8 minutes for full 8760-hour simulation

3. **Verify Results**:
   - Check console logs for `[AirSideService]` messages
   - Verify hourly results are returned
   - Check annual summary metrics
   - Compare execution time with old endpoint

### Key Files Modified

- `src/store/store.ts` - Frontend API call updated to new endpoint
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/controller/SimulationController.java` - New endpoint already implemented
- `cooling-air-economizer/api/src/main/java/com/example/coolingeconomizer/service/AirSideEconomizerService.java` - Lock-step service already implemented

### Important Notes

- **Weather Data**: Frontend must send weather data in the request. If empty, synthetic weather is generated.
- **CloudSim Workload**: Automatically generated from server configuration (numServers, computeIntensityFactor, etc.)
- **8760 Hours**: Full year simulation is hardcoded in the new endpoint
- **Backward Compatibility**: Old endpoint `/api/simulation/run` still available if needed

### Next Steps

1. Test the new endpoint with frontend
2. Verify 7-8 minute execution time
3. Confirm CloudSim workload is being used (check console output)
4. Validate results match expected physics calculations
5. If issues arise, check backend logs for `[AirSideService]` messages

---

**Status**: Ready for testing. Backend running on port 8080. Frontend updated to call optimized endpoint.
