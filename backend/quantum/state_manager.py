import asyncio
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import numpy as np
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class ManagedQuantumState:
    """
    A managed quantum state with lifecycle tracking.

    Attributes:
        state_id: Unique identifier for this state
        state_vector: Complex probability amplitudes
        data: Actual data payload
        created_at: Creation timestamp
        coherence_time: How long state remains valid (seconds)
        entangled_with: Set of state IDs this is entangled with
        access_count: Number of times this state has been accessed
        last_accessed: Last access timestamp
    """
    state_id: str
    state_vector: np.ndarray
    data: Dict
    created_at: datetime = field(default_factory=datetime.now)
    coherence_time: float = 300.0  # 5 minutes default
    entangled_with: Set[str] = field(default_factory=set)
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.now)

    def is_coherent(self) -> bool:
        """
        Check if state is still coherent (hasn't decohered).

        Quantum Decoherence:
        -------------------
        Real quantum states interact with their environment and lose coherence
        over time, transitioning from quantum superposition to classical mixed state.

        Decoherence time varies:
        - Superconducting qubits: microseconds to milliseconds
        - Trapped ions: seconds to minutes
        - Our simulation: configurable (default 5 minutes)

        We simulate this by marking states as invalid after coherence_time expires.
        """
        elapsed = (datetime.now() - self.created_at).total_seconds()
        return elapsed < self.coherence_time

    def decohere(self):
        """Force immediate decoherence of this state."""
        self.coherence_time = 0.0

    def normalize_state_vector(self):
        """
        Normalize state vector to ensure Σ|αᵢ|² = 1.

        Quantum mechanics requires state vectors to be normalized so that
        total probability equals 1.
        """
        norm = np.sqrt(np.sum(np.abs(self.state_vector) ** 2))
        if norm > 1e-10:
            self.state_vector = self.state_vector / norm


