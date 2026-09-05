# Paper to Code Traceability Matrix

## Executive Summary
This document traces the claims made in the AetherScan research paper to their actual implementations in the codebase as of the Phase 0 forensic audit.

## Traceability Matrix

| Paper Claim | Claimed Mechanism | Existing Implementation | Evidence | Missing Implementation | Required Implementation | Validation Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Heterogeneous Sensor Fusion** | 8-qubit quantum circuit for parallel data fusion | `processor.py: quantum_superposition_process()` | Statevector simulation with Hadamard, $R_Z$ encoding, and CNOT cascade. | Dynamic integration with varying numbers of real-world sources without hardcoding. | True data injection from OpenAQ/AQICN into the fusion pipeline. | Verify against classical baselines (e.g. weighted mean). |
| **Parameterized Phase-Rotation Encoding** | Mapping normalized AQI readings to $R_Z$ phase angles. | `processor.py: _encode_data_to_phases()` | Function normalizes values to phase angles and binds them to the circuit parameters. | - | - | Validate the correctness of phase extraction and its effect on measurement probabilities. |
| **Bell-state Pollutant Correlation** | $H \to CNOT$ on $|00\rangle$ to quantify pairwise parameter similarity via $\langle Z \otimes Z \rangle$ witness | `processor.py: quantum_entanglement_analysis()` | Circuit creates Bell pairs and applies data-dependent $R_Z$ rotations, measuring parity. | - | Real-time calculation on actual environmental data instead of arbitrary inputs. | Check mathematical equivalence of correlation witness to actual cosine similarity on real data. |
| **Grover Station Ranking** | $O(\sqrt{N})$ unstructured search via oracle marking highest-scoring station | `processor.py: quantum_amplitude_amplification()` | 2-qubit Grover iteration with Oracle and Diffusion operator implemented for 4 candidates. | - | Scaling to more candidates or formalizing the station score function. | No real speedup exists on simulator, but verify algorithmic correctness for selection. |
| **QFT Temporal Periodicity** | QFT on amplitude-encoded time series to detect diurnal cycles | `processor.py: quantum_fourier_analysis()` | Amplitude normalization of time series, applied QFT, and frequency bin analysis. | - | Integration with real time-series from database. | Compare against classical FFT/periodogram for accuracy and robustness. |
| **Real-time Environmental Intelligence** | 30+ REST endpoints, 26 layers, external APIs | FastAPI backend + Next.js frontend | 26 layers referenced in `README.md`, FastAPI routes present. | Reliable ingestion without hardcoded values. | Robust ingestion pipelines (OpenAQ, FIRMS, etc.). | Check true end-to-end latency with real APIs. |
| **Performance Claims** | Circuit execution < 200ms on i5-12400 | Implemented via Qiskit Aer Statevector simulator | Cache mechanism implemented for pre-transpiled circuits. | - | - | True load testing with multiple concurrent users. |
| **8-qubit Implementation** | Qiskit circuits parameterized to 8 qubits | `processor.py` initializes 8-qubit registers for fusion. | `n_q = 8` in code. | - | - | Verify circuit depth scaling. |
