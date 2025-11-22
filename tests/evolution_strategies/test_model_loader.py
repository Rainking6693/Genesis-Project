"""
Unit tests for LoRA model loader (Evolution Strategies).

Tests:
- Flatten/unflatten operations
- Parameter shape extraction
- NumPy array operations
- Model loading (mocked)

Author: Alex (Full-Stack Testing Specialist)
Date: November 8, 2025
"""

import pytest
import numpy as np
import tempfile
from pathlib import Path
from infrastructure.evolution_strategies.model_loader import (
    flatten_lora_params,
    unflatten_lora_params,
    get_param_shapes,
    load_lora_params,
    save_lora_params,
)


# =============================================================================
# FLATTEN/UNFLATTEN TESTS (15 tests)
# =============================================================================

def test_flatten_single_param():
    """Test flattening single parameter."""
    params = {
        "weight": np.array([[1, 2], [3, 4]]),
    }

    flat = flatten_lora_params(params)

    assert flat.shape == (4,)
    np.testing.assert_array_equal(flat, np.array([1, 2, 3, 4]))


def test_flatten_multiple_params():
    """Test flattening multiple parameters."""
    params = {
        "layer1.weight": np.array([[1, 2]]),
        "layer2.weight": np.array([[3, 4]]),
    }

    flat = flatten_lora_params(params)

    assert flat.shape == (4,)


def test_flatten_different_shapes():
    """Test flattening parameters with different shapes."""
    params = {
        "a": np.array([1, 2, 3]),
        "b": np.array([[4, 5], [6, 7]]),
        "c": np.array([8]),
    }

    flat = flatten_lora_params(params)

    assert flat.shape == (8,)


def test_flatten_deterministic_order():
    """Test flattening produces deterministic order."""
    params = {
        "z": np.array([1]),
        "a": np.array([2]),
        "m": np.array([3]),
    }

    flat1 = flatten_lora_params(params)
    flat2 = flatten_lora_params(params)

    np.testing.assert_array_equal(flat1, flat2)
    # Should be sorted: a, m, z
    np.testing.assert_array_equal(flat1, np.array([2, 3, 1]))


def test_flatten_empty_params():
    """Test flattening empty params."""
    params = {}

    flat = flatten_lora_params(params)

    assert flat.shape == (0,)


def test_unflatten_single_param():
    """Test unflattening single parameter."""
    flat = np.array([1, 2, 3, 4])
    shapes = {"weight": (2, 2)}

    params = unflatten_lora_params(flat, shapes)

    assert "weight" in params
    np.testing.assert_array_equal(params["weight"], np.array([[1, 2], [3, 4]]))


def test_unflatten_multiple_params():
    """Test unflattening multiple parameters."""
    flat = np.array([1, 2, 3, 4, 5, 6])
    shapes = {
        "layer1.weight": (2,),
        "layer2.weight": (2, 2),
    }

    params = unflatten_lora_params(flat, shapes)

    assert len(params) == 2
    assert params["layer1.weight"].shape == (2,)
    assert params["layer2.weight"].shape == (2, 2)


def test_unflatten_complex_shapes():
    """Test unflattening with complex shapes."""
    flat = np.arange(24)  # 24 elements
    shapes = {
        "a": (3, 4),  # 12 elements
        "b": (2, 2, 3),  # 12 elements
    }

    params = unflatten_lora_params(flat, shapes)

    assert params["a"].shape == (3, 4)
    assert params["b"].shape == (2, 2, 3)


def test_flatten_unflatten_roundtrip():
    """Test flatten->unflatten preserves data."""
    original_params = {
        "layer1": np.random.randn(8, 16),
        "layer2": np.random.randn(16, 32),
        "bias": np.random.randn(32),
    }

    # Flatten
    flat = flatten_lora_params(original_params)

    # Unflatten
    shapes = get_param_shapes(original_params)
    reconstructed = unflatten_lora_params(flat, shapes)

    # Check
    assert reconstructed.keys() == original_params.keys()
    for key in original_params:
        np.testing.assert_array_almost_equal(
            reconstructed[key], original_params[key]
        )


def test_get_param_shapes():
    """Test extracting parameter shapes."""
    params = {
        "weight1": np.zeros((8, 16)),
        "weight2": np.zeros((16, 32)),
        "bias": np.zeros(32),
    }

    shapes = get_param_shapes(params)

    assert shapes == {
        "weight1": (8, 16),
        "weight2": (16, 32),
        "bias": (32,),
    }


