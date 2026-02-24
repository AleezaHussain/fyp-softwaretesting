# 🎯 Complete Setup Summary - All APIs Running Simultaneously

## ✅ What Was Done

### 1. Port Configuration Changes

All three APIs were reconfigured to use different ports to avoid conflicts:

| API | Old Port | New Port | Status |
|-----|----------|----------|--------|
| Air Economizer | 8080 | **8080** | ✅ No change |
| Chilled Water | 8080 | **8081** | ✅ Changed |
| Evaporative Cooling | 8080 | **8082** | ✅ Changed |

### 2. Backend Configuration Files Updated

✅ **`cooling-air-economizer/api/src/main/resources/application.properties`**
```properties
server.port=8080  # Air Economizer
```

✅ **`chilled-water-system/src/main/resources/application.properties`**
```properties
server.port=8081  # Chilled Water (CHANGED from 8080)
```

✅ **`evaporative-cooling-api/src/main/resources/application.properties`**
```properties
server.port=8082  # Evaporative Cooling (CHANGED from 8080)
```

### 3. Frontend API Calls Updated

✅ **`src/services/chilledWaterApi.ts`** (Line 6)
```typescript
const API_BASE_URL = 'http://localhost:8081/api/v1';  // CHANGED to 8081
```

✅ **`src/store/store.ts`** (Line 349)
```typescript
fetch("http://localhost:8082/api/simulations/evaporative-cooling", ...)  // CHANGED to 8082
```

✅ **`src/store/store.ts`** (Line 437)
```typescript
fetch("http://localhost:8080/api/simulate", ...)  // Air Economizer - No change
```

✅ **`src/components/simulation/AirSideEconomizerFallback.tsx`** (Line 86)
```typescript
fetch("http://localhost:8080/api/simulate", ...)  // Air Economizer - No change
```

### 4. Utility Scripts Created

✅ **`start-all-apis.ps1`** - One-click startup for all APIs
✅ **`stop-all-apis.ps1`** - One-click shutdown for all APIs  
✅ **`test-all-apis.ps1`** - Verify all APIs are running correctly
✅ **`API_SETUP_GUIDE.md`** - Comprehensive setup documentation
✅ **`QUICK_START.md`** - Quick reference guide
✅ **`FRONTEND_API_CONFIGURATION.md`** - Frontend-backend mapping details

---

## 🚀 How to Use

### Start All APIs (One Command!)

```powershell
.\start-all-apis.ps1
```

This will:
- Open 3 separate PowerShell windows
- Start Air Economizer on port 8080
- Start Chilled Water on port 8081
- Start Evaporative Cooling on port 8082
- Display all endpoint URLs

### Test All APIs

```powershell
.\test-all-apis.ps1
```

This will verify:
- All ports are listening
- Health endpoints respond
- APIs are ready to receive requests

### Stop All APIs

```powershell
.\stop-all-apis.ps1
```

This will:
- Find all running Spring Boot processes
- Stop them gracefully
- Clean up resources

---

## 📍 API Endpoints Reference

### Air Economizer (Port 8080)
```
Simulate:   POST http://localhost:8080/api/simulate
Health:     GET  http://localhost:8080/api/v1/health
Swagger:    http://localhost:8080/swagger-ui.html
```

### Chilled Water (Port 8081)
```
Simulate:   POST http://localhost:8081/api/v1/chilled-water/simulate
Health:     GET  http://localhost:8081/api/v1/chilled-water/health
Swagger:    http://localhost:8081/swagger-ui.html
```

### Evaporative Cooling (Port 8082)
```
Simulate:   POST http://localhost:8082/api/simulations/evaporative-cooling
Health:     GET  http://localhost:8082/api/v1/health
Swagger:    http://localhost:8082/swagger-ui.html
```

---

## 🎨 Frontend Integration

The frontend automatically routes to the correct API based on the selected cooling technique:

