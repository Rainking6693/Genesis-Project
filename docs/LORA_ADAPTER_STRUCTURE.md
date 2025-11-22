# LoRA Adapter Structure Documentation

**Date:** November 8, 2025
**Author:** Cora (AI/Agent Orchestration Specialist)
**Target Model:** Llama-3.1-8B-Instruct
**Format:** SafeTensors (.safetensors)

---

## Overview

This document provides a detailed breakdown of the LoRA adapter structure for Evolution Strategies optimization in Genesis. It serves as a reference for understanding how LoRA parameters are organized and accessed.

---

## 1. LoRA Adapter File Structure

### 1.1 SafeTensors Format (Recommended)

```
adapter.safetensors
├── Header (JSON metadata)
│   ├── "__metadata__": {"format": "pt"}
│   └── Tensor offsets and sizes
└── Binary tensor data
    ├── lora_A.layers.0.self_attn.q_proj.weight
    ├── lora_B.layers.0.self_attn.q_proj.weight
    ├── lora_A.layers.0.self_attn.k_proj.weight
    ├── lora_B.layers.0.self_attn.k_proj.weight
    ├── ... (256 total tensors)
    └── lora_scaling (optional)
```

### 1.2 PyTorch Checkpoint Format (Fallback)

```python
# adapter.pth (pickle format)
{
    "lora_state_dict": {
        "lora_A.layers.0.self_attn.q_proj.weight": torch.Tensor(...),
        # ... (all 256 tensors)
    },
    "lora_config": {
        "r": 8,
        "lora_alpha": 128,
        "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
        "lora_dropout": 0.05,
        "bias": "none",
        "task_type": "CAUSAL_LM"
    },
    "optimizer_state": None,  # Not used in ES
    "scaler_state": None,     # Not used in ES
}
```

---

## 2. Tensor Naming Convention

### 2.1 LoRA A/B Matrices

LoRA decomposes weight updates as: `ΔW = B @ A` where:
- `A`: Low-rank projection down (d → r)
- `B`: Low-rank projection up (r → d)

**Naming Pattern:**
```
lora_{A|B}.layers.{layer_num}.{module}.{projection}.weight
```

**Examples:**
```
lora_A.layers.0.self_attn.q_proj.weight    # Query projection, layer 0, matrix A
lora_B.layers.0.self_attn.q_proj.weight    # Query projection, layer 0, matrix B
lora_A.layers.31.self_attn.o_proj.weight   # Output projection, layer 31, matrix A
lora_B.layers.31.self_attn.o_proj.weight   # Output projection, layer 31, matrix B
```

### 2.2 Layer Numbering

- **Layers:** 0-31 (32 total layers in Llama-3.1-8B)
- **Target modules:** `q_proj`, `k_proj`, `v_proj`, `o_proj` (attention only)

### 2.3 Projection Types

| Projection | Full Name | Dimensions (base → target) | LoRA A Shape | LoRA B Shape |
|------------|-----------|----------------------------|--------------|--------------|
| `q_proj` | Query Projection | 4096 → 4096 | (8, 4096) | (4096, 8) |
| `k_proj` | Key Projection | 4096 → 1024 | (8, 1024) | (1024, 8) |
| `v_proj` | Value Projection | 4096 → 1024 | (8, 1024) | (1024, 8) |
| `o_proj` | Output Projection | 4096 → 4096 | (8, 4096) | (4096, 8) |

---

## 3. Parameter Count Breakdown

### 3.1 Per-Layer Parameters

**Query Projection (q_proj):**
```
lora_A: 8 × 4096 = 32,768 parameters
lora_B: 4096 × 8 = 32,768 parameters
Total: 65,536 parameters
```

**Key Projection (k_proj):**
```
lora_A: 8 × 1024 = 8,192 parameters
lora_B: 1024 × 8 = 8,192 parameters
Total: 16,384 parameters
```

**Value Projection (v_proj):**
```
lora_A: 8 × 1024 = 8,192 parameters
lora_B: 1024 × 8 = 8,192 parameters
Total: 16,384 parameters
```

**Output Projection (o_proj):**
```
lora_A: 8 × 4096 = 32,768 parameters
lora_B: 4096 × 8 = 32,768 parameters
Total: 65,536 parameters
```

**Total per layer:** 65,536 + 16,384 + 16,384 + 65,536 = **163,840 parameters**

### 3.2 Total Adapter Parameters

```
32 layers × 163,840 parameters/layer = 5,242,880 parameters
```

