"""MLX QLoRA fine-tuning wrapper for student success adapters.

Wraps ``mlx_lm.lora`` to fine-tune Qwen models on ChatML training pairs
produced by the distillation and preparation pipeline.

Usage:
    python -m training.finetune --school bishop-state --model 9b
    python -m training.finetune --school bishop-state --model 4b --task summarizer
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from training.config import get_training_data_dir, load_school_config

# ---------------------------------------------------------------------------
# Model map
# ---------------------------------------------------------------------------

_MODEL_MAP: dict[str, str] = {
    "4b": "Qwen/Qwen3.5-4B",
    "9b": "Qwen/Qwen3.5-9B",
    "27b": "Qwen/Qwen3.5-27B",
}


# ---------------------------------------------------------------------------
# Config builder
# ---------------------------------------------------------------------------

def build_lora_config(config: dict[str, Any], task: str, data_dir: Path) -> dict[str, Any]:
    """Build the MLX LoRA config dict from a school training config.

    Parameters
    ----------
    config:
        School config loaded from ``config.yaml``.
    task:
        One of ``"explainer"`` or ``"summarizer"``.
    data_dir:
        Path to the school's training data directory (``training_data/<school>/``).

    Returns
    -------
    dict
        MLX LoRA configuration dict suitable for writing to a JSON file and
        passing to ``mlx_lm.lora``.
    """
    train_cfg = config.get("training", {})
    final_dir = data_dir / "final" / task

    return {
        "model": _MODEL_MAP.get(
            train_cfg.get("default_model", "qwen3.5:9b").split(":")[-1],
            _MODEL_MAP["9b"],
        ),
        "train": True,
        "data": str(final_dir),
        "fine_tune_type": train_cfg.get("method", "qlora"),
        "num_layers": train_cfg.get("lora_rank", 16),
        "lora_parameters": {
            "rank": train_cfg.get("lora_rank", 16),
            "alpha": train_cfg.get("lora_alpha", 32),
            "dropout": 0.05,
            "scale": 10.0,
        },
        "batch_size": train_cfg.get("batch_size", 4),
        "iters": train_cfg.get("epochs", 3) * 1000,
        "val_batches": 25,
        "learning_rate": train_cfg.get("learning_rate", 1e-4),
        "steps_per_report": 10,
        "steps_per_eval": train_cfg.get("eval_every", 50),
        "save_every": train_cfg.get("eval_every", 50),
        "adapter_path": str(data_dir / "adapters" / task),
        "grad_checkpoint": True,
        "seed": 42,
        "warmup": train_cfg.get("warmup_steps", 100),
        "lr_schedule": {
            "name": "cosine_decay",
            "warmup": train_cfg.get("warmup_steps", 100),
            "warmup_init": 1e-7,
            "arguments": [train_cfg.get("learning_rate", 1e-4), 1e-6],
        },
    }


# ---------------------------------------------------------------------------
# Fine-tune runner
# ---------------------------------------------------------------------------

def run_finetune(school: str, model: str, task: str) -> int:
    """Run MLX LoRA fine-tuning for a school/task/model combination.

    Parameters
    ----------
    school:
        School directory name (e.g. ``"bishop-state"``).
    model:
        Model size key: ``"4b"``, ``"9b"``, or ``"27b"``.
    task:
        Task name: ``"explainer"`` or ``"summarizer"``.

    Returns
    -------
    int
        The subprocess return code (0 = success).
    """
    if model not in _MODEL_MAP:
        raise ValueError(
            f"Unknown model size '{model}'. Choose from: {list(_MODEL_MAP.keys())}"
        )

    config = load_school_config(school)
    data_dir = get_training_data_dir(school)
    final_dir = data_dir / "final" / task

    if not final_dir.exists():
        raise FileNotFoundError(
            f"Training data not found at {final_dir}. "
            "Run `python -m training.prepare` first."
        )

    lora_config = build_lora_config(config, task, data_dir)
    lora_config["model"] = _MODEL_MAP[model]

    config_dir = data_dir / "configs"
    config_dir.mkdir(parents=True, exist_ok=True)
    config_path = config_dir / f"lora_{task}_{model}.json"

    with config_path.open("w", encoding="utf-8") as fh:
        json.dump(lora_config, fh, indent=2)

    print(f"[finetune] LoRA config written to {config_path}")
    print(f"[finetune] Base model: {_MODEL_MAP[model]}")
    print(f"[finetune] Task: {task} | School: {school}")
    print(f"[finetune] Adapter output: {lora_config['adapter_path']}")

    cmd = [
        sys.executable, "-m", "mlx_lm.lora",
        "--config", str(config_path),
    ]

    print(f"[finetune] Running: {' '.join(cmd)}", flush=True)
    result = subprocess.run(cmd, check=False)

    if result.returncode == 0:
        print(f"[finetune] Fine-tuning complete. Adapter saved to {lora_config['adapter_path']}")
    else:
        print(
            f"[finetune] Fine-tuning failed with return code {result.returncode}. "
            "Check output above for details.",
            file=sys.stderr,
        )

    return result.returncode


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run MLX QLoRA fine-tuning for a student success adapter."
    )
    parser.add_argument(
        "--school", required=True,
        help="School directory name (e.g. bishop-state)",
    )
    parser.add_argument(
        "--model", choices=list(_MODEL_MAP.keys()), default="9b",
        help="Model size to fine-tune (default: 9b)",
    )
    parser.add_argument(
        "--task", choices=["explainer", "summarizer"], default=None,
        help="Task to fine-tune (default: both)",
    )
    args = parser.parse_args()

    tasks = [args.task] if args.task else ["explainer", "summarizer"]
    exit_codes: list[int] = []

    for task in tasks:
        print(f"\n{'='*60}\nFINETUNE: {task.upper()} | model={args.model}\n{'='*60}")
        try:
            code = run_finetune(args.school, args.model, task)
            exit_codes.append(code)
        except (FileNotFoundError, ValueError) as exc:
            print(f"[error] {exc}", file=sys.stderr)
            exit_codes.append(1)

    sys.exit(max(exit_codes) if exit_codes else 0)


if __name__ == "__main__":
    main()
