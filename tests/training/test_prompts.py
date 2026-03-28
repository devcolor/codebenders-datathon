"""Tests for training.prompts — teacher prompt templates."""

import json
import pytest

from training.prompts import (
    build_system_prompt,
    build_explainer_prompt,
    build_summarizer_prompt,
    EXPLAINER_STUDENT_SYSTEM,
    SUMMARIZER_STUDENT_SYSTEM,
    EXPLAINER_SCHEMA,
    SUMMARIZER_SCHEMA,
)


class TestBuildSystemPrompt:
    def test_includes_school_name(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Test Community College" in result

    def test_includes_location(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Test City" in result
        assert "Alabama" in result

    def test_includes_demographics(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Pell" in result or "pell" in result

    def test_returns_string(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert isinstance(result, str)
        assert len(result) > 100


class TestBuildExplainerPrompt:
    def test_includes_course_data(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "MAT" in result
        assert "BIO" in result

    def test_includes_stats(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "0.42" in result or "42" in result

    def test_includes_output_schema(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "explanation" in result
        assert "structural_factors" in result
        assert "advisor_recommendation" in result

    def test_returns_string(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert isinstance(result, str)


class TestBuildSummarizerPrompt:
    def test_includes_query(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "retention rate by race" in result

    def test_includes_data(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "Black" in result
        assert "0.41" in result or "41" in result

    def test_includes_output_schema(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "summary" in result
        assert "key_insights" in result
        assert "action_items" in result

    def test_returns_string(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert isinstance(result, str)


class TestStudentPrompts:
    def test_explainer_student_system_is_concise(self):
        assert len(EXPLAINER_STUDENT_SYSTEM) < 500
        assert "JSON" in EXPLAINER_STUDENT_SYSTEM

    def test_summarizer_student_system_is_concise(self):
        assert len(SUMMARIZER_STUDENT_SYSTEM) < 500
        assert "JSON" in SUMMARIZER_STUDENT_SYSTEM


class TestOutputSchemas:
    def test_explainer_schema_has_required_keys(self):
        required = {"explanation", "structural_factors", "student_impact",
                     "advisor_recommendation", "data_limitations", "related_intervention"}
        assert required == set(EXPLAINER_SCHEMA.keys())

    def test_summarizer_schema_has_required_keys(self):
        required = {"summary", "key_insights", "context", "action_items", "caveats"}
        assert required == set(SUMMARIZER_SCHEMA.keys())
