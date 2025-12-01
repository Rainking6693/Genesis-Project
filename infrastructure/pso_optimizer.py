"""
PSO Optimizer - Particle Swarm Optimization for Genesis.

Implements Particle Swarm Optimization for:
- Hyperparameter tuning
- Agent configuration optimization
- Multi-objective optimization
- Swarm-based exploration

PSO complements evolutionary strategies with swarm intelligence,
useful for continuous optimization problems and parameter search.

Features:
- Adaptive inertia weight
- Global and local best tracking
- Constraint handling
- Multi-objective support
- Convergence detection
"""

import logging
import random
import time
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable, Tuple
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class OptimizationType(Enum):
    """Type of optimization"""
    MINIMIZE = "minimize"
    MAXIMIZE = "maximize"


@dataclass
class Particle:
    """Represents a single particle in the swarm"""
    particle_id: str
    position: np.ndarray
    velocity: np.ndarray
    fitness: float
    best_position: np.ndarray
    best_fitness: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def update_best(self, new_fitness: float, optimization_type: OptimizationType) -> bool:
        """
        Update personal best if new fitness is better.

        Returns:
            True if best was updated
        """
        is_better = False

        if optimization_type == OptimizationType.MINIMIZE:
            is_better = new_fitness < self.best_fitness
        else:
            is_better = new_fitness > self.best_fitness

        if is_better:
            self.best_fitness = new_fitness
            self.best_position = self.position.copy()
            return True

        return False


@dataclass
class PSOConfig:
    """Configuration for PSO optimization"""
    swarm_size: int = 20
    max_iterations: int = 100
    w_start: float = 0.9          # Inertia weight start
    w_end: float = 0.4            # Inertia weight end
    c1: float = 2.0               # Cognitive coefficient
    c2: float = 2.0               # Social coefficient
    v_max: float = 0.2            # Maximum velocity (fraction of range)
    tolerance: float = 1e-6       # Convergence tolerance
    patience: int = 10            # Iterations without improvement before stopping


