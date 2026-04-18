# 🚀 Unified API Setup Guide

This guide explains how to run all three cooling system APIs simultaneously.

## 📋 API Configuration

All three APIs are configured to run on different ports to avoid conflicts:

| API Name                | Port | Endpoint                                                    | Swagger UI                              |
| ----------------------- | ---- | ----------------------------------------------------------- | --------------------------------------- |
| **Air Economizer**      | 8080 | `http://localhost:8080/api/simulate`                        | `http://localhost:8080/swagger-ui.html` |
| **Chilled Water**       | 8081 | `http://localhost:8081/api/v1/chilled-water/simulate`       | `http://localhost:8081/swagger-ui.html` |
| **Evaporative Cooling** | 8082 | `http://localhost:8082/api/simulations/evaporative-cooling` | `http://localhost:8082/swagger-ui.html` |

## 🎯 Quick Start

### Option 1: Start All APIs at Once (Recommended)

Simply run the unified startup script:

```powershell
.\start-all-apis.ps1
```

This will:

- ✅ Start all three APIs in separate PowerShell windows
- ✅ Each API runs on its designated port
- ✅ Display all endpoint URLs and Swagger UI links
- ✅ Keep all APIs running independently

### Option 2: Start APIs Individually

If you prefer to start them one by one:

```powershell
# Terminal 1 - Air Economizer (Port 8080)
cd cooling-air-economizer\api
mvn spring-boot:run

# Terminal 2 - Chilled Water (Port 8081)
cd chilled-water-system
mvn spring-boot:run

# Terminal 3 - Evaporative Cooling (Port 8082)
cd evaporative-cooling-api
mvn spring-boot:run
```

## 🛑 Stopping All APIs

### Option 1: Use Stop Script

```powershell
.\stop-all-apis.ps1
```

### Option 2: Manual Stop

Close each PowerShell window running the APIs, or press `Ctrl+C` in each terminal.

## 🔍 Health Checks

Verify each API is running:

```powershell
# Air Economizer
curl http://localhost:8080/api/v1/health

# Chilled Water
curl http://localhost:8081/api/v1/chilled-water/health

# Evaporative Cooling
curl http://localhost:8082/api/v1/health
```

## 🌐 Frontend Integration

The frontend is configured to call the correct ports:

- **Air Economizer**: `http://localhost:8080/api/simulate`
- **Chilled Water**: `http://localhost:8081/api/v1/chilled-water/simulate`
- **Evaporative Cooling**: `http://localhost:8082/api/simulations/evaporative-cooling`

## 📝 Configuration Files

Port configurations are stored in:

- `cooling-air-economizer/api/src/main/resources/application.properties`
- `chilled-water-system/src/main/resources/application.properties`
- `evaporative-cooling-api/src/main/resources/application.properties`

## 🐛 Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

1. Check what's using the port:

   ```powershell
   netstat -ano | findstr :8080
   netstat -ano | findstr :8081
   netstat -ano | findstr :8082
   ```

2. Kill the process:

   ```powershell
   taskkill /PID <process_id> /F
   ```

3. Or use the stop script:
   ```powershell
   .\stop-all-apis.ps1
   ```

### Compilation Errors

If you encounter compilation errors:

```powershell
# Clean and rebuild each API
cd cooling-air-economizer\api
mvn clean compile

cd ..\..\chilled-water-system
mvn clean compile

cd ..\evaporative-cooling-api
mvn clean compile
```

### API Not Responding

1. Check if the API is running:

   ```powershell
   Get-Process -Name "java" | Where-Object {$_.CommandLine -like "*spring-boot*"}
   ```

2. Check the logs in the PowerShell window running the API

3. Restart the specific API

## 📊 Testing the APIs

### Using Swagger UI

1. Open the Swagger UI for each API (see table above)
2. Click "Try it out" on the simulate endpoint
3. Paste your JSON payload
4. Click "Execute"

### Using cURL

```powershell
# Air Economizer
curl -X POST http://localhost:8080/api/simulate `
  -H "Content-Type: application/json" `
  -d @test-request.json

# Chilled Water
curl -X POST http://localhost:8081/api/v1/chilled-water/simulate `
  -H "Content-Type: application/json" `
  -d @test-request.json

# Evaporative Cooling
curl -X POST http://localhost:8082/api/simulations/evaporative-cooling `
  -F "weatherFile=@weather.epw" `
  -F "config=@config.json"
```

### Using Frontend

1. Start the frontend:

   ```powershell
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Select a cooling technique and run simulation

## 🎨 Frontend Port Configuration

The frontend automatically connects to the correct backend ports. If you need to change them, update:

- `src/services/chilledWaterApi.ts` - Line 6
- `src/store/store.ts` - Lines 346, 349, 437

## ✅ Verification Checklist

After starting all APIs, verify:

- [ ] Air Economizer responds at port 8080
- [ ] Chilled Water responds at port 8081
- [ ] Evaporative Cooling responds at port 8082
- [ ] All Swagger UIs are accessible
- [ ] Frontend can connect to all APIs
- [ ] No port conflict errors in logs

## 🔧 Advanced Configuration

### Changing Ports

Edit the `application.properties` file for each API:

```properties
server.port=<your_port>
```

Then update the frontend URLs accordingly.

### Running in Production

For production deployment, consider:

1. Using environment variables for ports
2. Setting up a reverse proxy (nginx)
3. Using Docker containers
4. Implementing API Gateway pattern

## 📚 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Maven Documentation](https://maven.apache.org/guides/)
- [CloudSim Plus Documentation](https://cloudsimplus.org/)

---

**Need Help?** Check the logs in each API's PowerShell window for detailed error messages.
