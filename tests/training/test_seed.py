"""Tests for training.seed — seed data generation."""

import pytest
import yaml
from pathlib import Path
from unittest.mock import patch

from training.seed import (
    load_seed_queries,
    generate_synthetic_course_pairings,
    generate_synthetic_query_results,
    format_as_chatml,
)


class TestLoadSeedQueries:
    def test_loads_valid_yaml(self, tmp_path):
        seed_file = tmp_path / "seed_queries.yaml"
        seed_file.write_text(yaml.dump({
            "explainer": [
                {"query": "MAT 100 and BIO 201", "style": "advisor"},
            ],
            "summarizer": [
                {"query": "retention by race", "style": "faculty"},
            ],
        }))

        with patch("training.seed.get_school_dir", return_value=tmp_path):
            result = load_seed_queries("test-school")

        assert len(result["explainer"]) == 1
        assert len(result["summarizer"]) == 1
        assert result["explainer"][0]["query"] == "MAT 100 and BIO 201"

    def test_returns_empty_on_missing_file(self, tmp_path):
        with patch("training.seed.get_school_dir", return_value=tmp_path):
            result = load_seed_queries("test-school")
        assert result == {"narrator": [], "explainer": [], "summarizer": []}


class TestGenerateSyntheticCoursePairings:
    def test_generates_requested_count(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=5)
        assert len(results) == 5

    def test_each_has_required_keys(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=3)
        for r in results:
            assert "course_a" in r
            assert "course_b" in r
            assert "stats" in r
            assert "prefix" in r["course_a"]
            assert "number" in r["course_a"]

    def test_returns_empty_for_zero(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=0)
        assert results == []


class TestGenerateSyntheticQueryResults:
    def test_generates_requested_count(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=5)
        assert len(results) == 5

    def test_each_has_required_keys(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=3)
        for r in results:
            assert "prompt" in r
            assert "data" in r
            assert "rowCount" in r
            assert "vizType" in r

    def test_returns_empty_for_zero(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=0)
        assert results == []


class TestFormatAsChatML:
    def test_format_structure(self):
        result = format_as_chatml("system", "user", "assistant")
        assert "messages" in result
        assert len(result["messages"]) == 3
        assert result["messages"][0] == {"role": "system", "content": "system"}
        assert result["messages"][1] == {"role": "user", "content": "user"}
        assert result["messages"][2] == {"role": "assistant", "content": "assistant"}
