"""
Quantum Processing API Routes
==============================

Provides API endpoints for quantum-inspired data processing operations.
These routes demonstrate the quantum pipeline's capabilities and performance.

Author: Pranjal Sailwal
Development: 2 weeks implementing quantum API integration
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging
from datetime import datetime

from quantum import QuantumProcessor, QuantumStateManager
from quantum.algorithms import (
    superposition_processor,
    entanglement_correlator,
    interference_optimizer
)
from middleware import get_database_guard, DatabaseAccessViolation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quantum", tags=["Quantum Processing"])

# Global quantum processor instance
_quantum_processor: Optional[QuantumProcessor] = None # type: ignore
_state_manager: Optional[QuantumStateManager] = None # type: ignore


def get_quantum_processor() -> QuantumProcessor:
    """Dependency to get quantum processor instance."""
    global _quantum_processor
    if _quantum_processor is None:
        _quantum_processor = QuantumProcessor()
    return _quantum_processor


def get_state_manager() -> QuantumStateManager:
    """Dependency to get state manager instance."""
    global _state_manager
    if _state_manager is None:
        _state_manager = QuantumStateManager()
    return _state_manager


# Request/Response Models

class SuperpositionRequest(BaseModel):
    """Request for superposition processing."""
    data_sources: List[Dict[str, Any]] = Field(
        ...,
        description="List of data source configurations to process in parallel"
    )
    operation: str = Field(
        default="aggregate",
        description="How to collapse superposition: 'aggregate', 'select_best', 'weighted_avg'"
    )


class SuperpositionResponse(BaseModel):
    """Response from superposition processing."""
    result: Dict[str, Any]
    processing_time: float
    parallelization_factor: float
    timestamp: str


class EntanglementRequest(BaseModel):
    """Request for entanglement analysis."""
    data_keys: List[str] = Field(
        ...,
        description="List of parameter names to analyze"
    )
    data_dict: Dict[str, List[float]] = Field(
        ...,
        description="Time-series data for each parameter"
    )
    threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Correlation threshold for entanglement"
    )


class EntanglementResponse(BaseModel):
    """Response from entanglement analysis."""
    correlation_matrix: List[List[float]]
    entangled_pairs: List[Dict[str, Any]]
    n_features: int
    threshold: float


class InterferenceRequest(BaseModel):
    """Request for interference optimization."""
    candidates: List[Dict[str, float]] = Field(
        ...,
        description="List of candidate solutions"
    )
    objective: str = Field(
        ...,
        description="Key to optimize"
    )
    maximize: bool = Field(
        default=True,
        description="Whether to maximize (True) or minimize (False)"
    )
    weights: Optional[List[float]] = Field(
        default=None,
        description="Optional weights for each candidate"
    )


class InterferenceResponse(BaseModel):
    """Response from interference optimization."""
    best_candidate: Dict[str, float]
    best_index: int
    probability: float
    iterations: int


class QuantumMetricsResponse(BaseModel):
    """Quantum processor performance metrics."""
    processor_metrics: Dict[str, Any]
    state_manager_stats: Dict[str, Any]
    database_guard_stats: Dict[str, Any]
    timestamp: str


# API Endpoints

@router.post("/process/superposition", response_model=SuperpositionResponse)
async def process_superposition(
    request: SuperpositionRequest,
    processor: QuantumProcessor = Depends(get_quantum_processor)
):
    """
    Process multiple data sources in superposition (parallel).

    This endpoint demonstrates quantum-inspired parallel processing where
    multiple data sources are processed simultaneously and then collapsed
    to a single result.

    **Quantum Principle**: Superposition - processing all states at once
    **Performance Benefit**: Up to Nx speedup where N is number of CPU cores

    Example:
        {
            "data_sources": [
                {"source": "AQICN", "location": "Delhi"},
                {"source": "OpenAQ", "location": "Delhi"},
                {"source": "NASA", "location": "Delhi"}
            ],
            "operation": "weighted_avg"
        }
    """
    try:
        start_time = datetime.now()

        # Process in superposition
        result = await processor.process_superposition(
            data_sources=request.data_sources,
            operation=request.operation
        )

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()

        # Get metrics
        metrics = processor.get_metrics()

        return SuperpositionResponse(
            result=result,
            processing_time=processing_time,
            parallelization_factor=metrics.get('parallelization_factor', 1.0),
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Superposition processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/entanglement", response_model=EntanglementResponse)
async def analyze_entanglement(
    request: EntanglementRequest,
    processor: QuantumProcessor = Depends(get_quantum_processor)
):
    """
    Analyze correlations (entanglement) between data parameters.

    This endpoint computes correlation matrices to identify strongly related
    parameters in environmental data, simulating quantum entanglement.

    **Quantum Principle**: Entanglement - identifying correlated parameters
    **Application**: Predict missing values, validate data consistency

    Example:
        {
            "data_keys": ["pm25", "pm10", "no2", "so2"],
            "data_dict": {
                "pm25": [45.2, 67.1, 89.3, 56.7, 72.4],
                "pm10": [78.5, 112.3, 145.6, 98.2, 125.8],
                "no2": [34.1, 45.6, 56.2, 38.9, 49.3],
                "so2": [12.3, 15.7, 19.8, 13.4, 17.2]
            },
            "threshold": 0.7
        }
    """
    try:
        # Compute entanglement matrix
        correlation_matrix = await processor.compute_entanglement(
            data_keys=request.data_keys,
            data_dict=request.data_dict
        )

        # Find entangled pairs using algorithm module
        import numpy as np
        data_matrix = np.array([
            request.data_dict.get(key, [0] * 10)
            for key in request.data_keys
        ]).T

        entanglement_result = entanglement_correlator(
            dataset=data_matrix,
            threshold=request.threshold
        )

        # Add parameter names to entangled pairs
        for pair in entanglement_result['entangled_pairs']:
            pair['parameter_1'] = request.data_keys[pair['feature_1']]
            pair['parameter_2'] = request.data_keys[pair['feature_2']]

        return EntanglementResponse(
            correlation_matrix=correlation_matrix.tolist(),
            entangled_pairs=entanglement_result['entangled_pairs'],
            n_features=len(request.data_keys),
            threshold=request.threshold
        )

    except Exception as e:
        logger.error(f"Entanglement analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize/interference", response_model=InterferenceResponse)
async def optimize_interference(request: InterferenceRequest):
    """
    Optimize selection using interference-inspired algorithm.

    This endpoint uses quantum-inspired interference to select the best
    candidate from multiple options, amplifying good solutions while
    suppressing poor ones.

    **Quantum Principle**: Interference - amplify good solutions, suppress bad ones
    **Application**: Multi-criteria decision making, optimal sensor selection

    Example:
        {
            "candidates": [
                {"aqi": 150, "accuracy": 0.85, "cost": 1200},
                {"aqi": 145, "accuracy": 0.92, "cost": 1500},
                {"aqi": 155, "accuracy": 0.78, "cost": 900}
            ],
            "objective": "accuracy",
            "maximize": true
        }
    """
    try:
        result = interference_optimizer(
            candidates=request.candidates,
            objective=request.objective,
            maximize=request.maximize
        )

        return InterferenceResponse(
            best_candidate=result['best_candidate'],
            best_index=result['best_index'],
            probability=result['probability'],
            iterations=result['iterations']
        )

    except Exception as e:
        logger.error(f"Interference optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=QuantumMetricsResponse)
async def get_quantum_metrics(
    processor: QuantumProcessor = Depends(get_quantum_processor),
    state_manager: QuantumStateManager = Depends(get_state_manager)
):
    """
    Get quantum processing performance metrics.

    Returns comprehensive statistics about quantum processor performance,
    state management, and database access patterns.
    """
    try:
        # Get database guard
        db_guard = get_database_guard()

        return QuantumMetricsResponse(
            processor_metrics=processor.get_metrics(),
            state_manager_stats=state_manager.get_stats(),
            database_guard_stats=db_guard.get_stats(),
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/state/create")
async def create_quantum_state(
    state_id: str,
    data: Dict[str, Any],
    dimension: int = 10,
    coherence_time: float = 300.0,
    state_manager: QuantumStateManager = Depends(get_state_manager)
):
    """
    Create a new quantum state.

    States represent computational units with associated data payloads.
    They have limited coherence time and will be garbage collected when expired.
    """
    try:
        state = state_manager.create_state(
            state_id=state_id,
            data=data,
            dimension=dimension,
            coherence_time=coherence_time
        )

        return {
            "state_id": state.state_id,
            "dimension": len(state.state_vector),
            "created_at": state.created_at.isoformat(),
            "coherence_time": state.coherence_time,
            "is_coherent": state.is_coherent()
        }

    except Exception as e:
        logger.error(f"Failed to create state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state/{state_id}")
async def get_quantum_state(
    state_id: str,
    state_manager: QuantumStateManager = Depends(get_state_manager)
):
    """
    Retrieve a quantum state by ID.

    This simulates "measurement" of the quantum state.
    """
    try:
        state = state_manager.get_state(state_id)

        if state is None:
            raise HTTPException(status_code=404, detail="State not found or has decohered")

        return {
            "state_id": state.state_id,
            "data": state.data,
            "dimension": len(state.state_vector),
            "created_at": state.created_at.isoformat(),
            "coherence_time": state.coherence_time,
            "is_coherent": state.is_coherent(),
            "access_count": state.access_count,
            "last_accessed": state.last_accessed.isoformat(),
            "entangled_with": list(state.entangled_with)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/state/entangle")
async def entangle_states(
    state_id_1: str,
    state_id_2: str,
    state_manager: QuantumStateManager = Depends(get_state_manager)
):
    """
    Create entanglement between two quantum states.

    Entangled states are correlated and tracked together.
    """
    try:
        state_manager.entangle_states(state_id_1, state_id_2)

        return {
            "message": f"States '{state_id_1}' and '{state_id_2}' are now entangled",
            "entangled_pair": [state_id_1, state_id_2]
        }

    except Exception as e:
        logger.error(f"Failed to entangle states: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/state/{state_id}")
async def delete_quantum_state(
    state_id: str,
    state_manager: QuantumStateManager = Depends(get_state_manager)
):
    """
    Remove a quantum state from the registry.

    This also removes all entanglement relationships.
    """
    try:
        state_manager.remove_state(state_id)

        return {
            "message": f"State '{state_id}' has been removed",
            "state_id": state_id
        }

    except Exception as e:
        logger.error(f"Failed to delete state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def quantum_health_check():
    """
    Health check endpoint for quantum processing system.

    Returns status of all quantum components.
    """
    try:
        processor = get_quantum_processor()
        state_manager = get_state_manager()
        db_guard = get_database_guard()

        return {
            "status": "healthy",
            "components": {
                "quantum_processor": "operational",
                "state_manager": "operational",
                "database_guard": "operational"
            },
            "metrics": {
                "processor": processor.get_metrics(),
                "state_manager": state_manager.get_stats(),
                "database_guard": db_guard.get_stats()
            },
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