class QuantumStateManager:
    """
    Manages a registry of quantum-inspired computational states.

    Responsibilities:
    - State creation and lifecycle management
    - Coherence time tracking (garbage collection of decohered states)
    - Entanglement relationship management
    - State access statistics
    """

    def __init__(self, cleanup_interval: int = 60):
        """
        Initialize state manager.

        Args:
            cleanup_interval: How often to clean up decohered states (seconds)
        """
        # State registry: state_id -> ManagedQuantumState
        self.states: Dict[str, ManagedQuantumState] = {}

        # Entanglement graph: state_id -> set of entangled state IDs
        self.entanglement_graph: Dict[str, Set[str]] = defaultdict(set)

        # Cleanup interval
        self.cleanup_interval = cleanup_interval

        # Background cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None

        # Statistics
        self.stats = {
            'total_states_created': 0,
            'total_states_decohered': 0,
            'current_active_states': 0,
            'total_accesses': 0
        }

        logger.info(f"Quantum State Manager initialized (cleanup every {cleanup_interval}s)")

    async def start(self):
        """Start background cleanup task."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("State manager cleanup task started")

    async def stop(self):
        """Stop background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("State manager cleanup task stopped")

    async def _cleanup_loop(self):
        """Background task to periodically clean up decohered states."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self.cleanup_decohered_states()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")

    async def cleanup_decohered_states(self):
        """Remove states that have lost coherence."""
        decohered_ids = []

        for state_id, state in self.states.items():
            if not state.is_coherent():
                decohered_ids.append(state_id)

        for state_id in decohered_ids:
            self.remove_state(state_id)

        if decohered_ids:
            logger.info(f"Cleaned up {len(decohered_ids)} decohered states")

        self.stats['total_states_decohered'] += len(decohered_ids)

    def create_state(
        self,
        state_id: str,
        data: Dict,
        dimension: int = 10,
        coherence_time: float = 300.0
    ) -> ManagedQuantumState:
        """
        Create a new quantum state.

        Args:
            state_id: Unique identifier
            data: Data payload
            dimension: Dimensionality of state vector
            coherence_time: How long state remains coherent (seconds)

        Returns:
            Created quantum state
        """
        # Initialize state vector in uniform superposition
        # |ψ⟩ = (|0⟩ + |1⟩ + ... + |n-1⟩) / √n
        state_vector = np.ones(dimension, dtype=complex) / np.sqrt(dimension)

        state = ManagedQuantumState(
            state_id=state_id,
            state_vector=state_vector,
            data=data,
            coherence_time=coherence_time
        )

        self.states[state_id] = state

        self.stats['total_states_created'] += 1
        self.stats['current_active_states'] = len(self.states)

        logger.debug(f"Created quantum state '{state_id}' (dim={dimension})")

        return state

    def get_state(self, state_id: str) -> Optional[ManagedQuantumState]:
        """
        Retrieve a quantum state by ID.

        This simulates "measuring" the state, which increments access count
        and updates last accessed time.

        Args:
            state_id: State identifier

        Returns:
            Quantum state if exists and coherent, None otherwise
        """
        state = self.states.get(state_id)

        if state is None:
            logger.warning(f"State '{state_id}' not found")
            return None

        if not state.is_coherent():
            logger.warning(f"State '{state_id}' has decohered")
            self.remove_state(state_id)
            return None

        # Update access metadata
        state.access_count += 1
        state.last_accessed = datetime.now()
        self.stats['total_accesses'] += 1

        return state

    def remove_state(self, state_id: str):
        """
        Remove a quantum state from registry.

        Also removes all entanglement relationships involving this state.

        Args:
            state_id: State identifier
        """
        if state_id not in self.states:
            return

        # Remove entanglement relationships
        if state_id in self.entanglement_graph:
            # Notify entangled states
            for other_id in self.entanglement_graph[state_id]:
                if other_id in self.states:
                    self.states[other_id].entangled_with.discard(state_id)

                if other_id in self.entanglement_graph:
                    self.entanglement_graph[other_id].discard(state_id)

            del self.entanglement_graph[state_id]

        # Remove state
        del self.states[state_id]

        self.stats['current_active_states'] = len(self.states)

        logger.debug(f"Removed state '{state_id}'")

    def entangle_states(self, state_id_1: str, state_id_2: str):
        """
        Create entanglement between two quantum states.

        Quantum Entanglement:
        --------------------
        When two qubits are entangled, they share quantum correlations.
        Measuring one affects the other, regardless of distance.

        Bell State Example:
        |Ψ⟩ = (|00⟩ + |11⟩) / √2

        Our Simulation:
        --------------
        We track which states are "entangled" (correlated). When one state
        is measured or modified, we can notify or update entangled states.

        Args:
            state_id_1: First state ID
            state_id_2: Second state ID
        """
        state1 = self.get_state(state_id_1)
        state2 = self.get_state(state_id_2)

        if state1 is None or state2 is None:
            logger.warning(f"Cannot entangle: one or both states not found")
            return

        # Add bidirectional entanglement
        state1.entangled_with.add(state_id_2)
        state2.entangled_with.add(state_id_1)

        self.entanglement_graph[state_id_1].add(state_id_2)
        self.entanglement_graph[state_id_2].add(state_id_1)

        logger.info(f"Entangled states '{state_id_1}' ↔ '{state_id_2}'")

    def disentangle_states(self, state_id_1: str, state_id_2: str):
        """
        Break entanglement between two states.

        Args:
            state_id_1: First state ID
            state_id_2: Second state ID
        """
        if state_id_1 in self.states:
            self.states[state_id_1].entangled_with.discard(state_id_2)

        if state_id_2 in self.states:
            self.states[state_id_2].entangled_with.discard(state_id_1)

        if state_id_1 in self.entanglement_graph:
            self.entanglement_graph[state_id_1].discard(state_id_2)

        if state_id_2 in self.entanglement_graph:
            self.entanglement_graph[state_id_2].discard(state_id_1)

        logger.info(f"Disentangled states '{state_id_1}' ⊗ '{state_id_2}'")

    def get_entangled_states(self, state_id: str) -> List[str]:
        """
        Get all states entangled with the given state.

        Args:
            state_id: State identifier

        Returns:
            List of entangled state IDs
        """
        return list(self.entanglement_graph.get(state_id, set()))

    def get_stats(self) -> Dict:
        """
        Get state manager statistics.

        Returns:
            Dictionary of statistics
        """
        return {
            **self.stats,
            'current_active_states': len(self.states),
            'total_entanglements': sum(len(v) for v in self.entanglement_graph.values()) // 2
        }

    def get_all_states(self) -> List[str]:
        """
        Get list of all active state IDs.

        Returns:
            List of state identifiers
        """
        return list(self.states.keys())

    def clear_all_states(self):
        """Remove all states (useful for testing/reset)."""
        count = len(self.states)
        self.states.clear()
        self.entanglement_graph.clear()
        self.stats['current_active_states'] = 0
        logger.info(f"Cleared all {count} states")
