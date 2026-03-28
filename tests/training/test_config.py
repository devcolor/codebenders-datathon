"""Tests for training.config — constants and school config loader."""

import pytest
import yaml
from pathlib import Path
from unittest.mock import patch

from training.config import (
    BASE_DIR,
    SCHOOLS_DIR,
    TRAIN_RATIO,
    VAL_RATIO,
    TEST_RATIO,
    load_school_config,
    get_school_dir,
    get_training_data_dir,
    write_jsonl,
)


class TestConstants:
    def test_split_ratios_sum_to_one(self):
        assert TRAIN_RATIO + VAL_RATIO + TEST_RATIO == pytest.approx(1.0)

    def test_base_dir_is_path(self):
        assert isinstance(BASE_DIR, Path)

    def test_schools_dir_is_path(self):
        assert isinstance(SCHOOLS_DIR, Path)


class TestLoadSchoolConfig:
    def test_loads_valid_config(self, tmp_path, sample_school_config):
        school_dir = tmp_path / "test-school"
        school_dir.mkdir()
        config_path = school_dir / "config.yaml"
        config_path.write_text(yaml.dump(sample_school_config))

        with patch("training.config.SCHOOLS_DIR", tmp_path):
            config = load_school_config("test-school")

        assert config["school"]["name"] == "Test Community College"
        assert config["school"]["code"] == "tcc"
        assert config["database"]["main_table"] == "student_level_with_predictions"

    def test_raises_on_missing_school(self, tmp_path):
        with patch("training.config.SCHOOLS_DIR", tmp_path):
            with pytest.raises(FileNotFoundError, match="School config not found"):
                load_school_config("nonexistent")

    def test_raises_on_missing_required_keys(self, tmp_path):
        school_dir = tmp_path / "bad-school"
        school_dir.mkdir()
        config_path = school_dir / "config.yaml"
        config_path.write_text(yaml.dump({"school": {"name": "Bad"}}))

        with patch("training.config.SCHOOLS_DIR", tmp_path):
            with pytest.raises(ValueError, match="Missing required"):
                load_school_config("bad-school")


class TestGetSchoolDir:
    def test_returns_path(self, tmp_path):
        with patch("training.config.SCHOOLS_DIR", tmp_path):
            result = get_school_dir("bishop-state")
        assert result == tmp_path / "bishop-state"


class TestGetTrainingDataDir:
    def test_returns_path_with_school(self):
        result = get_training_data_dir("bishop-state")
        assert "bishop-state" in str(result)
        assert result.name == "bishop-state"


class TestWriteJsonl:
    def test_writes_items(self, tmp_path):
        import json
        items = [{"a": 1}, {"b": 2}]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile)
        assert count == 2
        lines = outfile.read_text().strip().split("\n")
        assert json.loads(lines[0]) == {"a": 1}
        assert json.loads(lines[1]) == {"b": 2}

    def test_writes_with_transform(self, tmp_path):
        import json
        items = [1, 2, 3]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile, transform=lambda x: {"val": x * 2})
        assert count == 3
        lines = outfile.read_text().strip().split("\n")
        assert json.loads(lines[0]) == {"val": 2}

    def test_skips_none_from_transform(self, tmp_path):
        items = [1, 2, 3]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile, transform=lambda x: None if x == 2 else {"v": x})
        assert count == 2

    def test_creates_parent_dirs(self, tmp_path):
        outfile = tmp_path / "sub" / "dir" / "test.jsonl"
        count = write_jsonl([{"x": 1}], outfile)
        assert count == 1
        assert outfile.exists()
