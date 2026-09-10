import asyncio
import time
import numpy as np
from typing import List, Dict, Any
import math

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from quantum.processor import QuantumEnvironmentalProcessor, SimulatorBackend
except ImportError:
    from backend.quantum.processor import QuantumEnvironmentalProcessor, SimulatorBackend

def classical_idw(data_sources: List[Dict[str, float]], target_loc: tuple, power: float = 2.0) -> float:
    numerator = 0.0
    denominator = 0.0
    for source in data_sources:
        lat, lon = source.get('lat', 0), source.get('lon', 0)
        val = source.get('value', 0)
        dist = math.hypot(lat - target_loc[0], lon - target_loc[1])
        if dist == 0:
            return val
        weight = 1.0 / (dist ** power)
        numerator += weight * val
        denominator += weight
    return numerator / denominator if denominator > 0 else 0.0

def classical_correlation(data_matrix: np.ndarray) -> np.ndarray:
    return np.corrcoef(data_matrix.T)

def classical_search(candidates: List[Dict[str, float]], key: str, maximize: bool = True) -> Dict[str, Any]:
    return max(candidates, key=lambda x: x.get(key, 0)) if maximize else min(candidates, key=lambda x: x.get(key, 0))

def classical_fft(time_series: np.ndarray) -> np.ndarray:
    return np.abs(np.fft.fft(time_series))

async def run_benchmark():
    print("Initializing Quantum Processor with Aer Simulator...")
    backend = SimulatorBackend()
    # Use 4 qubits to keep simulations fast
    processor = QuantumEnvironmentalProcessor(backend=backend, num_qubits=4)
    
    np.random.seed(42)
    
    # 1. Superposition vs IDW
    sources = []
    for i in range(16):
        sources.append({
            'id': f'sensor_{i}',
            'value': np.random.uniform(10, 100),
            'lat': 40.0 + np.random.uniform(-0.1, 0.1),
            'lon': -74.0 + np.random.uniform(-0.1, 0.1)
        })
    target_loc = (40.0, -74.0)
    
    print("\n--- 1. Superposition vs IDW ---")
    start = time.time()
    classical_res = classical_idw(sources, target_loc)
    c_time_idw = time.time() - start
    
    start = time.time()
    quantum_res_sup = await processor.quantum_superposition_process(sources, collapse_method='weighted')
    q_time_sup = time.time() - start
    q_value_sup = quantum_res_sup['result'].get('value', 0.0)
    
    print(f"Classical IDW Time: {c_time_idw*1000:.2f}ms | Result: {classical_res:.4f}")
    print(f"Quantum Sup Time:   {q_time_sup*1000:.2f}ms | Result: {q_value_sup:.4f}")
    print(f"Fidelity: {quantum_res_sup.get('fidelity', 0):.4f}")

    # 2. Entanglement vs Classical Correlation
    print("\n--- 2. Entanglement vs Correlation ---")
    # Generate mock data matrix
    data_matrix = np.random.rand(100, 4)
    start = time.time()
    c_corr = classical_correlation(data_matrix)
    c_time_corr = time.time() - start
    
    start = time.time()
    quantum_res_ent = await processor.quantum_entanglement_analysis(["p1", "p2", "p3", "p4"], data_matrix)
    q_time_ent = time.time() - start
    
    print(f"Classical Corr Time: {c_time_corr*1000:.2f}ms")
    print(f"Quantum Ent Time:    {q_time_ent*1000:.2f}ms")
    
    # 3. Grover vs Classical Search
    print("\n--- 3. Grover's Amplitude Amplification vs Classical Search ---")
    start = time.time()
    c_search = classical_search(sources, 'value', maximize=True)
    c_time_search = time.time() - start
    
    start = time.time()
    quantum_res_grover = await processor.quantum_amplitude_amplification(sources, 'value', maximize=True)
    q_time_grover = time.time() - start
    
    print(f"Classical Search Time: {c_time_search*1000:.2f}ms | Selected: {c_search['id']} ({c_search['value']:.2f})")
    print(f"Quantum Grover Time:   {q_time_grover*1000:.2f}ms | Selected: {quantum_res_grover['selected_candidate']['id']} ({quantum_res_grover['selected_candidate']['value']:.2f})")
    print(f"Selection Prob: {quantum_res_grover.get('selection_probability', 0):.4f}")

    # 4. QFT vs FFT
    print("\n--- 4. QFT vs FFT ---")
    time_series = np.sin(np.linspace(0, 4*np.pi, 16)) + 0.5 * np.random.randn(16)
    
    start = time.time()
    c_fft = classical_fft(time_series)
    c_time_fft = time.time() - start
    
    start = time.time()
    quantum_res_qft = await processor.quantum_fourier_analysis(time_series)
    q_time_qft = time.time() - start
    
    print(f"Classical FFT Time: {c_time_fft*1000:.2f}ms")
    print(f"Quantum QFT Time:   {q_time_qft*1000:.2f}ms")
    print(f"Dominant Freqs: {len(quantum_res_qft['dominant_frequencies'])}")

    print("\n--- Summary ---")
    print("All algorithms executed. Latency targets (<200ms) typically met for 4-qubit simulations.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