```typescript
// User selects "Air Economizer"
→ Calls http://localhost:8080/api/simulate

// User selects "Chilled Water"  
→ Calls http://localhost:8081/api/v1/chilled-water/simulate

// User selects "Evaporative Cooling"
→ Calls http://localhost:8082/api/simulations/evaporative-cooling
```

**No manual configuration needed!** Just start all APIs and run your frontend.

---

## 🔍 Verification Checklist

After running `.\start-all-apis.ps1`, verify:

- [ ] Three PowerShell windows opened
- [ ] Air Economizer shows "Tomcat started on port 8080"
- [ ] Chilled Water shows "Tomcat started on port 8081"
- [ ] Evaporative Cooling shows "Tomcat started on port 8082"
- [ ] Run `.\test-all-apis.ps1` - all tests pass
- [ ] Open Swagger UI for each API (see URLs above)
- [ ] Start frontend with `npm run dev`
- [ ] Test each cooling technique in the UI

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                     │
│                  React + TypeScript + Zustand               │
└────────────┬────────────┬────────────┬─────────────────────┘
             │            │            │
             │            │            │
    ┌────────▼───┐  ┌────▼─────┐  ┌──▼──────────┐
    │   Air      │  │ Chilled  │  │ Evaporative │
    │ Economizer │  │  Water   │  │   Cooling   │
    │            │  │          │  │             │
    │ Port 8080  │  │Port 8081 │  │ Port 8082   │
    └────────────┘  └──────────┘  └─────────────┘
         │               │              │
         │               │              │
    ┌────▼───────────────▼──────────────▼─────┐
    │         CloudSim Plus Engine            │
    │    (Datacenter Simulation Framework)    │
    └─────────────────────────────────────────┘
```

---

## 🎯 Quick Commands

```powershell
# Start everything
.\start-all-apis.ps1

# Test everything
.\test-all-apis.ps1

# Stop everything
.\stop-all-apis.ps1

# Check what's running
Get-Process -Name "java" | Where-Object {$_.CommandLine -like "*spring-boot*"}

# Check specific port
netstat -ano | findstr :8080
netstat -ano | findstr :8081
netstat -ano | findstr :8082
```

---

## 🐛 Troubleshooting

### Problem: Port already in use

**Solution:**
```powershell
.\stop-all-apis.ps1
.\start-all-apis.ps1
```

### Problem: API not responding

**Check the PowerShell window** for that API - look for error messages

**Common issues:**
- Compilation errors → Run `mvn clean compile` in that API's directory
- Missing dependencies → Run `mvn clean install` in the root directory
- Java version issues → Ensure Java 17+ is installed

### Problem: Frontend can't connect to API

**Verify:**
1. API is running: `.\test-all-apis.ps1`
2. Correct port in frontend code (see FRONTEND_API_CONFIGURATION.md)
3. CORS is enabled in backend (already configured)
4. No firewall blocking localhost connections

---

## ✨ Benefits of This Setup

✅ **No Port Conflicts** - All APIs run simultaneously  
✅ **Easy Management** - One command to start/stop all  
✅ **Independent Development** - Work on one API without affecting others  
✅ **Easy Testing** - Test all cooling techniques without restarting  
✅ **Production Ready** - Can deploy each API independently  
✅ **Clear Separation** - Each API has its own port and endpoint structure

---

## 📚 Documentation Files

- **`API_SETUP_GUIDE.md`** - Detailed setup and troubleshooting
- **`QUICK_START.md`** - Quick reference for common commands
- **`FRONTEND_API_CONFIGURATION.md`** - Frontend-backend port mapping
- **`COMPLETE_SETUP_SUMMARY.md`** - This file

---

## 🎉 You're All Set!

Everything is configured and ready to go. Just run:

```powershell
.\start-all-apis.ps1
```

Then start your frontend:

```powershell
npm run dev
```

**All three cooling techniques will work simultaneously!** 🚀

---

**Last Updated:** February 24, 2026  
**Status:** ✅ Fully Configured and Tested  
**Chilled Water API:** ✅ Compiled Successfully (Lombok removed, plain Java getters/setters)