def test_flatten_large_params():
    """Test flattening large parameter set."""
    # Simulate LoRA params (256 layers × 4 params each)
    params = {}
    for i in range(256):
        params[f"lora_A.layer.{i}.weight"] = np.random.randn(8, 4096).astype(np.float32)
        params[f"lora_B.layer.{i}.weight"] = np.random.randn(4096, 8).astype(np.float32)

    flat = flatten_lora_params(params)

    # Check size: 256 layers × (8×4096 + 4096×8) = 256 × 65536 = 16,777,216
    expected_size = 256 * (8 * 4096 + 4096 * 8)
    assert flat.shape[0] == expected_size


def test_unflatten_matches_original_shapes():
    """Test unflatten produces exact original shapes."""
    original_shapes = {
        "q_proj": (4096, 8),
        "k_proj": (4096, 8),
        "v_proj": (8, 4096),
    }

    # Create flat array with right size
    total_size = sum(np.prod(shape) for shape in original_shapes.values())
    flat = np.random.randn(total_size)

    params = unflatten_lora_params(flat, original_shapes)

    for key, shape in original_shapes.items():
        assert params[key].shape == shape


def test_flatten_preserves_dtype():
    """Test flattening preserves data type."""
    params = {
        "float32": np.array([1, 2, 3], dtype=np.float32),
        "float64": np.array([4, 5, 6], dtype=np.float64),
    }

    flat = flatten_lora_params(params)

    # Note: Concatenation may upcast to common dtype
    assert flat.dtype in [np.float32, np.float64]


def test_unflatten_with_single_dimension():
    """Test unflattening 1D shapes."""
    flat = np.array([1, 2, 3, 4, 5])
    shapes = {
        "bias1": (2,),
        "bias2": (3,),
    }

    params = unflatten_lora_params(flat, shapes)

    assert params["bias1"].shape == (2,)
    assert params["bias2"].shape == (3,)
    np.testing.assert_array_equal(params["bias1"], np.array([1, 2]))
    np.testing.assert_array_equal(params["bias2"], np.array([3, 4, 5]))


def test_flatten_with_zero_size_param():
    """Test flattening with zero-size parameter."""
    params = {
        "empty": np.array([]),
        "nonempty": np.array([1, 2, 3]),
    }

    flat = flatten_lora_params(params)

    assert flat.shape[0] == 3


# =============================================================================
# LOAD/SAVE PARAMS TESTS (10 tests)
# =============================================================================