class PSOOptimizer:
    """
    Particle Swarm Optimization for hyperparameter tuning and configuration.

    Uses swarm intelligence to find optimal configurations through:
    - Particle velocity and position updates
    - Global and personal best tracking
    - Adaptive inertia weight
    - Boundary constraint handling
    """

    def __init__(
        self,
        bounds: List[Tuple[float, float]],
        config: Optional[PSOConfig] = None,
        optimization_type: OptimizationType = OptimizationType.MINIMIZE
    ):
        """
        Initialize PSO optimizer.

        Args:
            bounds: List of (min, max) tuples for each dimension
            config: PSO configuration (uses defaults if None)
            optimization_type: Minimize or maximize fitness
        """
        self.bounds = np.array(bounds)
        self.n_dimensions = len(bounds)
        self.config = config or PSOConfig()
        self.optimization_type = optimization_type

        self.swarm: List[Particle] = []
        self.global_best_position: Optional[np.ndarray] = None
        self.global_best_fitness: float = float('inf') if optimization_type == OptimizationType.MINIMIZE else float('-inf')
        self.iteration = 0

        self.fitness_history: List[float] = []
        self.convergence_history: List[float] = []

        logger.info(
            f"PSO Optimizer initialized ({self.config.swarm_size} particles, "
            f"{self.n_dimensions}D, {optimization_type.value})"
        )

    def initialize_swarm(self) -> None:
        """Initialize particle swarm with random positions and velocities"""
        self.swarm = []

        for i in range(self.config.swarm_size):
            # Random initial position within bounds
            position = np.array([
                random.uniform(low, high)
                for low, high in self.bounds
            ])

            # Random initial velocity
            velocity_range = (self.bounds[:, 1] - self.bounds[:, 0]) * self.config.v_max
            velocity = np.array([
                random.uniform(-vr, vr)
                for vr in velocity_range
            ])

            # Initialize particle
            particle = Particle(
                particle_id=f"particle_{i}",
                position=position,
                velocity=velocity,
                fitness=self._get_initial_fitness(),
                best_position=position.copy(),
                best_fitness=self._get_initial_fitness()
            )

            self.swarm.append(particle)

        logger.info(f"Initialized swarm with {len(self.swarm)} particles")

    def _get_initial_fitness(self) -> float:
        """Get initial fitness value based on optimization type"""
        if self.optimization_type == OptimizationType.MINIMIZE:
            return float('inf')
        return float('-inf')

    def optimize(
        self,
        fitness_fn: Callable[[np.ndarray], float],
        callback: Optional[Callable[[int, float], None]] = None
    ) -> Dict[str, Any]:
        """
        Run PSO optimization.

        Args:
            fitness_fn: Function to evaluate fitness of position
            callback: Optional callback(iteration, best_fitness)

        Returns:
            Optimization results
        """
        if not self.swarm:
            self.initialize_swarm()

        logger.info(f"Starting PSO optimization (max_iter={self.config.max_iterations})")
        start_time = time.time()

        no_improvement_count = 0
        prev_best = self.global_best_fitness

        for iteration in range(self.config.max_iterations):
            self.iteration = iteration

            # Evaluate fitness for all particles
            for particle in self.swarm:
                fitness = fitness_fn(particle.position)
                particle.fitness = fitness

                # Update personal best
                if particle.update_best(fitness, self.optimization_type):
                    logger.debug(f"Particle {particle.particle_id} found new personal best: {fitness:.6f}")

                # Update global best
                is_global_best = False
                if self.optimization_type == OptimizationType.MINIMIZE:
                    is_global_best = fitness < self.global_best_fitness
                else:
                    is_global_best = fitness > self.global_best_fitness

                if is_global_best:
                    self.global_best_fitness = fitness
                    self.global_best_position = particle.position.copy()
                    logger.info(f"Iteration {iteration}: New global best = {fitness:.6f}")

            # Update velocities and positions
            w = self._get_inertia_weight(iteration)
            self._update_swarm(w)

            # Track history
            self.fitness_history.append(self.global_best_fitness)

            # Callback
            if callback:
                callback(iteration, self.global_best_fitness)

            # Check convergence
            if abs(self.global_best_fitness - prev_best) < self.config.tolerance:
                no_improvement_count += 1
            else:
                no_improvement_count = 0

            if no_improvement_count >= self.config.patience:
                logger.info(f"Converged at iteration {iteration} (no improvement for {self.config.patience} iterations)")
                break

            prev_best = self.global_best_fitness

        duration = time.time() - start_time

        logger.info(
            f"PSO optimization complete: best_fitness={self.global_best_fitness:.6f} "
            f"in {iteration + 1} iterations ({duration:.2f}s)"
        )

        return {
            "best_position": self.global_best_position,
            "best_fitness": self.global_best_fitness,
            "iterations": iteration + 1,
            "duration": duration,
            "fitness_history": self.fitness_history,
            "converged": no_improvement_count >= self.config.patience
        }

    def _get_inertia_weight(self, iteration: int) -> float:
        """Calculate adaptive inertia weight (linearly decreasing)"""
        return self.config.w_start - (
            (self.config.w_start - self.config.w_end) *
            iteration / self.config.max_iterations
        )

    def _update_swarm(self, w: float) -> None:
        """Update particle velocities and positions"""
        for particle in self.swarm:
            # Random factors
            r1 = np.random.random(self.n_dimensions)
            r2 = np.random.random(self.n_dimensions)

            # Velocity update
            cognitive = self.config.c1 * r1 * (particle.best_position - particle.position)
            social = self.config.c2 * r2 * (self.global_best_position - particle.position)
            particle.velocity = w * particle.velocity + cognitive + social

            # Velocity clamping
            velocity_max = (self.bounds[:, 1] - self.bounds[:, 0]) * self.config.v_max
            particle.velocity = np.clip(particle.velocity, -velocity_max, velocity_max)

            # Position update
            particle.position = particle.position + particle.velocity

            # Boundary handling (reflect back into bounds)
            for dim in range(self.n_dimensions):
                if particle.position[dim] < self.bounds[dim, 0]:
                    particle.position[dim] = self.bounds[dim, 0]
                    particle.velocity[dim] *= -0.5
                elif particle.position[dim] > self.bounds[dim, 1]:
                    particle.position[dim] = self.bounds[dim, 1]
                    particle.velocity[dim] *= -0.5

    def get_swarm_diversity(self) -> float:
        """
        Calculate swarm diversity (average distance from centroid).

        Higher diversity = more exploration
        Lower diversity = more exploitation
        """
        if not self.swarm:
            return 0.0

        # Calculate centroid
        positions = np.array([p.position for p in self.swarm])
        centroid = np.mean(positions, axis=0)

        # Calculate average distance to centroid
        distances = np.linalg.norm(positions - centroid, axis=1)
        diversity = np.mean(distances)

        return float(diversity)

    def get_best_particles(self, n: int = 3) -> List[Particle]:
        """Get top N particles by fitness"""
        sorted_swarm = sorted(
            self.swarm,
            key=lambda p: p.best_fitness,
            reverse=(self.optimization_type == OptimizationType.MAXIMIZE)
        )
        return sorted_swarm[:n]

    def position_to_params(
        self,
        position: np.ndarray,
        param_names: List[str],
        param_types: Optional[List[type]] = None
    ) -> Dict[str, Any]:
        """
        Convert position vector to named parameters.

        Args:
            position: Position vector
            param_names: Names of parameters
            param_types: Optional type conversions (int, float, etc.)

        Returns:
            Parameter dictionary
        """
        params = {}

        for i, name in enumerate(param_names):
            value = position[i]

            # Apply type conversion if specified
            if param_types and i < len(param_types):
                value = param_types[i](value)

            params[name] = value

        return params


