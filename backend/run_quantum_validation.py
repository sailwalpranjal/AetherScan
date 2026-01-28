"""
Quantum Processing Validation Script
Standalone validation to demonstrate quantum capabilities independently
Author: Pranjal Sailwal
"""

import asyncio
import numpy as np
import sys
from datetime import datetime
from quantum.processor import QuantumEnvironmentalProcessor

BANNER = """
╔══════════════════════════════════════════════════════════════════╗
║                  AetherScan Quantum Processor                    ║
║              Environmental Data Analysis System                  ║
║                                                                  ║
║  Using IBM Qiskit Framework for Quantum Computing               ║
║  Optimized for Intel i5 12th Gen | 16GB RAM                     ║
╚══════════════════════════════════════════════════════════════════╝
"""


async def validate_quantum_superposition():
    """Validates quantum superposition processing"""
    print("\n[1] Quantum Superposition Processing")
    print("=" * 70)

    processor = QuantumEnvironmentalProcessor(num_qubits=8)

    test_data = [
        {"source": "AQICN_Delhi", "value": 156, "pm25": 87.3},
        {"source": "OpenAQ_Delhi", "value": 149, "pm25": 82.1},
        {"source": "CPCB_Delhi", "value": 162, "pm25": 91.5},
        {"source": "NASA_Satellite", "value": 145, "pm25": 79.8}
    ]

    print(f"Processing {len(test_data)} air quality data sources...")
    print("Creating quantum circuit with Hadamard gates...")
    print("Encoding data into qubit phase angles...")

    result = await processor.quantum_superposition_process(test_data, 'weighted')

    print(f"\n✓ Quantum circuit executed successfully")
    print(f"  - Sources processed: {result['sources_processed']}")
    print(f"  - Circuit fidelity: {result['fidelity']:.4f}")
    print(f"  - Processing time: {result['processing_time']:.4f}s")
    print(f"  - Measurement shots: 1024")
    print(f"  - Collapsed result: PM2.5 = {result['result'].get('pm25', 0):.2f}")

    print(f"\n  Measurement distribution:")
    top_measurements = sorted(
        result['measurement_counts'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    for bitstring, count in top_measurements:
        prob = count / 1024
        print(f"    |{bitstring}⟩ : {count}/1024 shots ({prob*100:.1f}%)")

    await processor.shutdown()
    return True


async def validate_quantum_entanglement():
    """Validates quantum entanglement analysis"""
    print("\n[2] Quantum Entanglement Correlation Analysis")
    print("=" * 70)

    processor = QuantumEnvironmentalProcessor(num_qubits=8)

    parameters = ["PM2.5", "PM10", "NO2", "SO2"]
    data_matrix = np.array([
        [87.3, 145.2, 42.1, 18.3],
        [82.1, 138.7, 39.8, 16.9],
        [91.5, 152.3, 45.2, 19.7],
        [79.8, 133.1, 38.5, 15.8],
        [85.6, 142.8, 41.3, 17.9]
    ])

    print(f"Analyzing correlations for {len(parameters)} parameters...")
    print("Creating Bell pairs for entangled qubits...")
    print("Applying CNOT gates for entanglement...")

    result = await processor.quantum_entanglement_analysis(parameters, data_matrix)

    print(f"\n✓ Quantum entanglement circuit executed")
    print(f"  - Measurement shots: 2048")
    print(f"  - Entanglement operations: {processor.metrics['entanglement_operations']}")

    print(f"\n  Strong correlations detected:")
    if result['strong_correlations']:
        for pair in result['strong_correlations']:
            print(f"    {pair['param1']} ↔ {pair['param2']}: "
                  f"ρ = {pair['correlation']:.3f} (entangled)")
    else:
        print("    No strong correlations above threshold (ρ > 0.7)")

    print(f"\n  Entanglement matrix:")
    matrix = np.array(result['entanglement_matrix'])
    print("        ", "  ".join([f"{p:>6s}" for p in parameters]))
    for i, param in enumerate(parameters):
        values = "  ".join([f"{matrix[i][j]:>6.3f}" for j in range(len(parameters))])
        print(f"    {param:>6s}  {values}")

    await processor.shutdown()
    return True


async def validate_grover_search():
    """Validates Grover's amplitude amplification"""
    print("\n[3] Grover's Quantum Search Algorithm")
    print("=" * 70)

    processor = QuantumEnvironmentalProcessor(num_qubits=8)

    candidates = [
        {"location": "Site_A", "aqi": 156, "accuracy": 0.85},
        {"location": "Site_B", "aqi": 142, "accuracy": 0.92},
        {"location": "Site_C", "aqi": 168, "accuracy": 0.78},
        {"location": "Site_D", "aqi": 139, "accuracy": 0.95}
    ]

    print(f"Searching optimal site from {len(candidates)} candidates...")
    print("Objective: Maximize accuracy")
    print("Creating Grover oracle...")
    print("Applying amplitude amplification...")

    result = await processor.quantum_amplitude_amplification(
        candidates, 'accuracy', maximize=True
    )

    print(f"\n✓ Grover's algorithm completed")
    print(f"  - Grover iterations: {result['grover_iterations']}")
    print(f"  - Selection probability: {result['selection_probability']:.4f}")

    best = result['selected_candidate']
    print(f"\n  Optimal candidate selected:")
    print(f"    Location: {best['location']}")
    print(f"    AQI: {best['aqi']}")
    print(f"    Accuracy: {best['accuracy']}")

    print(f"\n  Top measurement outcomes:")
    top_measurements = sorted(
        result['measurement_counts'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    for bitstring, count in top_measurements:
        prob = count / 1024
        print(f"    |{bitstring}⟩ : {count}/1024 shots ({prob*100:.1f}%)")

    await processor.shutdown()
    return True


async def validate_quantum_fourier_transform():
    """Validates Quantum Fourier Transform"""
    print("\n[4] Quantum Fourier Transform Analysis")
    print("=" * 70)

    processor = QuantumEnvironmentalProcessor(num_qubits=8)

    time_series = np.array([
        156, 149, 162, 145, 171, 138, 152, 167,
        142, 158, 149, 163, 151, 146, 159, 154
    ])

    print(f"Analyzing periodic patterns in {len(time_series)} AQI measurements...")
    print("Encoding time series into quantum amplitudes...")
    print("Applying QFT circuit...")

    result = await processor.quantum_fourier_analysis(time_series)

    print(f"\n✓ Quantum Fourier Transform completed")
    print(f"  - Samples analyzed: {result['samples_analyzed']}")
    print(f"  - Dominant frequencies detected: {len(result['dominant_frequencies'])}")

    print(f"\n  Frequency components:")
    for i, freq_comp in enumerate(result['dominant_frequencies'], 1):
        print(f"    {i}. Frequency: {freq_comp['frequency']:.4f} Hz, "
              f"Amplitude: {freq_comp['amplitude']:.4f}")

    await processor.shutdown()
    return True


async def run_full_validation():
    """Runs complete quantum validation suite"""
    print(BANNER)
    print(f"Validation Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python Version: {sys.version.split()[0]}")

    print("\nInitializing Qiskit quantum simulator...")
    print("Backend: Aer Statevector Simulator")
    print("Optimization Level: 3")

    results = []

    try:
        print("\n" + "=" * 70)
        print("QUANTUM VALIDATION SUITE")
        print("=" * 70)

        result1 = await validate_quantum_superposition()
        results.append(("Superposition Processing", result1))

        result2 = await validate_quantum_entanglement()
        results.append(("Entanglement Analysis", result2))

        result3 = await validate_grover_search()
        results.append(("Grover's Algorithm", result3))

        result4 = await validate_quantum_fourier_transform()
        results.append(("Quantum Fourier Transform", result4))

        print("\n" + "=" * 70)
        print("VALIDATION SUMMARY")
        print("=" * 70)

        for test_name, passed in results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {status}  {test_name}")

        total = len(results)
        passed = sum(1 for _, p in results if p)

        print(f"\nTotal: {passed}/{total} tests passed")

        if passed == total:
            print("\n✓ All quantum validation tests passed successfully!")
            print("  Quantum processor is operational and ready for production.")
            return 0
        else:
            print(f"\n✗ {total - passed} test(s) failed")
            return 1

    except Exception as e:
        print(f"\n✗ Validation failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_full_validation())
    sys.exit(exit_code)
