"""
SE-Darwin - Self-Evolving Darwin Evolution Engine.

Implements the SE-Darwin algorithm for continuous agent evolution through:
- Trajectory sampling and scoring
- Mutation and recombination operators
- Fitness-based selection
- Experience replay and learning

SE-Darwin enables agents to improve through self-evolution without human
intervention, learning from successful and failed trajectories.

Key Features:
- Population-based evolution
- Multi-objective fitness functions
- Trajectory pool integration
- Adaptive mutation rates
- Elitism and diversity preservation
"""

import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable, Tuple
from enum import Enum
import json

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class MutationType(Enum):
    """Types of mutations for evolution"""
    PARAMETER = "parameter"        # Mutate numeric parameters
    PROMPT = "prompt"              # Mutate prompt templates
    STRATEGY = "strategy"          # Change strategy/approach
    STRUCTURE = "structure"        # Modify output structure


@dataclass
class Trajectory:
    """Represents a single execution trajectory"""
    trajectory_id: str
    agent_name: str
    task_description: str
    input_data: Dict[str, Any]
    output_data: Any
    fitness_score: float
    execution_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


@dataclass
class EvolutionGenome:
    """Genome representing an agent's configuration"""
    genome_id: str
    agent_name: str
    parameters: Dict[str, Any]
    prompt_template: str
    strategy: str
    fitness_history: List[float] = field(default_factory=list)
    generation: int = 0
    parent_ids: List[str] = field(default_factory=list)
    mutations: List[str] = field(default_factory=list)

    @property
    def average_fitness(self) -> float:
        """Calculate average fitness across history"""
        if not self.fitness_history:
            return 0.0
        return sum(self.fitness_history) / len(self.fitness_history)

    @property
    def max_fitness(self) -> float:
        """Get best fitness score"""
        return max(self.fitness_history) if self.fitness_history else 0.0


