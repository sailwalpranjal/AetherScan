# Quantum Architecture

## 1. Abstraction Layer
The quantum processing module must abstract the backend to seamlessly swap between simulators and real hardware, decoupling business logic from QPU execution.

```python
class QuantumBackend(ABC):
    @abstractmethod
    def execute(self, circuit: QuantumCircuit, shots: int) -> Dict:
        pass

class SimulatorBackend(QuantumBackend):
    # Wraps qiskit_aer.AerSimulator
    pass

class IBMHardwareBackend(QuantumBackend):
    # Wraps qiskit_ibm_provider for actual QPU execution
    # Rate limited, async job polling
    pass
```

## 2. Algorithms
1. **Superposition Fusion**: Encodes $N$ data sources into $N$ qubits via $R_Z$ rotations, entangles via CNOT cascade, and collapses to a weighted average.
2. **Bell-state Correlation**: Prepares Bell pairs, encodes two parameters via $R_Z$, and uses parity measurement ($\langle Z \otimes Z \rangle$) as a cosine similarity witness.
3. **Grover's Station Selection**: Uses oracle marking and amplitude amplification to find the highest-scoring candidate among unstructured stations.
4. **QFT Temporal Periodicity**: Encodes hourly time-series into state amplitudes and applies Quantum Fourier Transform to extract diurnal frequencies.

## 3. Transparency & Benchmarking
- **No Fake Claims**: Simulator execution must be labeled "CLASSICAL SIMULATOR".
- **Baselines**: Every quantum endpoint must log a comparison with a classical algorithm (e.g., IDW, FFT, Cosine Similarity) to prove mathematical equivalence or divergence.