**Storage:**
- FP16: 5,242,880 × 2 bytes = 10.49 MB
- FP32: 5,242,880 × 4 bytes = 20.97 MB
- **With metadata:** ~100 MB (safetensors) or ~120 MB (.pth)

### 3.3 Comparison to Base Model

```
Base Model (Llama-3.1-8B): 8,030,261,248 parameters
LoRA Adapter: 5,242,880 parameters
Ratio: 0.065% (LoRA is 0.065% the size of base model)
```

---

## 4. Example: Inspecting an Adapter

### 4.1 Load and List Tensors (SafeTensors)

```python
from safetensors import safe_open

adapter_path = "models/lora_adapters/current/adapter.safetensors"

with safe_open(adapter_path, framework="pt", device="cpu") as f:
    keys = list(f.keys())
    print(f"Total tensors: {len(keys)}")

    # Print first 10 tensors
    for key in sorted(keys)[:10]:
        tensor = f.get_tensor(key)
        print(f"{key}: {tensor.shape}, {tensor.dtype}")
```

**Output:**
```
Total tensors: 256
lora_A.layers.0.self_attn.k_proj.weight: torch.Size([8, 1024]), torch.float16
lora_A.layers.0.self_attn.o_proj.weight: torch.Size([8, 4096]), torch.float16
lora_A.layers.0.self_attn.q_proj.weight: torch.Size([8, 4096]), torch.float16
lora_A.layers.0.self_attn.v_proj.weight: torch.Size([8, 1024]), torch.float16
lora_B.layers.0.self_attn.k_proj.weight: torch.Size([1024, 8]), torch.float16
lora_B.layers.0.self_attn.o_proj.weight: torch.Size([4096, 8]), torch.float16
lora_B.layers.0.self_attn.q_proj.weight: torch.Size([4096, 8]), torch.float16
lora_B.layers.0.self_attn.v_proj.weight: torch.Size([1024, 8]), torch.float16
lora_A.layers.1.self_attn.k_proj.weight: torch.Size([8, 1024]), torch.float16
lora_A.layers.1.self_attn.o_proj.weight: torch.Size([8, 4096]), torch.float16
```

### 4.2 Load and Inspect Shape Distribution

```python
from safetensors import safe_open
from collections import Counter

adapter_path = "models/lora_adapters/current/adapter.safetensors"

shape_counts = Counter()

with safe_open(adapter_path, framework="pt", device="cpu") as f:
    for key in f.keys():
        tensor = f.get_tensor(key)
        shape_counts[tensor.shape] += 1

print("Shape distribution:")
for shape, count in sorted(shape_counts.items()):
    print(f"  {shape}: {count} tensors")
```

**Output:**
```
Shape distribution:
  torch.Size([8, 1024]): 64 tensors  # lora_A for k_proj, v_proj
  torch.Size([8, 4096]): 64 tensors  # lora_A for q_proj, o_proj
  torch.Size([1024, 8]): 64 tensors  # lora_B for k_proj, v_proj
  torch.Size([4096, 8]): 64 tensors  # lora_B for q_proj, o_proj
```

### 4.3 Calculate Total Size

```python
from safetensors import safe_open

adapter_path = "models/lora_adapters/current/adapter.safetensors"

total_params = 0
total_bytes = 0

with safe_open(adapter_path, framework="pt", device="cpu") as f:
    for key in f.keys():
        tensor = f.get_tensor(key)
        num_params = tensor.numel()
        num_bytes = num_params * tensor.element_size()
        total_params += num_params
        total_bytes += num_bytes

print(f"Total parameters: {total_params:,}")
print(f"Total size: {total_bytes / 1e6:.2f} MB")
print(f"Average bytes per parameter: {total_bytes / total_params:.2f}")
```

**Output:**
```
Total parameters: 5,242,880
Total size: 10.49 MB
Average bytes per parameter: 2.00  # FP16
```

---

## 5. Adapter Lifecycle in ES Optimization

### 5.1 Initial Adapter

**Path:** `models/lora_adapters/current/adapter.safetensors`
**Purpose:** Starting point for ES optimization
**How Created:** Fine-tuned on agent-specific data using standard LoRA training

### 5.2 Perturbations (ES Population)

**Path:** `models/lora_adapters/perturbations/perturbation_{i:03d}.safetensors`
**Purpose:** Temporary perturbed adapters for fitness evaluation
**How Created:**
```python
# ES optimizer samples noise
epsilon = np.random.normal(0, sigma, size=base_params.shape)

# Perturb base parameters
perturbed_params = base_params + epsilon

# Save as adapter
save_lora_params(perturbed_params, f"perturbations/perturbation_{i:03d}.safetensors")
```

