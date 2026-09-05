# AetherScan Limitations

## 1. Scientific & Quantum Limitations
- **Quantum Hardware**: AetherScan currently executes circuits entirely on the Qiskit Aer classical simulator. No actual quantum speedup occurs. All latency metrics reflect simulator throughput, not QPU execution.
- **Fusion Baseline**: The paper's quantum implicit weighting fusion method has not yet been rigorously benchmarked against classical models (e.g. robust Bayesian fusion or calibrated IDW) on verified ground-truth datasets.
- **8-Qubit Ceiling**: Superposition fusion is currently bounded to 8 simultaneous sources due to statevector size and scaling logic. 
- **Causation vs Correlation**: The platform detects correlations (e.g. between active fires and elevated AQI) but does not definitively prove causation.

## 2. Infrastructure Limitations
- **Ephemeral Storage**: The backend is designed for the Render free tier, which resets its filesystem upon spin-down. Persistent operations (caching, logging) must be migrated to a dedicated database.
- **Cold Starts**: Render free tier instances spin down after inactivity, causing 8-15 second cold start delays.
- **API Rate Limits**: Over-reliance on live third-party APIs (AQICN, OpenAQ) can result in data unavailability if rate limits are exceeded. Robust caching and fallback states are required.

## 3. Geospatial & Data Limitations
- **Spatial Resolution**: Satellite column densities (e.g., TROPOMI NO2 at 7x3.5 km) are fundamentally different from point-source ground sensors. Fusing them requires careful spatial representation which may introduce artifacts.
- **Data Freshness**: Satellite passes are infrequent (e.g., once daily), causing temporal misalignment with real-time ground sensors.
