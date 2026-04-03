"""Eval harness with ship criteria for model quality gates.

Runs inference on a test set, computes metrics, and decides whether the
fine-tuned model meets minimum quality thresholds for deployment.

Usage:
    python -m training.eval --school bishop-state
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from training.config import get_message_content, get_training_data_dir, read_jsonl
from training.prompts import EXPLAINER_SCHEMA, NARRATOR_SCHEMA, SUMMARIZER_SCHEMA

# ---------------------------------------------------------------------------
# Required keys per task — derived from schema definitions in prompts.py
# ---------------------------------------------------------------------------

_EXPLAINER_REQUIRED_KEYS: set[str] = set(EXPLAINER_SCHEMA.keys())
_NARRATOR_REQUIRED_KEYS: set[str] = set(NARRATOR_SCHEMA.keys())
_SUMMARIZER_REQUIRED_KEYS: set[str] = set(SUMMARIZER_SCHEMA.keys())

# ---------------------------------------------------------------------------
# Ship criteria — minimum thresholds per task
# ---------------------------------------------------------------------------

SHIP_CRITERIA: dict[str, dict[str, float]] = {
    "narrator": {
        "json_validity": 0.95,
        "schema_adherence": 0.90,
        "shap_grounding": 0.80,
        "caveat_inclusion": 0.85,
    },
    "explainer": {
        "json_validity": 0.95,
        "schema_adherence": 0.90,
        "caveat_inclusion": 0.85,
        "factual_grounding": 0.80,
    },
    "summarizer": {
        "json_validity": 0.95,
        "schema_adherence": 0.90,
        "caveat_inclusion": 0.85,
        "factual_grounding": 0.80,
    },
}


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class CriterionFailure:
    metric: str
    threshold: float
    actual: float

    def __str__(self) -> str:
        return (
            f"{self.metric}: {self.actual:.3f} < {self.threshold:.3f} (required)"
        )


@dataclass
class ShipDecision:
    decision: str  # "ship" | "ship_with_gaps" | "no_ship"
    metrics: dict[str, float]
    blocking_failures: list[CriterionFailure] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        lines = [f"Decision: {self.decision.upper()}"]
        for k, v in self.metrics.items():
            lines.append(f"  {k}: {v:.3f}")
        if self.blocking_failures:
            lines.append("Blocking failures:")
            for f_ in self.blocking_failures:
                lines.append(f"  - {f_}")
        if self.warnings:
            lines.append("Warnings:")
            for w in self.warnings:
                lines.append(f"  - {w}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Metric functions
# ---------------------------------------------------------------------------

def check_json_validity(outputs: list[str]) -> float:
    """Fraction of outputs that parse as valid JSON dicts."""
    if not outputs:
        return 0.0
    valid = 0
    for text in outputs:
        try:
            obj = json.loads(text)
            if isinstance(obj, dict):
                valid += 1
        except (json.JSONDecodeError, ValueError):
            pass
    return valid / len(outputs)


def check_schema_adherence(outputs: list[str], task: str) -> float:
    """Fraction of valid JSON outputs that contain all required keys."""
    if not outputs:
        return 0.0
    required = {
        "narrator": _NARRATOR_REQUIRED_KEYS,
        "explainer": _EXPLAINER_REQUIRED_KEYS,
        "summarizer": _SUMMARIZER_REQUIRED_KEYS,
    }.get(task, _SUMMARIZER_REQUIRED_KEYS)
    passing = 0
    total = 0
    for text in outputs:
        try:
            obj = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            total += 1  # invalid JSON counts against schema adherence
            continue
        if not isinstance(obj, dict):
            total += 1
            continue
        total += 1
        if required.issubset(obj.keys()):
            passing += 1
    return passing / total if total else 0.0


def check_caveat_inclusion(outputs: list[str], task: str) -> float:
    """Fraction of valid JSON outputs with non-empty caveat fields.

    The caveat field is "data_limitations" for explainer, "caveats" for summarizer.
    """
    if not outputs:
        return 0.0
    caveat_key = "caveats" if task == "summarizer" else "data_limitations"
    passing = 0
    total = 0
    for text in outputs:
        try:
            obj = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            total += 1
            continue
        if not isinstance(obj, dict):
            total += 1
            continue
        total += 1
        caveat_val = obj.get(caveat_key)
        if caveat_val and (
            (isinstance(caveat_val, list) and len(caveat_val) > 0)
            or (isinstance(caveat_val, str) and caveat_val.strip())
        ):
            passing += 1
    return passing / total if total else 0.0


def check_shap_grounding(outputs: list[str], inputs: list[dict[str, Any]], min_features: int = 2) -> float:
    """Fraction of narrator outputs that mention at least `min_features` of the top-3 SHAP features.

    Extracts feature names from the input's SHAP data and checks whether the
    narrative text references them (case-insensitive, underscore-tolerant).
    """
    if not outputs:
        return 0.0
    passing = 0
    total = 0
    for output_text, input_data in zip(outputs, inputs):
        total += 1
        # Collect top SHAP feature names from all models in the input
        shap_data = input_data.get("shap", {})
        top_features: list[str] = []
        for model_attrs in shap_data.values():
            for entry in model_attrs.get("top_positive", [])[:3]:
                top_features.append(entry["feature"])
            for entry in model_attrs.get("top_negative", [])[:3]:
                top_features.append(entry["feature"])
        top_features = list(dict.fromkeys(top_features))[:6]

        if not top_features:
            passing += 1  # no SHAP data to ground against
            continue

        # Check how many features appear in the output (case-insensitive, underscores → spaces)
        output_lower = output_text.lower().replace("_", " ")
        mentioned = sum(
            1 for f in top_features
            if f.lower().replace("_", " ") in output_lower
        )
        if mentioned >= min_features:
            passing += 1

    return passing / total if total else 0.0


def check_factual_grounding(outputs: list[str], inputs: list[dict[str, Any]]) -> float:
    """Fraction of outputs that contain numeric values referenced in their input.

    For each (input, output) pair, extracts all numbers from the input JSON
    and checks whether at least one appears in the output text.
    """
    if not outputs:
        return 0.0
    pairs = list(zip(outputs, inputs))
    passing = 0
    total = 0
    for output_text, input_data in pairs:
        total += 1
        input_str = json.dumps(input_data, default=str)
        numbers = re.findall(r"\b\d+(?:\.\d+)?\b", input_str)
        if not numbers:
            passing += 1
            continue
        if any(num in output_text for num in numbers):
            passing += 1
    return passing / total if total else 0.0


# ---------------------------------------------------------------------------
# Ship-criteria check
# ---------------------------------------------------------------------------

def check_ship_criteria(metrics: dict[str, float], task: str) -> ShipDecision:
    """Compare metrics to thresholds and return a ShipDecision.

    Metrics not in SHIP_CRITERIA are treated as informational (warnings only).
    A "ship_with_gaps" decision is returned when all blocking criteria pass but
    informational metrics are notably low (< 0.5).
    """
    criteria = SHIP_CRITERIA.get(task, {})
    blocking_failures: list[CriterionFailure] = []
    warnings: list[str] = []

    # Check all required criteria — missing metrics are blocking failures
    for metric, threshold in criteria.items():
        value = metrics.get(metric)
        if value is None:
            blocking_failures.append(
                CriterionFailure(metric=metric, threshold=threshold, actual=0.0)
            )
        elif value < threshold:
            blocking_failures.append(
                CriterionFailure(metric=metric, threshold=threshold, actual=value)
            )

    # Check informational metrics (present in metrics but not in criteria)
    for metric, value in metrics.items():
        if metric not in criteria and value < 0.5:
            warnings.append(
                f"{metric} is low ({value:.3f}) — consider improving before deploying"
            )

    if blocking_failures:
        decision = "no_ship"
    elif warnings:
        decision = "ship_with_gaps"
    else:
        decision = "ship"

    return ShipDecision(
        decision=decision,
        metrics=metrics,
        blocking_failures=blocking_failures,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Test-set loading and inference
# ---------------------------------------------------------------------------

def load_test_set(path: Path) -> list[dict[str, Any]]:
    """Load a ChatML JSONL test set from path."""
    return read_jsonl(path)


def _call_ollama(model: str, system: str, user: str) -> str:
    """Call an Ollama model and return the response text."""
    try:
        import ollama
    except ImportError as exc:
        raise ImportError(
            "ollama package is required for eval inference. "
            "Install with: pip install ollama"
        ) from exc

    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response["message"]["content"]


def run_eval(school: str, task: str) -> ShipDecision:
    """Run inference on the test set, compute metrics, and return a ShipDecision.

    Inference is performed via Ollama using the fine-tuned model registered
    as ``{school}-{task}`` (e.g. ``bishop-state-explainer``).
    """
    data_dir = get_training_data_dir(school)
    test_path = data_dir / "final" / task / "test.jsonl"

    if not test_path.exists():
        raise FileNotFoundError(
            f"Test set not found at {test_path}. "
            "Run `python -m training.prepare` first."
        )

    records = load_test_set(test_path)
    if not records:
        raise ValueError(f"Test set is empty: {test_path}")

    model_name = f"{school}-{task}"
    print(f"[eval] Running inference with model '{model_name}' on {len(records)} examples")

    outputs: list[str] = []
    inputs: list[dict[str, Any]] = []

    for idx, record in enumerate(records):
        system = get_message_content(record, "system") or ""
        user = get_message_content(record, "user") or ""
        try:
            response = _call_ollama(model_name, system, user)
        except Exception as exc:
            print(f"[eval] Inference failed for record {idx}: {exc}", flush=True)
            response = ""

        outputs.append(response)
        try:
            user_data = json.loads(user)
        except (json.JSONDecodeError, ValueError):
            user_data = {"raw": user}
        inputs.append(user_data)

        if (idx + 1) % 10 == 0:
            print(f"[eval] {idx + 1}/{len(records)} done", flush=True)

    # Compute metrics
    metrics: dict[str, float] = {
        "json_validity": check_json_validity(outputs),
        "schema_adherence": check_schema_adherence(outputs, task),
        "caveat_inclusion": check_caveat_inclusion(outputs, task),
    }
    if task == "narrator":
        metrics["shap_grounding"] = check_shap_grounding(outputs, inputs)
    else:
        metrics["factual_grounding"] = check_factual_grounding(outputs, inputs)

    print(f"\n[eval] Results for {school}/{task}:")
    for k, v in metrics.items():
        print(f"  {k}: {v:.3f}")

    decision = check_ship_criteria(metrics, task)
    print(f"\n{decision}")
    return decision


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Evaluate a fine-tuned model against ship criteria."
    )
    parser.add_argument("--school", required=True, help="School directory name (e.g. bishop-state)")
    parser.add_argument(
        "--task",
        choices=["narrator", "explainer", "summarizer"],
        default=None,
        help="Task to evaluate (default: both)",
    )
    args = parser.parse_args()

    tasks = [args.task] if args.task else ["narrator", "explainer", "summarizer"]
    results: dict[str, ShipDecision] = {}
    for task in tasks:
        print(f"\n{'='*60}\nEVAL: {task.upper()}\n{'='*60}")
        try:
            results[task] = run_eval(args.school, task)
        except FileNotFoundError as exc:
            print(f"[warn] {exc} — skipping {task}")

    print(f"\n{'='*60}\nSUMMARY\n{'='*60}")
    for task, decision in results.items():
        print(f"  {task}: {decision.decision.upper()}")


if __name__ == "__main__":
    main()
