# Weather Data Debug Guide

## Issue
Weather data is not being passed to the evaporative cooling API, causing the error:
```
Weather data is required for evaporative cooling simulation
```

## Debug Logging Added

I've added comprehensive console logging to track the weather data flow through the application:

### 1. CSV Upload (EvaporativeCooling.tsx)
When you upload a CSV file, you should see:
```
✅ [CSV] Weather data parsed successfully: X rows
✅ [CSV] Sample data: [...]
✅ [CSV] Calling onConfigChange with weatherData
```

### 2. useEffect Trigger (EvaporativeCooling.tsx)
After CSV upload, the useEffect should trigger and show:
```
🔍 [USEEFFECT] useEffect triggered
🔍 [USEEFFECT] weatherData state: X rows
✅ [USEEFFECT] Weather data exists, sample: [...]
```

### 3. Config Change Handler (InputManagement.tsx)
When the config is updated, you should see:
```
🔍 [CONFIG] handleConfigChange called
🔍 [CONFIG] Has weatherData? true
🔍 [CONFIG] WeatherData length: X
✅ [CONFIG] Weather data present: [...]
```

### 4. Form Submission (InputManagement.tsx)
When you click "Run Simulation", you should see:
```
🔍 [SUBMIT] handleSubmit called
🔍 [SUBMIT] configRef.current: {...}
🔍 [SUBMIT] Has weatherData in configRef? true
🔍 [SUBMIT] WeatherData length: X
🔍 [SUBMIT] completeConfig has weatherData? true
🔍 [SUBMIT] completeConfig weatherData length: X
```

### 5. Store Simulation (store.ts)
Finally, in the store, you should see:
```
🔍 [DEBUG] Raw input received by runSimulation: {...}
🌊 [EVAPORATIVE] Using Evaporative Cooling API
🌊 [EVAPORATIVE] Configuration found: {...}
🌊 [EVAPORATIVE] Weather data found: X data points
```

## Testing Steps

1. **Start the frontend**:
   ```bash
   npm run dev
   ```

2. **Start the backend** (in evaporative-cooling-api folder):
   ```bash
   mvn spring-boot:run
   ```

3. **Open browser console** (F12 → Console tab)

4. **Navigate to New Simulation**:
   - Select "Evaporative Cooling" technique
   - Fill in the form fields
   - Upload your weather CSV file

5. **Watch the console logs**:
   - After CSV upload, you should see logs from steps 1-3 above
   - Click "Continue" to go to InputManagement page
   - Click "Run Simulation"
   - You should see logs from steps 4-5 above

## Expected Behavior

✅ **Success**: All 5 log groups appear, showing weatherData is present throughout the flow

❌ **Failure**: If any log group shows "No weather data" or "weatherData length: 0", that's where the data is being lost

## Common Issues

### Issue 1: weatherData is empty in useEffect
**Symptom**: `⚠️ [USEEFFECT] No weather data in state`

**Cause**: The CSV upload didn't properly set the weatherData state

**Solution**: Check if the CSV file format is correct (see CSV_FORMAT_GUIDE.md)

### Issue 2: weatherData is lost in handleConfigChange
**Symptom**: `🔍 [CONFIG] Has weatherData? false`

**Cause**: The config object passed to handleConfigChange doesn't include weatherData

**Solution**: Check if onConfigChange is being called with weatherData in the useEffect

### Issue 3: weatherData is lost in handleSubmit
**Symptom**: `🔍 [SUBMIT] Has weatherData in configRef? false`

**Cause**: The configRef.current was overwritten without weatherData

**Solution**: Check if the config is being properly stored in the ref

## Next Steps

After running the test and checking the console logs, report back which step is showing missing weatherData, and we can fix that specific issue.