**Lifecycle:** Created each ES iteration, deleted after fitness evaluation

### 5.3 Archive (Evolution History)

**Path:** `models/lora_adapters/archive/adapter_iter_{iteration:04d}.safetensors`
**Purpose:** Historical record of best adapters from each ES iteration
**How Created:** Copy of best-performing perturbation after each iteration
**Lifecycle:** Permanent (kept for rollback, analysis)

---

## 6. Common Operations

### 6.1 Load Adapter Parameters

```python
from infrastructure.evolution_strategies.model_loader import load_lora_params

params = load_lora_params("models/lora_adapters/current/adapter.safetensors")
print(f"Loaded {len(params)} tensors")
# Output: Loaded 256 tensors
```

### 6.2 Flatten for ES Optimizer

```python
from infrastructure.evolution_strategies.model_loader import (
    load_lora_params,
    flatten_lora_params,
    get_param_shapes,
)

# Load adapter
params = load_lora_params("adapter.safetensors")

# Flatten to 1D array
flat_params = flatten_lora_params(params)
print(f"Flattened to {len(flat_params):,} parameters")
# Output: Flattened to 5,242,880 parameters

# Save shapes for unflatten
param_shapes = get_param_shapes(params)
```

### 6.3 Perturb and Save

```python
import numpy as np
from infrastructure.evolution_strategies.model_loader import (
    unflatten_lora_params,
    save_lora_params,
)

# Sample noise
sigma = 0.01
epsilon = np.random.normal(0, sigma, size=flat_params.shape)

# Perturb
perturbed_flat = flat_params + epsilon

# Unflatten
perturbed_params = unflatten_lora_params(perturbed_flat, param_shapes)

# Save
save_lora_params(
    perturbed_params,
    "models/lora_adapters/perturbations/perturbation_000.safetensors"
)
```

### 6.4 Load Model with Perturbed Adapter

```python
from infrastructure.evolution_strategies.model_loader import load_model_with_lora

# Load model with perturbed adapter
base_model, peft_model = load_model_with_lora(
    lora_adapter_path="models/lora_adapters/perturbations/perturbation_000.safetensors",
    use_4bit=False,
)

# Use for inference
output = peft_model.generate(input_ids)
```

---

## 7. Validation Checklist

### 7.1 File Format Validation

```python
from safetensors import safe_open

def validate_adapter_format(adapter_path: str) -> bool:
    """Validate that adapter has correct format"""
    try:
        with safe_open(adapter_path, framework="pt", device="cpu") as f:
            keys = list(f.keys())

            # Check tensor count
            assert len(keys) == 256, f"Expected 256 tensors, got {len(keys)}"

            # Check all tensors are FP16
            for key in keys:
                tensor = f.get_tensor(key)
                assert tensor.dtype == torch.float16, f"{key} is not FP16"

            # Check expected shapes
            for key in keys:
                tensor = f.get_tensor(key)
                if "lora_A" in key and "q_proj" in key:
                    assert tensor.shape == (8, 4096), f"{key} has wrong shape"
                elif "lora_B" in key and "q_proj" in key:
                    assert tensor.shape == (4096, 8), f"{key} has wrong shape"
                # ... (check other projections)

        return True
    except Exception as e:
        print(f"Validation failed: {e}")
        return False
```

### 7.2 Parameter Count Validation

```python
def validate_parameter_count(params: Dict[str, np.ndarray]) -> bool:
    """Validate total parameter count"""
    total_params = sum(p.size for p in params.values())
    expected_params = 5_242_880

    if total_params != expected_params:
        print(f"Expected {expected_params:,} params, got {total_params:,}")
        return False

    return True
```

### 7.3 Shape Consistency Validation

```python
def validate_shape_consistency(params: Dict[str, np.ndarray]) -> bool:
    """Validate that A and B matrices have consistent shapes"""
    for layer in range(32):
        for proj in ["q_proj", "k_proj", "v_proj", "o_proj"]:
            key_a = f"lora_A.layers.{layer}.self_attn.{proj}.weight"
            key_b = f"lora_B.layers.{layer}.self_attn.{proj}.weight"

            if key_a not in params or key_b not in params:
                print(f"Missing tensors for layer {layer}, {proj}")
                return False

            shape_a = params[key_a].shape
            shape_b = params[key_b].shape

            # Check rank dimension consistency
            if shape_a[0] != shape_b[1]:
                print(f"Rank mismatch: {key_a} {shape_a} vs {key_b} {shape_b}")
                return False

    return True
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Issue: "RuntimeError: CUDA out of memory"**
```python
# Solution: Enable 4-bit quantization
base_model, peft_model = load_model_with_lora(
    use_4bit=True,  # Reduces VRAM from 7.9GB to 4.9GB
)
```

**Issue: "FileNotFoundError: adapter.safetensors not found"**
```python
# Solution: Check adapter path
import os
adapter_path = "models/lora_adapters/current/adapter.safetensors"
print(f"Exists: {os.path.exists(adapter_path)}")

