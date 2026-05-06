# 🚀 Complete FYP System Startup Guide

This guide walks you through starting all components of your final FYP project step-by-step.

## 📋 System Overview

Your FYP consists of:
- **3 Java Spring Boot APIs** (Cooling Simulations)
- **5 Python FastAPI Services** (ML & Analysis)
- **1 React/TypeScript Frontend** (Vite)
- **1 Database** (Supabase - already configured)

## ⚙️ Prerequisites

Before starting, ensure you have:
- ✅ Java 17+ installed
- ✅ Maven installed
- ✅ Node.js 18+ installed
- ✅ Python 3.9+ installed
- ✅ Git (already done - you pulled from friend's branch)

## 🔍 Verify Prerequisites

```powershell
# Check Java
java -version

# Check Maven
mvn -version

# Check Node.js
node -v
npm -v

# Check Python
python --version
```

---

## 📂 Project Structure

```
fyp-root/
├── chilled-water-system/          (Java - Port 8081)
├── cooling-air-economizer/        (Java - Port 8080)
├── evaporative-cooling-api/       (Java - Port 8082)
├── src/                           (React Frontend - Port 5173)
├── advisory_api.py                (Python - Port 8002)
├── recommend_api.py               (Python - Port 8001)
├── graph_explanation_api.py       (Python - Port 8004)
├── metrics_explanation_api.py     (Python - Port 8005)
├── rawdata_explanation_api.py     (Python - Port 8006)
├── weather_api.py                 (Python - Port 8085)
└── .env.local                     (Configuration - already set up)
```

---

## 🎯 Step-by-Step Startup Instructions

### **STEP 1: Clean Up Any Previous Processes (Optional)**

If you have old processes running on the ports, kill them:

```powershell
# Check what's using port 8080
netstat -ano | findstr :8080

# If something is using it, kill it (replace PID with actual number)
taskkill /PID 5004 /F

# Repeat for other ports if needed
netstat -ano | findstr :8081
netstat -ano | findstr :8082
netstat -ano | findstr :8001
netstat -ano | findstr :8002
```

---

### **STEP 2: Set Up Python Virtual Environment**

Open PowerShell and run:

```powershell
# Navigate to project root
cd D:\aleezafyp\fyp  # or your project path

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate again
.\.venv\Scripts\Activate.ps1
```

---

### **STEP 3: Install Python Dependencies**

```powershell
# Make sure virtual environment is activated (you should see (.venv) in prompt)

# Install required packages
pip install fastapi uvicorn pydantic supabase python-multipart

# Verify installation
pip list
```

---

### **STEP 4: Start Java APIs (3 Terminal Windows)**

Open **3 separate PowerShell windows** and run these commands:

#### **Terminal 1: Air Economizer API (Port 8080)**
```powershell
cd D:\aleezafyp\fyp\cooling-air-economizer\api
mvn spring-boot:run
```
✅ Wait for: `Started ... in X seconds`

#### **Terminal 2: Chilled Water API (Port 8081)**
```powershell
cd D:\aleezafyp\fyp\chilled-water-system
mvn spring-boot:run
```
✅ Wait for: `Started ... in X seconds`

#### **Terminal 3: Evaporative Cooling API (Port 8082)**
```powershell
cd D:\aleezafyp\fyp\evaporative-cooling-api
mvn spring-boot:run
```
✅ Wait for: `Started ... in X seconds`

---

### **STEP 5: Start Python APIs (5 Terminal Windows)**

Open **5 more PowerShell windows** and run these commands:

#### **Terminal 4: Recommendation API (Port 8001)**
```powershell
cd D:\aleezafyp\fyp
# Make sure virtual environment is activated
.\.venv\Scripts\Activate.ps1
python -m uvicorn recommend_api:app --host 0.0.0.0 --port 8001 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8001`

#### **Terminal 5: Advisory API (Port 8002)**
```powershell
cd D:\aleezafyp\fyp
.\.venv\Scripts\Activate.ps1
python -m uvicorn advisory_api:app --host 0.0.0.0 --port 8002 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8002`

#### **Terminal 6: Graph Explanation API (Port 8004)**
```powershell
cd D:\aleezafyp\fyp
.\.venv\Scripts\Activate.ps1
python -m uvicorn graph_explanation_api:app --host 0.0.0.0 --port 8004 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8004`

#### **Terminal 7: Metrics Explanation API (Port 8005)**
```powershell
cd D:\aleezafyp\fyp
.\.venv\Scripts\Activate.ps1
python -m uvicorn metrics_explanation_api:app --host 0.0.0.0 --port 8005 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8005`

#### **Terminal 8: Raw Data Explanation API (Port 8006)**
```powershell
cd D:\aleezafyp\fyp
.\.venv\Scripts\Activate.ps1
python -m uvicorn rawdata_explanation_api:app --host 0.0.0.0 --port 8006 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8006`

#### **Terminal 9: Weather API (Port 8085)**
```powershell
cd D:\aleezafyp\fyp
.\.venv\Scripts\Activate.ps1
uvicorn weather_api:app --host 0.0.0.0 --port 8085 --reload
```
✅ Wait for: `Uvicorn running on http://0.0.0.0:8085`

---

### **STEP 6: Start Frontend (1 Terminal Window)**

Open **1 more PowerShell window**:

#### **Terminal 10: React Frontend (Port 5173)**
```powershell
cd D:\aleezafyp\fyp
npm run dev
```
✅ Wait for: `VITE v... ready in X ms`

---

## ✅ Verification Checklist

Once all services are running, verify they're working:

### **Check Java APIs**
```powershell
# In a new PowerShell window
curl http://localhost:8080/swagger-ui.html
curl http://localhost:8081/swagger-ui.html
curl http://localhost:8082/swagger-ui.html
```

### **Check Python APIs**
```powershell
curl http://localhost:8001/docs
curl http://localhost:8002/docs
curl http://localhost:8004/docs
curl http://localhost:8005/docs
curl http://localhost:8006/docs
curl http://localhost:8085/docs
```

### **Check Frontend**
Open browser: `http://localhost:5173`

---

## 📊 Port Summary

| Service | Port | Type | Status |
|---------|------|------|--------|
| Air Economizer API | 8080 | Java | ✅ |
| Chilled Water API | 8081 | Java | ✅ |
| Evaporative Cooling API | 8082 | Java | ✅ |
| Recommendation API | 8001 | Python | ✅ |
| Advisory API | 8002 | Python | ✅ |
| Graph Explanation API | 8004 | Python | ✅ |
| Metrics Explanation API | 8005 | Python | ✅ |
| Raw Data Explanation API | 8006 | Python | ✅ |
| Weather API | 8085 | Python | ✅ |
| Frontend (Vite) | 5173 | React | ✅ |

---

## 🛑 Stopping All Services

To stop everything gracefully:

```powershell
# In each terminal window, press: Ctrl + C

# Or use the stop script if available:
.\stop-all-apis.ps1
```

---

## 🐛 Troubleshooting

### **Port Already in Use**
```powershell
# Find what's using the port
netstat -ano | findstr :PORT_NUMBER

# Kill the process
taskkill /PID PROCESS_ID /F
```

### **Maven Build Fails**
```powershell
# Clean and rebuild
mvn clean install

# Or skip tests
mvn clean install -DskipTests
```

### **Python Module Not Found**
```powershell
# Reinstall dependencies
pip install --upgrade pip
pip install fastapi uvicorn pydantic supabase python-multipart
```

### **Virtual Environment Issues**
```powershell
# Deactivate and reactivate
deactivate
.\.venv\Scripts\Activate.ps1
```

### **Frontend Not Loading**
```powershell
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

---

## 📝 Quick Reference Commands

```powershell
# Activate Python environment
.\.venv\Scripts\Activate.ps1

# Start all Java APIs (from project root)
cd cooling-air-economizer\api && mvn spring-boot:run
cd chilled-water-system && mvn spring-boot:run
cd evaporative-cooling-api && mvn spring-boot:run

# Start all Python APIs (from project root with venv activated)
python -m uvicorn recommend_api:app --host 0.0.0.0 --port 8001 --reload
python -m uvicorn advisory_api:app --host 0.0.0.0 --port 8002 --reload
python -m uvicorn graph_explanation_api:app --host 0.0.0.0 --port 8004 --reload
python -m uvicorn metrics_explanation_api:app --host 0.0.0.0 --port 8005 --reload
python -m uvicorn rawdata_explanation_api:app --host 0.0.0.0 --port 8006 --reload
uvicorn weather_api:app --host 0.0.0.0 --port 8085 --reload

# Start frontend
npm run dev
```

---

## 🎉 You're All Set!

Once all services are running:
1. Open `http://localhost:5173` in your browser
2. The frontend will connect to all backend APIs
3. You can now run cooling simulations and get recommendations

**Total Services Running**: 10 (3 Java + 5 Python + 1 React + 1 Database)

---

## 📞 Need Help?

If something doesn't work:
1. Check the error message in the terminal
2. Verify the port is not in use
3. Make sure all prerequisites are installed
4. Check `.env.local` configuration
5. Review the troubleshooting section above

Good luck with your FYP! 🚀
