# Air Economizer API Endpoint Check

## ✅ BACKEND CONFIGURATION

**API Location:** `cooling-air-economizer/api/`

**Controller:** `SimulationController.java`
- **Endpoint:** `POST /api/simulation/run`
- **Port:** `8080` (from `application.properties`)
- **Full URL:** `http://localhost:8080/api/simulation/run`

**Status:** ✅ **RUNNING** (Terminal ID: 2)

## ✅ FRONTEND CONFIGURATION

**Store:** `src/store/store.ts` (line 1417)

**API Call:**
```typescript
response = await fetch("http://localhost:8080/api/simulation/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: abortSignal,
});
```

## ⚠️ POTENTIAL ISSUE DETECTED

### Port Conflict Warning

The Air Economizer API is configured to run on **port 8080**, which is the **SAME PORT** as the Chilled Water API:

1. **Chilled Water API:** `http://localhost:8081/api/v1/chilled-water/simulate` (should be 8081)
2. **Air Economizer API:** `http://localhost:8080/api/simulation/run` (currently 8080)

### Current Status

- ✅ Frontend is correctly calling: `http://localhost:8080/api/simulation/run`
- ✅ Backend is correctly exposing: `POST /api/simulation/run` on port 8080
- ⚠️ **BUT**: If Chilled Water API is also running on 8080, there will be a conflict

## 🔧 RECOMMENDED FIX

Change the Air Economizer API port to **8082** to avoid conflicts:

### 1. Update Backend Port

**File:** `cooling-air-economizer/api/src/main/resources/application.properties`

```properties
# Change from:
server.port=8080

# To:
server.port=8082
```

### 2. Update Frontend API Call

**File:** `src/store/store.ts` (line ~1417)

```typescript
// Change from:
response = await fetch("http://localhost:8080/api/simulation/run", {

// To:
response = await fetch("http://localhost:8082/api/simulation/run", {
```

### 3. Add Environment Variable (Optional)

**File:** `.env.local`

Add:
```env
VITE_AIR_ECONOMIZER_API_URL=http://localhost:8082
```

Then update the fetch call to use:
```typescript
const apiUrl = import.meta.env.VITE_AIR_ECONOMIZER_API_URL || "http://localhost:8082";
response = await fetch(`${apiUrl}/api/simulation/run`, {
```

## 📊 API Port Summary

| Cooling System | Port | Endpoint |
|----------------|------|----------|
| Chilled Water | 8081 | `/api/v1/chilled-water/simulate` |
| **Air Economizer** | **8082** (recommended) | `/api/simulation/run` |
| Evaporative | 8083 | `/api/evaporative/simulate` |

## ✅ VERIFICATION STEPS

After making changes:

1. Stop the current Air Economizer API (Terminal ID: 2)
2. Update `application.properties` to port 8082
3. Rebuild: `mvn clean package -DskipTests`
4. Restart: `mvn spring-boot:run`
5. Update frontend `store.ts` to use port 8082
6. Test the simulation from the UI

## 🎯 CONCLUSION

The frontend is **correctly configured** to call the Air Economizer API endpoint, but there's a **port conflict** that needs to be resolved. The endpoint path `/api/simulation/run` is correct and matches the backend controller.
