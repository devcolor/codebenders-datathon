"""Tests for training.prepare — filter, deduplicate, and split."""

import json
import pytest

from training.prepare import (
    filter_invalid_json,
    deduplicate_by_jaccard,
    jaccard_similarity,
    split_dataset,
)


class TestFilterInvalidJson:
    def test_keeps_valid_pairs(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "question"},
                {"role": "assistant", "content": '{"key": "value"}'},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 1

    def test_removes_invalid_json_assistant(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "question"},
                {"role": "assistant", "content": "not json"},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 0

    def test_removes_missing_messages(self):
        assert filter_invalid_json([{"no_messages": True}]) == []

    def test_removes_empty_user(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": ""},
                {"role": "assistant", "content": '{"key": "value"}'},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 0


class TestJaccardSimilarity:
    def test_identical_strings(self):
        assert jaccard_similarity("hello world", "hello world") == 1.0

    def test_completely_different(self):
        assert jaccard_similarity("hello", "world") == 0.0

    def test_partial_overlap(self):
        result = jaccard_similarity("hello world foo", "hello world bar")
        assert 0.0 < result < 1.0

    def test_empty_string(self):
        assert jaccard_similarity("", "hello") == 0.0


class TestDeduplicateByJaccard:
    def test_removes_exact_duplicates(self):
        pairs = [
            {"messages": [{"role": "user", "content": "same question"}]},
            {"messages": [{"role": "user", "content": "same question"}]},
            {"messages": [{"role": "user", "content": "different question"}]},
        ]
        result = deduplicate_by_jaccard(pairs, threshold=1.0)
        assert len(result) == 2

    def test_empty_input(self):
        assert deduplicate_by_jaccard([], threshold=1.0) == []

    def test_preserves_order(self):
        pairs = [
            {"messages": [{"role": "user", "content": "first"}]},
            {"messages": [{"role": "user", "content": "second"}]},
        ]
        result = deduplicate_by_jaccard(pairs, threshold=1.0)
        assert result[0]["messages"][0]["content"] == "first"


class TestSplitDataset:
    def test_split_ratios(self):
        pairs = [{"id": i} for i in range(100)]
        splits = split_dataset(pairs, train_ratio=0.8, val_ratio=0.1)
        assert len(splits["train"]) == 80
        assert len(splits["val"]) == 10
        assert len(splits["test"]) == 10

    def test_deterministic(self):
        pairs = [{"id": i} for i in range(50)]
        split1 = split_dataset(pairs, seed=42)
        split2 = split_dataset(pairs, seed=42)
        assert split1["train"] == split2["train"]

    def test_empty_input(self):
        splits = split_dataset([])
        assert splits == {"train": [], "val": [], "test": []}
