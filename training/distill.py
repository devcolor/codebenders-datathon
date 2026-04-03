"""Distillation pipeline — generate ChatML training pairs via a teacher model.

Supports two backends:
  - anthropic: Claude Sonnet via Anthropic API (production quality)
  - ollama: Local model via Ollama (free iteration)

Usage:
    python -m training.distill --school bishop-state [--local]
"""

from __future__ import annotations

import argparse
import functools
import json
import os
import time
from pathlib import Path
from typing import Any

from training.config import get_training_data_dir, load_school_config, write_jsonl
from training.prompts import (
    EXPLAINER_STUDENT_SYSTEM,
    NARRATOR_STUDENT_SYSTEM,
    SUMMARIZER_STUDENT_SYSTEM,
    build_explainer_prompt,
    build_narrator_prompt,
    build_summarizer_prompt,
    build_system_prompt,
)
from training.seed import (
    format_as_chatml,
    generate_synthetic_course_pairings,
    generate_synthetic_query_results,
    generate_synthetic_student_profiles,
)

# Cost tracking
_COST_PER_M_INPUT = 3.00
_COST_PER_M_OUTPUT = 15.00
_total_input_tokens = 0
_total_output_tokens = 0
_total_calls = 0


def _track_cost(input_tokens: int, output_tokens: int) -> None:
    global _total_input_tokens, _total_output_tokens, _total_calls
    _total_input_tokens += input_tokens
    _total_output_tokens += output_tokens
    _total_calls += 1


def _cost_so_far() -> float:
    return (
        _total_input_tokens / 1_000_000 * _COST_PER_M_INPUT
        + _total_output_tokens / 1_000_000 * _COST_PER_M_OUTPUT
    )


def _print_cost_summary() -> None:
    cost = _cost_so_far()
    print(
        f"[cost] {_total_calls} API calls | "
        f"{_total_input_tokens:,} in + {_total_output_tokens:,} out tokens | "
        f"${cost:.2f} spent so far",
        flush=True,
    )


def validate_json(text: str | None) -> dict | None:
    """Strip markdown fences and parse as JSON dict."""
    if not text or not isinstance(text, str) or not text.strip():
        return None
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    try:
        obj = json.loads(stripped)
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(obj, dict):
        return None
    return obj


@functools.lru_cache(maxsize=1)
def _get_anthropic_client():
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY environment variable is required for Claude distillation.")
    return anthropic.Anthropic(api_key=api_key)


try:
    import ollama
except ImportError:
    ollama = None  # type: ignore[assignment]


def call_teacher(system: str, user: str, backend: str, model: str) -> str:
    """Call the teacher model and return the response text."""
    preview = user[:120].replace("\n", " ")
    print(f"[api] Calling {model} ({backend}) | {preview}...", flush=True)

    if backend == "anthropic":
        client = _get_anthropic_client()
        message = client.messages.create(
            model=model, max_tokens=2048, system=system,
            messages=[{"role": "user", "content": user}],
        )
        usage = message.usage
        _track_cost(usage.input_tokens, usage.output_tokens)
        print(f"[api] done {usage.input_tokens}in/{usage.output_tokens}out tokens", flush=True)
        if _total_calls % 10 == 0:
            _print_cost_summary()
        return message.content[0].text

    elif backend == "ollama":
        if ollama is None:
            raise ImportError("ollama package is required for local teacher. Install with: pip install ollama")
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response["message"]["content"]

    else:
        raise ValueError(f"Unknown backend: {backend!r}. Must be 'anthropic' or 'ollama'.")


_FLUSH_INTERVAL = 25

_TASK_CONFIG = {
    "narrator": {
        "prompt_builder": build_narrator_prompt,
        "student_system": NARRATOR_STUDENT_SYSTEM,
        "format_user": lambda config, data: json.dumps(data, ensure_ascii=False, default=str),
    },
    "explainer": {
        "prompt_builder": build_explainer_prompt,
        "student_system": EXPLAINER_STUDENT_SYSTEM,
        "format_user": lambda config, data: json.dumps(data, ensure_ascii=False, default=str),
    },
    "summarizer": {
        "prompt_builder": build_summarizer_prompt,
        "student_system": SUMMARIZER_STUDENT_SYSTEM,
        "format_user": lambda config, data: json.dumps(
            {"prompt": data["prompt"], "data": data["data"][:50]},
            ensure_ascii=False, default=str,
        ),
    },
}


