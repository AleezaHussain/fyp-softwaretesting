# ⚡ Quick Start - All APIs

## 🚀 Start Everything

```powershell
.\start-all-apis.ps1
```

## 🛑 Stop Everything

```powershell
.\stop-all-apis.ps1
```

## 📍 API Endpoints

```
Air Economizer:      http://localhost:8080/api/simulate
Chilled Water:       http://localhost:8081/api/v1/chilled-water/simulate
Evaporative Cooling: http://localhost:8082/api/simulations/evaporative-cooling
```

## 🔍 Swagger UI

```
Air Economizer:      http://localhost:8080/swagger-ui.html
Chilled Water:       http://localhost:8081/swagger-ui.html
Evaporative Cooling: http://localhost:8082/swagger-ui.html
```

## ✅ Health Checks

```powershell
curl http://localhost:8080/api/v1/health
curl http://localhost:8081/api/v1/chilled-water/health
curl http://localhost:8082/api/v1/health
```

That's it! 🎉
