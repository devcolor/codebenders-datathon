"""Dataset preparation — filter, deduplicate, and split training pairs.

Usage:
    python -m training.prepare --school bishop-state
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

from training.config import (
    JACCARD_THRESHOLD,
    TRAIN_RATIO,
    VAL_RATIO,
    get_message_content,
    get_training_data_dir,
    read_jsonl,
    write_jsonl,
)


def jaccard_similarity(a: str, b: str) -> float:
    """Compute word-level Jaccard similarity between two strings."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def filter_invalid_json(pairs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only pairs with valid structure and JSON-parseable assistant content."""
    valid = []
    for pair in pairs:
        messages = pair.get("messages")
        if not isinstance(messages, list) or not messages:
            continue
        if any(not isinstance(msg, dict) for msg in messages):
            continue
        has_user = any(
            msg.get("role") == "user" and msg.get("content")
            for msg in messages
        )
        if not has_user:
            continue
        assistant_content = None
        for msg in messages:
            if msg.get("role") == "assistant":
                assistant_content = msg.get("content")
                break
        if not isinstance(assistant_content, str) or not assistant_content:
            continue
        try:
            json.loads(assistant_content)
        except (json.JSONDecodeError, ValueError):
            continue
        valid.append(pair)
    return valid


def deduplicate_by_jaccard(
    pairs: list[dict[str, Any]], threshold: float = JACCARD_THRESHOLD,
) -> list[dict[str, Any]]:
    """Remove near-duplicate pairs based on user-message Jaccard similarity."""
    if not pairs:
        return pairs
    kept: list[dict[str, Any]] = [pairs[0]]
    kept_word_sets: list[set] = [set((get_message_content(pairs[0], "user") or "").lower().split())]
    for pair in pairs[1:]:
        candidate_words = set((get_message_content(pair, "user") or "").lower().split())
        is_duplicate = any(
            _jaccard_sets(candidate_words, kw) >= threshold
            for kw in kept_word_sets
        )
        if not is_duplicate:
            kept.append(pair)
            kept_word_sets.append(candidate_words)
    return kept


def _jaccard_sets(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def split_dataset(
    pairs: list[dict[str, Any]], train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO, seed: int = 42,
) -> dict[str, list[dict[str, Any]]]:
    """Shuffle and split pairs into train/val/test with a deterministic seed."""
    if not pairs:
        return {"train": [], "val": [], "test": []}
    shuffled = list(pairs)
    rng = random.Random(seed)
    rng.shuffle(shuffled)
    n = len(shuffled)
    train_end = round(n * train_ratio)
    val_end = train_end + round(n * val_ratio)
    return {
        "train": shuffled[:train_end],
        "val": shuffled[train_end:val_end],
        "test": shuffled[val_end:],
    }


def process_task(school: str, task: str) -> dict[str, int]:
    """Load, filter, deduplicate, and split training data for a task."""
    data_dir = get_training_data_dir(school)
    input_path = data_dir / "pairs" / f"{task}.jsonl"
    if not input_path.exists():
        raise FileNotFoundError(f"Pairs file not found: {input_path}")
    pairs = read_jsonl(input_path)
    print(f"[{task}] Loaded {len(pairs)} pairs from {input_path}")
    pairs = filter_invalid_json(pairs)
    print(f"[{task}] After JSON filter: {len(pairs)} pairs")
    pairs = deduplicate_by_jaccard(pairs, threshold=JACCARD_THRESHOLD)
    print(f"[{task}] After deduplication: {len(pairs)} pairs")
    splits = split_dataset(pairs)
    final_dir = data_dir / "final" / task
    counts: dict[str, int] = {}
    for split_name, split_pairs in splits.items():
        out_path = final_dir / f"{split_name}.jsonl"
        n = write_jsonl(split_pairs, out_path)
        counts[split_name] = n
        print(f"[{task}] Wrote {n} examples to {out_path}")
    return counts


def main(school: str) -> None:
    """Run preparation for all tasks."""
    for task in ("explainer", "summarizer"):
        try:
            process_task(school, task)
        except FileNotFoundError as e:
            print(f"[warn] {e} — skipping")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Filter, deduplicate, and split training pairs.")
    parser.add_argument("--school", required=True, help="School directory name")
    args = parser.parse_args()
    main(args.school)
