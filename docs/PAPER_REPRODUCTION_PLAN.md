# Paper Reproduction Plan (AetherScan V1)

## Objective
AetherScan V1 must serve as a faithful, verifiable reproduction of the published research preprint. A competent researcher reading the paper must be able to trace its computational claims to this implementation.

## Core Directives
1. **Zero Fake Data**: All data must be fetched from verifiable public APIs or official datasets.
2. **Simulator Transparency**: All quantum computations are simulated on `qiskit_aer`. The UI must explicitly state this.
3. **Classical Baselines**: Every quantum result must be benchmarked against a classical equivalent.

## Reproduction Milestones

### Milestone 1: Heterogeneous Sensor Fusion
- **Paper Claim**: Quantum superposition provides implicit weighting based on phase interference across an 8-qubit register.
- **V1 Implementation**:
  - Connect `quantum_superposition_process()` to the data ingestion pipeline.
  - Implement a parallel classical IDW (Inverse Distance Weighting) or robust median pipeline.
  - **Validation**: Demonstrate convergence of implicit weighting under varying AQI inputs.

### Milestone 2: Pollutant Correlation (Bell-state)
- **Paper Claim**: Quantum parameter correlation via $\langle Z \otimes Z \rangle$ witnesses.
- **V1 Implementation**:
  - Inject real-world multi-pollutant vectors (e.g., PM2.5 and PM10).
  - Compute classical cosine similarity.
  - **Validation**: Show that `quantum_entanglement_analysis()` yields the mathematical equivalent of cosine similarity.

### Milestone 3: Grover's Station Selection
- **Paper Claim**: Selection of the optimal candidate using Grover's amplitude amplification.
- **V1 Implementation**:
  - Formalize a spatial/temporal "station quality score".
  - Feed $N=4$ or $N=8$ candidate stations into `quantum_amplitude_amplification()`.
  - **Validation**: Verify the oracle correctly marks the highest-scoring candidate and amplification selects it with high probability.

### Milestone 4: QFT Temporal Periodicity
- **Paper Claim**: Extraction of diurnal cycles from hourly AQI data using QFT.
- **V1 Implementation**:
  - Feed $N=16$ real historical AQI hourly readings into `quantum_fourier_analysis()`.
  - Compare results to a classical FFT.
  - **Validation**: Detect the 8-hour and 16-hour cyclic peaks as claimed.

## Scientific Record Keeping
Every reproduced experiment must generate an explicit log containing:
- Experiment ID
- Input dataset & provenance
- Classical result & runtime
- Quantum (simulator) result & runtime
- Conclusion on accuracy and utility