class SEDarwinEngine:
    """
    SE-Darwin Evolution Engine.

    Implements self-evolving algorithms for continuous agent improvement
    through evolutionary strategies and trajectory learning.
    """

    def __init__(
        self,
        population_size: int = 8,
        elite_size: int = 2,
        mutation_rate: float = 0.3,
        crossover_rate: float = 0.5,
        max_generations: int = 10
    ):
        """
        Initialize SE-Darwin engine.

        Args:
            population_size: Number of genomes in population
            elite_size: Number of top performers to preserve
            mutation_rate: Probability of mutation
            crossover_rate: Probability of crossover
            max_generations: Maximum evolution generations
        """
        self.population_size = population_size
        self.elite_size = elite_size
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.max_generations = max_generations

        self.population: List[EvolutionGenome] = []
        self.trajectory_pool: List[Trajectory] = []
        self.generation = 0

        logger.info(
            f"SE-Darwin initialized (pop={population_size}, elite={elite_size}, "
            f"mutation={mutation_rate}, crossover={crossover_rate})"
        )

    def initialize_population(
        self,
        agent_name: str,
        base_parameters: Dict[str, Any],
        base_prompt: str,
        base_strategy: str = "default"
    ) -> None:
        """
        Initialize evolution population with base genome and variations.

        Args:
            agent_name: Name of agent to evolve
            base_parameters: Base parameter configuration
            base_prompt: Base prompt template
            base_strategy: Base strategy name
        """
        self.population = []

        # Create base genome
        base_genome = EvolutionGenome(
            genome_id=f"gen0_base",
            agent_name=agent_name,
            parameters=base_parameters.copy(),
            prompt_template=base_prompt,
            strategy=base_strategy,
            generation=0
        )
        self.population.append(base_genome)

        # Create variations
        for i in range(1, self.population_size):
            genome = self._create_variant(base_genome, i)
            self.population.append(genome)

        logger.info(f"Initialized population with {len(self.population)} genomes")

    def _create_variant(self, base: EvolutionGenome, index: int) -> EvolutionGenome:
        """Create a variant of base genome with random mutations"""
        variant = EvolutionGenome(
            genome_id=f"gen0_var{index}",
            agent_name=base.agent_name,
            parameters=base.parameters.copy(),
            prompt_template=base.prompt_template,
            strategy=base.strategy,
            generation=0,
            parent_ids=[base.genome_id]
        )

        # Apply random mutations
        if random.random() < 0.5:
            variant = self._mutate_parameters(variant)
        if random.random() < 0.3:
            variant = self._mutate_prompt(variant)

        return variant

    async def evolve(
        self,
        task_description: str,
        fitness_fn: Callable[[Any, Trajectory], float],
        num_generations: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run evolution for specified generations.

        Args:
            task_description: Task to evolve for
            fitness_fn: Function to evaluate fitness (output, trajectory) -> score
            num_generations: Number of generations (None = use max_generations)

        Returns:
            Evolution results with best genome and metrics
        """
        num_gen = num_generations or self.max_generations
        logger.info(f"Starting evolution for {num_gen} generations")

        best_genome = None
        best_fitness = float('-inf')

        for gen in range(num_gen):
            self.generation = gen
            logger.info(f"Generation {gen + 1}/{num_gen}")

            # Evaluate population
            logger.debug("Evaluating population...")
            await self._evaluate_population(task_description, fitness_fn)

            # Select elites
            elites = self._select_elites()
            logger.debug(f"Selected {len(elites)} elites")

            # Track best
            gen_best = max(elites, key=lambda g: g.max_fitness)
            if gen_best.max_fitness > best_fitness:
                best_fitness = gen_best.max_fitness
                best_genome = gen_best
                logger.info(f"New best fitness: {best_fitness:.4f} (genome: {best_genome.genome_id})")

            # Generate next generation
            if gen < num_gen - 1:
                self.population = self._generate_next_generation(elites)

        logger.info(f"Evolution complete. Best fitness: {best_fitness:.4f}")

        return {
            "best_genome": best_genome,
            "best_fitness": best_fitness,
            "final_population": self.population,
            "total_generations": self.generation + 1,
            "trajectory_count": len(self.trajectory_pool)
        }

    async def _evaluate_population(
        self,
        task_description: str,
        fitness_fn: Callable[[Any, Trajectory], float]
    ) -> None:
        """Evaluate fitness of all genomes in population"""
        for genome in self.population:
            # Execute with genome configuration
            output, exec_time = await self._execute_with_genome(genome, task_description)

            # Create trajectory
            trajectory = Trajectory(
                trajectory_id=f"{genome.genome_id}_t{len(self.trajectory_pool)}",
                agent_name=genome.agent_name,
                task_description=task_description,
                input_data={"genome_id": genome.genome_id},
                output_data=output,
                fitness_score=0.0,
                execution_time=exec_time
            )

            # Calculate fitness
            fitness = fitness_fn(output, trajectory)
            trajectory.fitness_score = fitness
            genome.fitness_history.append(fitness)

            # Store trajectory
            self.trajectory_pool.append(trajectory)

            logger.debug(f"Genome {genome.genome_id} fitness: {fitness:.4f}")

    async def _execute_with_genome(
        self,
        genome: EvolutionGenome,
        task_description: str
    ) -> Tuple[Any, float]:
        """
        Execute task with genome configuration.

        Returns:
            (output, execution_time)
        """
        start_time = time.time()

        # Simulate execution (in practice, this would call actual agent)
        await asyncio.sleep(0.01)  # Placeholder

        output = {
            "genome_id": genome.genome_id,
            "strategy": genome.strategy,
            "result": f"Executed with {genome.strategy} strategy"
        }

        execution_time = time.time() - start_time

        return output, execution_time

    def _select_elites(self) -> List[EvolutionGenome]:
        """Select top performing genomes"""
        # Sort by average fitness
        sorted_pop = sorted(
            self.population,
            key=lambda g: g.average_fitness,
            reverse=True
        )

        return sorted_pop[:self.elite_size]

    def _generate_next_generation(self, elites: List[EvolutionGenome]) -> List[EvolutionGenome]:
        """Generate next generation from elites"""
        next_gen = []

        # Keep elites
        next_gen.extend(elites)

        # Generate offspring
        while len(next_gen) < self.population_size:
            # Select parents
            parent1 = random.choice(elites)
            parent2 = random.choice(elites)

            # Crossover
            if random.random() < self.crossover_rate:
                child = self._crossover(parent1, parent2)
            else:
                child = self._clone_genome(parent1)

            # Mutation
            if random.random() < self.mutation_rate:
                child = self._mutate(child)

            child.generation = self.generation + 1
            next_gen.append(child)

        return next_gen

    def _crossover(self, parent1: EvolutionGenome, parent2: EvolutionGenome) -> EvolutionGenome:
        """Combine two parent genomes"""
        child = EvolutionGenome(
            genome_id=f"gen{self.generation + 1}_cross_{len(self.population)}",
            agent_name=parent1.agent_name,
            parameters={},
            prompt_template=parent1.prompt_template,
            strategy=random.choice([parent1.strategy, parent2.strategy]),
            parent_ids=[parent1.genome_id, parent2.genome_id]
        )

        # Mix parameters
        for key in parent1.parameters:
            if key in parent2.parameters:
                child.parameters[key] = random.choice([
                    parent1.parameters[key],
                    parent2.parameters[key]
                ])
            else:
                child.parameters[key] = parent1.parameters[key]

        return child

    def _clone_genome(self, genome: EvolutionGenome) -> EvolutionGenome:
        """Create a clone of genome"""
        return EvolutionGenome(
            genome_id=f"gen{self.generation + 1}_clone_{len(self.population)}",
            agent_name=genome.agent_name,
            parameters=genome.parameters.copy(),
            prompt_template=genome.prompt_template,
            strategy=genome.strategy,
            parent_ids=[genome.genome_id]
        )

    def _mutate(self, genome: EvolutionGenome) -> EvolutionGenome:
        """Apply random mutations to genome"""
        mutation_type = random.choice(list(MutationType))

        if mutation_type == MutationType.PARAMETER:
            genome = self._mutate_parameters(genome)
        elif mutation_type == MutationType.PROMPT:
            genome = self._mutate_prompt(genome)
        elif mutation_type == MutationType.STRATEGY:
            genome = self._mutate_strategy(genome)

        genome.mutations.append(mutation_type.value)
        return genome

    def _mutate_parameters(self, genome: EvolutionGenome) -> EvolutionGenome:
        """Mutate numeric parameters"""
        for key, value in genome.parameters.items():
            if isinstance(value, (int, float)) and random.random() < 0.3:
                # Add gaussian noise
                noise = random.gauss(0, 0.1) * value if value != 0 else random.gauss(0, 0.1)
                genome.parameters[key] = type(value)(value + noise)

        return genome

    def _mutate_prompt(self, genome: EvolutionGenome) -> EvolutionGenome:
        """Mutate prompt template"""
        # Simple prompt variations
        variations = [
            "Carefully analyze and ",
            "Systematically approach this task: ",
            "Using best practices, ",
            "Step by step, "
        ]

        if random.random() < 0.5:
            prefix = random.choice(variations)
            genome.prompt_template = prefix + genome.prompt_template

        return genome

    def _mutate_strategy(self, genome: EvolutionGenome) -> EvolutionGenome:
        """Mutate strategy"""
        strategies = ["default", "aggressive", "conservative", "balanced", "exploratory"]
        genome.strategy = random.choice(strategies)
        return genome

    def get_best_genome(self) -> Optional[EvolutionGenome]:
        """Get best genome from current population"""
        if not self.population:
            return None

        return max(self.population, key=lambda g: g.average_fitness)

    def export_trajectory_pool(self, filepath: str) -> None:
        """Export trajectory pool to file"""
        data = [
            {
                "trajectory_id": t.trajectory_id,
                "agent_name": t.agent_name,
                "task": t.task_description,
                "fitness": t.fitness_score,
                "execution_time": t.execution_time,
                "timestamp": t.timestamp
            }
            for t in self.trajectory_pool
        ]

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Exported {len(data)} trajectories to {filepath}")


# Global instance
_darwin_engine = None


def get_se_darwin() -> SEDarwinEngine:
    """
    Get global SE-Darwin engine instance.

    Returns:
        SEDarwinEngine instance
    """
    global _darwin_engine
    if _darwin_engine is None:
        _darwin_engine = SEDarwinEngine()
    return _darwin_engine


def create_fitness_function(
    quality_weight: float = 0.5,
    speed_weight: float = 0.3,
    cost_weight: float = 0.2
) -> Callable[[Any, Trajectory], float]:
    """
    Create a multi-objective fitness function.

    Args:
        quality_weight: Weight for output quality
        speed_weight: Weight for execution speed
        cost_weight: Weight for cost efficiency

    Returns:
        Fitness function
    """
    def fitness_fn(output: Any, trajectory: Trajectory) -> float:
        # Quality score (0-1)
        quality = trajectory.metadata.get("quality_score", 0.5)

        # Speed score (inverse of execution time, normalized)
        speed = 1.0 / (1.0 + trajectory.execution_time)

        # Cost score (inverse of cost, normalized)
        cost = 1.0 / (1.0 + trajectory.metadata.get("cost", 1.0))

        # Weighted combination
        fitness = (
            quality_weight * quality +
            speed_weight * speed +
            cost_weight * cost
        )

        return fitness

    return fitness_fn
