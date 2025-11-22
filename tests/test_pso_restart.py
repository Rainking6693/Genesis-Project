"""
Unit Tests for PSO Restart Mechanisms

Tests the stagnation detection and partial particle reset functionality
in the Particle Swarm Optimizer for team composition.

Version: 1.0
Last Updated: November 12, 2025
"""

import os
import pytest
import numpy as np
from unittest.mock import Mock, patch

from infrastructure.swarm.team_optimizer import (
    ParticleSwarmOptimizer,
    TeamParticle
)
from infrastructure.swarm.inclusive_fitness import (
    Agent,
    TaskRequirement,
    InclusiveFitnessSwarm
)


@pytest.fixture
def mock_agents():
    """Create mock agents for testing"""
    agents = []
    for i in range(5):
        agent = Mock(spec=Agent)
        agent.name = f"Agent{i}"
        agent.capabilities = {"skill1", "skill2"}
        agents.append(agent)
    return agents


@pytest.fixture
def mock_swarm(mock_agents):
    """Create mock swarm for testing"""
    swarm = Mock(spec=InclusiveFitnessSwarm)
    swarm.agents = mock_agents
    swarm.evaluate_team_fitness = Mock(return_value=0.5)
    return swarm


@pytest.fixture
def mock_task():
    """Create mock task requirement for testing"""
    task = Mock(spec=TaskRequirement)
    task.task_id = "test_task"
    task.team_size_range = (2, 4)
    task.required_capabilities = {"skill1", "skill2"}
    return task


@pytest.fixture
def optimizer(mock_swarm, monkeypatch):
    """Create optimizer instance with test configuration"""
    # Set test environment variables
    monkeypatch.setenv('PSO_RESTART_PATIENCE', '5')
    monkeypatch.setenv('PSO_RESTART_FRACTION', '0.4')
    monkeypatch.setenv('PSO_STAGNATION_THRESHOLD', '0.01')

    optimizer = ParticleSwarmOptimizer(
        swarm=mock_swarm,
        n_particles=10,
        max_iterations=50,
        random_seed=42
    )
    return optimizer


class TestPSORestartConfiguration:
    """Test restart mechanism configuration"""

    def test_restart_config_from_env(self, optimizer):
        """Test that restart configuration loads from environment"""
        assert optimizer.restart_patience == 5
        assert optimizer.restart_fraction == 0.4
        assert optimizer.stagnation_threshold == 0.01

    def test_restart_config_defaults(self, mock_swarm, monkeypatch):
        """Test default restart configuration values"""
        # Clear env vars
        monkeypatch.delenv('PSO_RESTART_PATIENCE', raising=False)
        monkeypatch.delenv('PSO_RESTART_FRACTION', raising=False)
        monkeypatch.delenv('PSO_STAGNATION_THRESHOLD', raising=False)

        optimizer = ParticleSwarmOptimizer(
            swarm=mock_swarm,
            n_particles=10,
            max_iterations=50
        )

        assert optimizer.restart_patience == 10
        assert optimizer.restart_fraction == 0.3
        assert optimizer.stagnation_threshold == 0.001

    def test_restart_history_initialized(self, optimizer):
        """Test that restart tracking is initialized"""
        assert optimizer.best_fitness_history == []
        assert optimizer.stagnation_count == 0


class TestStagnationDetection:
    """Test stagnation detection logic"""

    def test_stagnation_not_detected_insufficient_history(self, optimizer):
        """Test that stagnation is not detected with insufficient history"""
        for i in range(3):
            is_stagnant = optimizer._check_stagnation(0.5)
            assert not is_stagnant

        # Should have 3 entries, need 5 for stagnation check
        assert len(optimizer.best_fitness_history) == 3

    def test_stagnation_not_detected_improving(self, optimizer):
        """Test that stagnation is not detected when improving"""
        # Simulate improving fitness
        fitness_values = [0.5, 0.52, 0.54, 0.56, 0.58, 0.60]

        for fitness in fitness_values:
            is_stagnant = optimizer._check_stagnation(fitness)
            assert not is_stagnant

        assert optimizer.stagnation_count == 0

    def test_stagnation_detected_plateau(self, optimizer):
        """Test that stagnation is detected when fitness plateaus"""
        # Simulate plateaued fitness (improvement < threshold)
        fitness_values = [0.5, 0.501, 0.502, 0.501, 0.5, 0.501]

        stagnation_detected = False
        for fitness in fitness_values:
            is_stagnant = optimizer._check_stagnation(fitness)
            if is_stagnant:
                stagnation_detected = True

        assert stagnation_detected
        assert optimizer.stagnation_count > 0

    def test_stagnation_count_resets_on_improvement(self, optimizer):
        """Test that stagnation count resets when improvement occurs"""
        # First, cause stagnation
        for _ in range(5):
            optimizer._check_stagnation(0.5)

        assert optimizer.stagnation_count > 0

        # Then show improvement
        optimizer._check_stagnation(0.7)

        # Stagnation count should reset
        assert optimizer.stagnation_count == 0

    def test_stagnation_threshold_respected(self, optimizer):
        """Test that stagnation threshold is correctly applied"""
        # improvement = 0.009 < threshold (0.01)
        fitness_values = [0.5, 0.501, 0.502, 0.503, 0.509]

        for fitness in fitness_values:
            optimizer._check_stagnation(fitness)

        # Should detect stagnation
        is_stagnant = optimizer._check_stagnation(0.509)
        assert is_stagnant