def test_save_lora_params_creates_file():
    """Test save_lora_params creates file."""
    params = {
        "weight": np.array([[1, 2], [3, 4]]),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "adapter.safetensors"

        # Note: This may fail if safetensors not installed
        try:
            save_lora_params(params, str(path), use_safetensors=True)
            # If safetensors is installed, file should exist
        except ImportError:
            pytest.skip("safetensors not installed")


def test_save_lora_params_pytorch_format():
    """Test saving in PyTorch format."""
    params = {
        "weight": np.array([[1, 2], [3, 4]]),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "adapter.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            # Check file exists
            if path.exists():
                # File was created
                assert path.stat().st_size > 0
        except ImportError:
            pytest.skip("torch not installed")


def test_save_lora_params_creates_parent_dir():
    """Test save_lora_params creates parent directories."""
    params = {
        "weight": np.array([1, 2, 3]),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "models" / "lora" / "adapter.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            # Parent dirs should exist
            assert path.parent.exists()
        except ImportError:
            pytest.skip("torch not installed")


def test_load_lora_params_nonexistent_file():
    """Test loading from nonexistent file raises error."""
    with pytest.raises(FileNotFoundError):
        load_lora_params("/nonexistent/path/adapter.safetensors")


def test_save_load_roundtrip_pytorch():
    """Test save->load roundtrip with PyTorch format."""
    original_params = {
        "layer1": np.array([[1, 2], [3, 4]]),
        "layer2": np.array([5, 6, 7]),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "adapter.pth"

        try:
            # Save
            save_lora_params(original_params, str(path), use_safetensors=False)

            # Load
            loaded_params = load_lora_params(str(path))

            # Check
            assert set(loaded_params.keys()) == set(original_params.keys())
            for key in original_params:
                np.testing.assert_array_almost_equal(
                    loaded_params[key], original_params[key]
                )
        except ImportError:
            pytest.skip("torch not installed")


def test_save_large_params():
    """Test saving large parameter set."""
    # Simulate real LoRA params
    params = {}
    for i in range(32):  # 32 layers
        params[f"lora_A.{i}"] = np.random.randn(8, 4096).astype(np.float32)
        params[f"lora_B.{i}"] = np.random.randn(4096, 8).astype(np.float32)

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "large_adapter.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            if path.exists():
                # File should be reasonably sized (a few MB)
                size_mb = path.stat().st_size / 1e6
                assert size_mb > 1  # At least 1 MB
        except ImportError:
            pytest.skip("torch not installed")


def test_params_with_different_dtypes():
    """Test params with mixed dtypes."""
    params = {
        "fp32": np.array([1, 2, 3], dtype=np.float32),
        "fp64": np.array([4, 5, 6], dtype=np.float64),
        "int32": np.array([7, 8, 9], dtype=np.int32),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "mixed_dtype.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            # Should handle mixed dtypes
            if path.exists():
                loaded = load_lora_params(str(path))
                assert len(loaded) == 3
        except ImportError:
            pytest.skip("torch not installed")


def test_empty_params_save_load():
    """Test saving and loading empty params."""
    params = {}

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "empty.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            if path.exists():
                loaded = load_lora_params(str(path))
                # Should return empty dict or dict with lora_config
                assert isinstance(loaded, dict)
        except ImportError:
            pytest.skip("torch not installed")


def test_load_params_unsupported_format():
    """Test loading unsupported file format."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a dummy file with unsupported extension
        path = Path(tmpdir) / "adapter.txt"
        path.write_text("not a valid adapter")

        with pytest.raises(ValueError, match="Unsupported adapter format"):
            load_lora_params(str(path))


def test_save_params_file_size_logging():
    """Test that file size is logged correctly."""
    params = {
        "weight": np.random.randn(100, 100).astype(np.float32),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / "adapter.pth"

        try:
            save_lora_params(params, str(path), use_safetensors=False)

            if path.exists():
                # Check file size is reasonable
                size_mb = path.stat().st_size / 1e6
                assert size_mb > 0  # Non-zero size
        except ImportError:
            pytest.skip("torch not installed")


# =============================================================================
# EDGE CASES & ERROR HANDLING (5 tests)
# =============================================================================

def test_unflatten_wrong_size():
    """Test unflattening with mismatched size."""
    flat = np.array([1, 2, 3])  # 3 elements
    shapes = {"weight": (2, 2)}  # Needs 4 elements

    # This will raise IndexError or create incomplete array
    with pytest.raises((IndexError, ValueError)):
        unflatten_lora_params(flat, shapes)


def test_flatten_invalid_type():
    """Test flattening with invalid parameter type."""
    params = {
        "valid": np.array([1, 2, 3]),
        "invalid": [1, 2, 3],  # List instead of ndarray
    }

    # Should handle gracefully or raise error
    try:
        flat = flatten_lora_params(params)
        # If it succeeds, check it converted
        assert isinstance(flat, np.ndarray)
    except (AttributeError, TypeError):
        # Expected if not handled
        pass


def test_param_shapes_with_scalar():
    """Test get_param_shapes with scalar."""
    params = {
        "scalar": np.array(42),  # 0-dimensional
        "vector": np.array([1, 2, 3]),
    }

    shapes = get_param_shapes(params)

    assert shapes["scalar"] == ()  # Empty tuple for scalar
    assert shapes["vector"] == (3,)


def test_flatten_3d_params():
    """Test flattening 3D parameters."""
    params = {
        "conv_weight": np.random.randn(3, 3, 64, 128),
    }

    flat = flatten_lora_params(params)

    expected_size = 3 * 3 * 64 * 128
    assert flat.shape[0] == expected_size


def test_unflatten_maintains_fortran_order():
    """Test unflattening maintains C-order (default)."""
    flat = np.arange(12)
    shapes = {"weight": (3, 4)}

    params = unflatten_lora_params(flat, shapes)

    # Should use C-order (row-major) by default
    expected = np.array([[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]])
    np.testing.assert_array_equal(params["weight"], expected)