def generate_pairs(
    config: dict[str, Any], seed_data: list[dict[str, Any]],
    count: int, task: str, outfile: Path | None = None,
    system_prompt: str | None = None,
) -> list[dict]:
    """Generate training pairs via teacher model distillation.

    Args:
        config: Parsed school config.
        seed_data: List of seed data dicts.
        count: Number of pairs to generate.
        task: "explainer" or "summarizer".
        outfile: If provided, pairs are written incrementally.
        system_prompt: Pre-built system prompt (avoids recomputation).
    """
    task_cfg = _TASK_CONFIG[task]
    distill_config = config.get("distillation", {})
    backend = distill_config.get("teacher_backend", "anthropic")
    model = distill_config.get("teacher_model", "claude-sonnet-4-20250514")
    if system_prompt is None:
        system_prompt = build_system_prompt(config)
    pairs: list[dict] = []

    fh = None
    if outfile is not None:
        outfile.parent.mkdir(parents=True, exist_ok=True)
        fh = outfile.open("w", encoding="utf-8")

    try:
        for idx in range(count):
            if idx > 0 and idx % 25 == 0:
                time.sleep(1)
            seed_item = seed_data[idx % len(seed_data)]
            teacher_prompt = task_cfg["prompt_builder"](config, seed_item)
            try:
                response_text = call_teacher(system_prompt, teacher_prompt, backend, model)
            except Exception as exc:
                print(f"[warn] Teacher call failed for {task} pair {idx}: {exc}", flush=True)
                continue
            validated = validate_json(response_text)
            if validated is None:
                print(f"[warn] Invalid JSON for {task} pair {idx}, skipping.", flush=True)
                continue
            student_user = task_cfg["format_user"](config, seed_item)
            pair = format_as_chatml(
                system=task_cfg["student_system"], user=student_user,
                assistant=json.dumps(validated, ensure_ascii=False),
            )
            pairs.append(pair)
            if fh is not None:
                fh.write(json.dumps(pair, ensure_ascii=False) + "\n")
                if len(pairs) % _FLUSH_INTERVAL == 0:
                    fh.flush()
            print(f"[{task}] {len(pairs)}/{count} pairs generated", flush=True)
    finally:
        if fh is not None:
            fh.close()
            print(f"[{task}] Saved {len(pairs)} pairs to {outfile}", flush=True)
    return pairs


def generate_explainer_pairs(
    config: dict[str, Any], seed_data: list[dict[str, Any]],
    count: int, outfile: Path | None = None,
    system_prompt: str | None = None,
) -> list[dict]:
    """Generate explainer training pairs via teacher model distillation."""
    return generate_pairs(config, seed_data, count, "explainer", outfile, system_prompt)


def generate_summarizer_pairs(
    config: dict[str, Any], seed_data: list[dict[str, Any]],
    count: int, outfile: Path | None = None,
    system_prompt: str | None = None,
) -> list[dict]:
    """Generate summarizer training pairs via teacher model distillation."""
    return generate_pairs(config, seed_data, count, "summarizer", outfile, system_prompt)


def main(school: str, local: bool = False) -> None:
    """Run distillation for a school."""
    config = load_school_config(school)
    if local:
        config["distillation"]["teacher_backend"] = config["distillation"].get("local_teacher_backend", "ollama")
        config["distillation"]["teacher_model"] = config["distillation"].get("local_teacher_model", "qwen3.5:27b")
        print(f"[distill] Using local teacher: {config['distillation']['teacher_model']}")
    else:
        print(f"[distill] Using API teacher: {config['distillation']['teacher_model']}")

    pairs_per_task = config["distillation"].get("pairs_per_task", 1500)
    data_dir = get_training_data_dir(school)
    pairs_dir = data_dir / "pairs"

    system_prompt = build_system_prompt(config)

    all_counts: dict[str, int] = {}

    # Narrator
    print(f"\n{'='*60}\nNARRATOR — generating {pairs_per_task} pairs\n{'='*60}")
    synthetic_profiles = generate_synthetic_student_profiles(config, count=pairs_per_task)
    narrator_pairs = generate_pairs(
        config=config, seed_data=synthetic_profiles,
        count=pairs_per_task, task="narrator", outfile=pairs_dir / "narrator.jsonl",
        system_prompt=system_prompt,
    )
    all_counts["narrator"] = len(narrator_pairs)

    # Explainer
    print(f"\n{'='*60}\nEXPLAINER — generating {pairs_per_task} pairs\n{'='*60}")
    synthetic_pairings = generate_synthetic_course_pairings(config, count=pairs_per_task)
    explainer_pairs = generate_pairs(
        config=config, seed_data=synthetic_pairings,
        count=pairs_per_task, task="explainer", outfile=pairs_dir / "explainer.jsonl",
        system_prompt=system_prompt,
    )
    all_counts["explainer"] = len(explainer_pairs)

    # Summarizer
    print(f"\n{'='*60}\nSUMMARIZER — generating {pairs_per_task} pairs\n{'='*60}")
    synthetic_results = generate_synthetic_query_results(config, count=pairs_per_task)
    summarizer_pairs = generate_pairs(
        config=config, seed_data=synthetic_results,
        count=pairs_per_task, task="summarizer", outfile=pairs_dir / "summarizer.jsonl",
        system_prompt=system_prompt,
    )
    all_counts["summarizer"] = len(summarizer_pairs)

    print(f"\n{'='*60}\nDISTILLATION COMPLETE\n{'='*60}")
    for task_name, count in all_counts.items():
        print(f"  {task_name.capitalize()}: {count} pairs")
    _print_cost_summary()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate training pairs via teacher model distillation.")
    parser.add_argument("--school", required=True, help="School directory name")
    parser.add_argument("--local", action="store_true", help="Use local Ollama teacher")
    args = parser.parse_args()
    main(args.school, local=args.local)