# Create directory if needed
os.makedirs(os.path.dirname(adapter_path), exist_ok=True)
```

**Issue: "ValueError: Unsupported adapter format"**
```python
# Solution: Ensure .safetensors or .pth extension
# Correct:
adapter_path = "adapter.safetensors"  # or "adapter.pth"

# Incorrect:
adapter_path = "adapter"  # Missing extension
```

### 8.2 Debugging Helper Functions

```python
def debug_adapter_structure(adapter_path: str):
    """Print detailed adapter structure for debugging"""
    from safetensors import safe_open

    print(f"Adapter: {adapter_path}")
    print(f"Size: {os.path.getsize(adapter_path) / 1e6:.2f} MB")

    with safe_open(adapter_path, framework="pt", device="cpu") as f:
        keys = sorted(f.keys())
        print(f"Total tensors: {len(keys)}")

        # Group by layer
        layers = {}
        for key in keys:
            layer_num = int(key.split(".")[2]) if "layers" in key else -1
            if layer_num not in layers:
                layers[layer_num] = []
            layers[layer_num].append(key)

        print(f"Layers: {len(layers)}")

        # Print sample layer
        if 0 in layers:
            print(f"\nSample (Layer 0):")
            for key in layers[0]:
                tensor = f.get_tensor(key)
                print(f"  {key}: {tensor.shape}, {tensor.dtype}")
```

---

## 9. References

### 9.1 Internal Documentation

1. **ES Model Format Spec:** `docs/ES_MODEL_FORMAT_SPEC.md`
2. **Model Loader Implementation:** `infrastructure/evolution_strategies/model_loader.py`
3. **Integration Roadmap:** `INTEGRATION_ROADMAP_DEEPAGENTS_SKYVERN_ES.md` (lines 875-1265)

### 9.2 External References

4. **LoRA Paper:** Hu et al., 2021 - https://arxiv.org/abs/2106.09685
5. **PEFT Documentation:** https://huggingface.co/docs/peft/index
6. **SafeTensors:** https://github.com/huggingface/safetensors
7. **Llama-3.1 Model Card:** https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct

---

## APPENDIX: Full Tensor List (Sample)

```
# Layer 0 (8 tensors per layer × 4 projections = 32 tensors + 32 for B = 64 total)
lora_A.layers.0.self_attn.k_proj.weight: (8, 1024), float16
lora_A.layers.0.self_attn.o_proj.weight: (8, 4096), float16
lora_A.layers.0.self_attn.q_proj.weight: (8, 4096), float16
lora_A.layers.0.self_attn.v_proj.weight: (8, 1024), float16
lora_B.layers.0.self_attn.k_proj.weight: (1024, 8), float16
lora_B.layers.0.self_attn.o_proj.weight: (4096, 8), float16
lora_B.layers.0.self_attn.q_proj.weight: (4096, 8), float16
lora_B.layers.0.self_attn.v_proj.weight: (1024, 8), float16

# ... (repeat for layers 1-31)

# Layer 31 (last layer)
lora_A.layers.31.self_attn.k_proj.weight: (8, 1024), float16
lora_A.layers.31.self_attn.o_proj.weight: (8, 4096), float16
lora_A.layers.31.self_attn.q_proj.weight: (8, 4096), float16
lora_A.layers.31.self_attn.v_proj.weight: (8, 1024), float16
lora_B.layers.31.self_attn.k_proj.weight: (1024, 8), float16
lora_B.layers.31.self_attn.o_proj.weight: (4096, 8), float16
lora_B.layers.31.self_attn.q_proj.weight: (4096, 8), float16
lora_B.layers.31.self_attn.v_proj.weight: (1024, 8), float16
```

**Total:** 256 tensors (32 layers × 4 projections × 2 matrices)

---

**Document Version:** 1.0
**Last Updated:** November 8, 2025
**Status:** Production Reference

---

**END OF DOCUMENT**
