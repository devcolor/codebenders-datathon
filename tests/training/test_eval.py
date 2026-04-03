"""Tests for training.eval — metrics and ship criteria."""

import json
import pytest

from training.eval import (
    SHIP_CRITERIA,
    check_json_validity,
    check_schema_adherence,
    check_caveat_inclusion,
    check_ship_criteria,
    ShipDecision,
)


class TestCheckJsonValidity:
    def test_all_valid(self):
        outputs = ['{"key": "value"}', '{"a": 1}']
        assert check_json_validity(outputs) == 1.0

    def test_some_invalid(self):
        outputs = ['{"key": "value"}', "not json", '{"a": 1}']
        assert check_json_validity(outputs) == pytest.approx(2 / 3)

    def test_empty(self):
        assert check_json_validity([]) == 0.0


class TestCheckSchemaAdherence:
    def test_explainer_all_valid(self, sample_explainer_output):
        outputs = [json.dumps(sample_explainer_output)]
        assert check_schema_adherence(outputs, "explainer") == 1.0

    def test_explainer_missing_key(self):
        incomplete = json.dumps({"explanation": "test"})
        assert check_schema_adherence([incomplete], "explainer") < 1.0

    def test_summarizer_all_valid(self, sample_summarizer_output):
        outputs = [json.dumps(sample_summarizer_output)]
        assert check_schema_adherence(outputs, "summarizer") == 1.0


class TestCheckCaveatInclusion:
    def test_all_have_caveats(self, sample_explainer_output):
        outputs = [json.dumps(sample_explainer_output)]
        assert check_caveat_inclusion(outputs, "explainer") == 1.0

    def test_missing_caveats(self):
        no_caveats = json.dumps({
            "explanation": "test",
            "structural_factors": [],
            "student_impact": "impact",
            "advisor_recommendation": "rec",
            "data_limitations": [],
            "related_intervention": None,
        })
        assert check_caveat_inclusion([no_caveats], "explainer") == 0.0


class TestShipCriteria:
    def test_passes_with_good_metrics(self):
        metrics = {
            "json_validity": 0.98,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.92,
            "factual_grounding": 0.90,
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision == "ship"
        assert len(decision.blocking_failures) == 0

    def test_fails_with_low_json_validity(self):
        metrics = {
            "json_validity": 0.80,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.92,
            "factual_grounding": 0.90,
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision == "no_ship"
        assert len(decision.blocking_failures) > 0

    def test_ship_with_gaps(self):
        metrics = {
            "json_validity": 0.98,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.85,
            "factual_grounding": 0.90,
            "explanation_quality": 0.30,
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision in ("ship", "ship_with_gaps")
