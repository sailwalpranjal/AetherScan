"""
Quantum-Inspired Data Processing Pipeline
==========================================

This module provides a quantum-inspired processing framework for environmental
data analysis. While not utilizing actual quantum hardware, it implements
classical algorithms that simulate quantum computational principles to achieve
enhanced performance characteristics.

Author: Pranjal Sailwal
Development Time: 3 months (January 2025 - March 2025)
"""

from .processor import QuantumEnvironmentalProcessor as QuantumProcessor
from .state_manager import QuantumStateManager

__all__ = [
    'QuantumProcessor',
    'QuantumStateManager'
]
