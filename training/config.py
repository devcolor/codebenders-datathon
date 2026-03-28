"""Shared constants and school config loader for the training pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Optional

import yaml

# Directory layout
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHOOLS_DIR = PROJECT_ROOT / "schools"
BASE_DIR = PROJECT_ROOT / "training_data"

# Dataset split ratios
TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

# Deduplication
JACCARD_THRESHOLD = 1.0

# Required top-level keys in school config
_REQUIRED_KEYS = {"school", "database", "schema", "domain", "distillation", "training"}


def load_school_config(school: str) -> dict[str, Any]:
    """Load and validate a school's config.yaml."""
    config_path = SCHOOLS_DIR / school / "config.yaml"
    if not config_path.exists():
        raise FileNotFoundError(f"School config not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as fh:
        config = yaml.safe_load(fh)

    missing = _REQUIRED_KEYS - set(config.keys())
    if missing:
        raise ValueError(f"Missing required top-level keys in {config_path}: {missing}")

    return config


def get_school_dir(school: str) -> Path:
    """Return the path to a school's config directory."""
    return SCHOOLS_DIR / school


def get_training_data_dir(school: str) -> Path:
    """Return the path to a school's training data directory."""
    return BASE_DIR / school


def write_jsonl(
    items: list,
    outfile: Path,
    transform: Optional[Callable] = None,
) -> int:
    """Write items to a JSONL file."""
    outfile = Path(outfile)
    outfile.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with outfile.open("w", encoding="utf-8") as fh:
        for item in items:
            if transform is not None:
                item = transform(item)
            if item is None:
                continue
            fh.write(json.dumps(item, ensure_ascii=False) + "\n")
            count += 1
    return count
