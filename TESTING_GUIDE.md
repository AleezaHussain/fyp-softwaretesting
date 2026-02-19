# 🧪 TESTING GUIDE - AUTO-CALCULATED AIRFLOW

## Current Status

✅ **Backend:** Running on port 8080  
✅ **Frontend Changes:** Saved (auto-compiles with Vite)  
⏳ **Next Step:** Test in browser

---

## How to Test

### Option 1: If Frontend Dev Server is Already Running

1. **Just refresh your browser** (Ctrl+R or F5)
   - Vite hot-reloads automatically
   - Changes should appear immediately

2. **Navigate to:** New Simulation → Evaporative Cooling

3. **Look for the blue info box** showing:
   ```
   🌀 Auto-Calculated Airflow: 15,000 CFM
   Based on 50 servers × 250 CFM/server × 1.2 safety margin
   ```

---

### Option 2: If Frontend Dev Server is NOT Running

1. **Open a new terminal** in the project root:
   ```bash
   cd D:\aleezafyp\fyp
   ```

2. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```

3. **Open browser** to the URL shown (usually http://localhost:5173)

4. **Navigate to:** New Simulation → Evaporative Cooling

---

## What to Check

### 1. Auto-Calculated Airflow Display

**Location:** After "Rack Power Density" section

**Expected:** Blue info box showing:
```
🌀 Auto-Calculated Airflow: [NUMBER] CFM
Based on [SERVERS] servers × [CFM/SERVER] CFM/server × 1.2 safety margin
```

**Example Values:**
- 50 servers × 250 CFM = 15,000 CFM
- 100 servers × 280 CFM = 33,600 CFM
- 20 servers × 180 CFM = 4,320 CFM

### 2. Console Logs

**Open browser console** (F12 → Console tab)

**Expected logs:**
```
🌀 Auto-calculated airflow: 50 servers × 250 CFM/server × 1.2 margin = 15000 CFM
```

### 3. Dynamic Updates

**Test:** Change the number of servers

**Expected:** Airflow recalculates automatically
- 50 servers → 15,000 CFM
- 100 servers → 30,000 CFM
- 25 servers → 7,500 CFM

### 4. Backend Receives Correct Value

**Run simulation** and check backend console

**Expected log:**
```
🔧 FRONTEND CONFIGURATION RECEIVED:
  Max Airflow: 15000.0 CFM
```

---

## Test Scenarios

### Scenario 1: Default Configuration
1. Select server: Dell PowerEdge R740
2. Set servers: 50
3. **Expected airflow:** ~15,000 CFM

### Scenario 2: High Density
1. Select server: HP ProLiant DL380
2. Set servers: 100
3. **Expected airflow:** ~33,600 CFM

### Scenario 3: Small Deployment
1. Select server: Any
2. Set servers: 10
3. **Expected airflow:** ~2,160 CFM

---

## Verification Checklist

- [ ] Blue info box appears after Rack Power Density
- [ ] Airflow value is displayed (e.g., "15,000 CFM")
- [ ] Calculation formula is shown
- [ ] Console logs show calculation
- [ ] Value updates when server count changes
- [ ] Backend receives the calculated value
- [ ] Simulation runs successfully
- [ ] PUE is realistic (1.1-1.3)
- [ ] Availability is high (95-100%)

---

## Expected Results

### Before Auto-Calculation:
- Fixed 9000 CFM for all configurations
- May be too small or too large

### After Auto-Calculation:
- Dynamic sizing based on servers
- Optimal for each configuration
- Better cooling capacity
- More accurate simulation

---

## Troubleshooting

### Issue 1: Blue box doesn't appear
**Solution:** Refresh browser (Ctrl+R)

### Issue 2: Airflow shows 9000 CFM (old default)
**Solution:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Restart frontend dev server

### Issue 3: Console shows no logs
**Solution:** 
- Open browser console (F12)
- Check "Preserve log" option
- Refresh page

### Issue 4: Changes not appearing
**Solution:**
- Ensure file is saved
- Check Vite terminal for errors
- Restart dev server: `npm run dev`

---

## Quick Commands

### Start Frontend (if not running):
```bash
cd D:\aleezafyp\fyp
npm run dev
```

### Backend is already running:
```bash
# Already running on port 8080 ✅
# No action needed
```

### Check Backend Status:
```bash
# Look for: "Started EvaporativeCoolingApiApplication"
# Port: 8080
```

---

## Success Criteria

✅ Airflow auto-calculates based on servers  
✅ UI shows calculation clearly  
✅ Value updates dynamically  
✅ Backend receives correct value  
✅ Simulation produces realistic results  

**If all checks pass, the feature is working!** 🎉

---

## Next Steps After Testing

1. **Run a full simulation** with auto-calculated airflow
2. **Verify PUE** is 1.1-1.3 (not 81.74)
3. **Check availability** is 95-100% (not 0%)
4. **Review hourly data** for realistic values
5. **Compare results** with fixed 5000 CFM vs auto-calculated

**The system should now provide optimal airflow for any server configuration!** 🚀
