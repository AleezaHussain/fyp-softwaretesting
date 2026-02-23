To implement the **Phase 1: Dynamic Physics Layer**, you need to transition your methodology from static values to equations that respond to simulation variables.

Here is the step-by-step improvement plan for Phase 1:

### Step 1: Implement the Fan Affinity Laws

In your current output, the fan power is a constant **2.178 kW**. In a dynamic simulation, the fan speed should scale with the IT load. Cooling fans consume power proportional to the **cube** of the airflow rate.

* **The Logic:** If your servers are at 40% utilization, they require less airflow. Reducing fan speed by 20% reduces power consumption by nearly 50%.
* **The Implementation:**
```java
// Calculate required airflow based on current IT Load (Q)
double requiredCFM = (currentItLoadKw * 3160) / (deltaT_target * 1.08); 

// Scale Fan Power using Affinity Laws
double speedRatio = requiredCFM / maxAirflowCapacity;
double dynamicFanPower = baseFanPower * Math.pow(speedRatio, 3);

```



### Step 2: Velocity-Dependent Saturation Effectiveness

Currently, your `saturationEffectiveness` is a fixed **85%**. However, effectiveness is a function of the air's "dwell time" on the wetted media. As airflow increases (higher face velocity), effectiveness drops.

* **The Logic:** When AI workloads spike and fans hit 100%, the air moves too fast to reach full saturation.
* **The Implementation:**
```java
// Linear degradation model based on your input 'faceVelocity' (m/s)
double referenceVelocity = 2.0; // Your input value
double currentVelocity = referenceVelocity * speedRatio;

// Decrease effectiveness as velocity exceeds reference
double adjustedEffectiveness = baseEffectiveness * (1.0 - 0.05 * (currentVelocity - referenceVelocity));

```



### Step 3: Dynamic DX COP Degradation

In your methodology, the DX backup has a static **3.5 COP**. Real mechanical cooling efficiency drops as the ambient temperature rises because the compressor must work harder against the high-pressure head.

* **The Logic:** During a summer heatwave, your energy costs will spike not just because the DX is *on*, but because it is performing *worse*.
* **The Implementation:**
```java
// Standard COP degradation: ~2-3% loss per degree Celsius above 25°C
double ambientT = weather.getDryBulb();
double dynamicCOP = baseCOP;
if (ambientT > 25.0) {
    dynamicCOP = baseCOP * (1.0 - 0.025 * (ambientT - 25.0));
}

```



### Step 4: Integration of Thermal Mass (Transient Delay)

Your `input-evaporative.txt` specifies a `rackThermalMass` of **15 kJ/K**. You should use this to prevent the "Inlet Temperature" from jumping instantly.

* **The Logic:** Data centers have "thermal inertia." If an AI training job starts, the air doesn't get hot immediately; the metal racks and server chassis absorb heat first.
* **The Implementation:**
```java
// Thermal balance equation for the next time step (dt)
double heatAbsorbed = (totalHeatLoad - coolingProvided) * dt;
double tempRise = heatAbsorbed / (totalThermalMass);
currentInletTemp += tempRise;

```



### Summary of Improvements for Phase 1

| Variable | Current State | Improved State (Phase 1) |
| --- | --- | --- |
| **Fan Power** | Constant 2.178 kW | Cubed function of CFM |
| **Effectiveness** | Static 85% | Inversely linked to Face Velocity |
| **DX Efficiency** | Fixed 3.5 COP | Degrades by 2.5% per °C over 25°C |
| **Inlet Temp** | Instantaneous | Smoothed by Rack/Enclosure Thermal Mass |

**By implementing these four steps, your "Calculated TCO" will be much more accurate, especially when simulating the transition from 2025 to 2030 climate scenarios. Ready to see the Java class that handles the Step 1 (Fan Affinity) calculations?**