def optimize_hyperparameters(
    param_space: Dict[str, Tuple[float, float]],
    evaluation_fn: Callable[[Dict[str, Any]], float],
    swarm_size: int = 20,
    max_iterations: int = 50,
    optimization_type: OptimizationType = OptimizationType.MAXIMIZE
) -> Dict[str, Any]:
    """
    Convenience function for hyperparameter optimization.

    Args:
        param_space: Dictionary of parameter_name -> (min, max)
        evaluation_fn: Function that evaluates parameter configuration
        swarm_size: Number of particles
        max_iterations: Maximum iterations
        optimization_type: Minimize or maximize

    Returns:
        Best parameters and optimization results
    """
    param_names = list(param_space.keys())
    bounds = [param_space[name] for name in param_names]

    # Create optimizer
    config = PSOConfig(swarm_size=swarm_size, max_iterations=max_iterations)
    optimizer = PSOOptimizer(bounds, config, optimization_type)

    # Define fitness function
    def fitness_fn(position: np.ndarray) -> float:
        params = optimizer.position_to_params(position, param_names)
        return evaluation_fn(params)

    # Run optimization
    result = optimizer.optimize(fitness_fn)

    # Convert best position to parameters
    best_params = optimizer.position_to_params(result["best_position"], param_names)

    return {
        "best_params": best_params,
        "best_fitness": result["best_fitness"],
        "iterations": result["iterations"],
        "duration": result["duration"],
        "converged": result["converged"]
    }


# Global instance
_pso_optimizer = None


def get_pso_optimizer(
    bounds: List[Tuple[float, float]],
    optimization_type: OptimizationType = OptimizationType.MINIMIZE
) -> PSOOptimizer:
    """
    Get or create PSO optimizer instance.

    Args:
        bounds: Optimization bounds
        optimization_type: Minimize or maximize

    Returns:
        PSOOptimizer instance
    """
    global _pso_optimizer
    if _pso_optimizer is None:
        _pso_optimizer = PSOOptimizer(bounds, optimization_type=optimization_type)
    return _pso_optimizer