class TestPartialParticleReset:
    """Test partial particle reset functionality"""

    def test_reset_calculates_correct_fraction(self, optimizer, mock_task):
        """Test that correct number of particles are reset"""
        # Create 10 particles
        particles = optimizer._initialize_particles(mock_task)

        # Set fitness values
        for i, particle in enumerate(particles):
            particle.fitness = i * 0.1

        # Reset with fraction=0.4 -> should reset 4 particles
        reset_particles = optimizer._issue_restart_token(particles, mock_task)

        assert len(reset_particles) == 10  # Still 10 particles

        # Count reset particles (fitness=0.0)
        reset_count = sum(1 for p in reset_particles if p.fitness == 0.0)
        assert reset_count == 4  # 40% of 10

    def test_reset_targets_worst_performers(self, optimizer, mock_task):
        """Test that worst-performing particles are reset"""
        particles = optimizer._initialize_particles(mock_task)

        # Assign fitness: worst performers have lowest fitness
        for i, particle in enumerate(particles):
            particle.fitness = i * 0.1  # 0.0, 0.1, 0.2, ..., 0.9

        reset_particles = optimizer._issue_restart_token(particles, mock_task)

        # Check that first 4 particles (worst) were reset
        for i in range(4):
            assert reset_particles[i].fitness == 0.0

        # Check that best performers were not reset
        for i in range(4, 10):
            assert reset_particles[i].fitness > 0.0

    def test_reset_reinitializes_particle_state(self, optimizer, mock_task):
        """Test that reset particles have fresh random state"""
        particles = optimizer._initialize_particles(mock_task)

        # Set particles to specific state
        for particle in particles:
            particle.fitness = 0.5
            old_position = particle.position.copy()

        reset_particles = optimizer._issue_restart_token(particles, mock_task)

        # Find reset particles
        reset_particle = next(p for p in reset_particles if p.fitness == 0.0)

        # Check that position was reinitialized
        assert not np.array_equal(reset_particle.position, old_position)
        assert reset_particle.best_fitness == 0.0

    def test_reset_respects_team_size_constraints(self, optimizer, mock_task):
        """Test that reset particles respect team size constraints"""
        particles = optimizer._initialize_particles(mock_task)

        for particle in particles:
            particle.fitness = 0.1  # All low fitness

        reset_particles = optimizer._issue_restart_token(particles, mock_task)

        # Check team sizes after reset
        min_size, max_size = mock_task.team_size_range

        for particle in reset_particles:
            team_size = int(particle.position.sum())
            assert min_size <= team_size <= max_size

    def test_reset_at_least_one_particle(self, optimizer, mock_task):
        """Test that at least one particle is reset even with small fraction"""
        # Create optimizer with very small fraction
        optimizer.restart_fraction = 0.01  # 1%

        particles = optimizer._initialize_particles(mock_task)

        for particle in particles:
            particle.fitness = 0.1

        reset_particles = optimizer._issue_restart_token(particles, mock_task)

        # Should still reset at least 1 particle
        reset_count = sum(1 for p in reset_particles if p.fitness == 0.0)
        assert reset_count >= 1


class TestRestartIntegration:
    """Test integration of restart mechanism with optimization loop"""

    def test_restart_triggers_in_optimization(self, optimizer, mock_task):
        """Test that restart mechanism triggers during optimization"""
        with patch.object(optimizer, '_check_stagnation', return_value=True):
            with patch.object(optimizer, '_issue_restart_token') as mock_restart:
                mock_restart.return_value = optimizer._initialize_particles(mock_task)

                # Run optimization
                best_team, best_fitness = optimizer.optimize_team(mock_task, verbose=False)

                # Verify restart was called
                assert mock_restart.called

    def test_optimization_continues_after_restart(self, optimizer, mock_task):
        """Test that optimization continues after restart"""
        # Run optimization (will hit max iterations)
        best_team, best_fitness = optimizer.optimize_team(mock_task, verbose=False)

        # Should complete successfully
        assert best_team is not None
        assert best_fitness >= 0.0
        assert len(optimizer.fitness_history) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
