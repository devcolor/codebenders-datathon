"""Tests for training.distill — teacher model distillation."""

import json
import pytest
from unittest.mock import patch, MagicMock

from training.distill import (
    validate_json,
    call_teacher,
    generate_pairs,
)


class TestValidateJson:
    def test_valid_json(self):
        result = validate_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_strips_markdown_fences(self):
        result = validate_json('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_returns_none_for_invalid(self):
        assert validate_json("not json") is None

    def test_returns_none_for_empty(self):
        assert validate_json("") is None
        assert validate_json(None) is None

    def test_returns_none_for_non_dict(self):
        assert validate_json("[1, 2, 3]") is None


class TestCallTeacher:
    def test_calls_anthropic_backend(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text='{"result": "ok"}')]
        mock_message.usage.input_tokens = 100
        mock_message.usage.output_tokens = 50
        mock_client.messages.create.return_value = mock_message

        with patch("training.distill._get_anthropic_client", return_value=mock_client):
            result = call_teacher(
                system="system prompt",
                user="user prompt",
                backend="anthropic",
                model="claude-sonnet-4-20250514",
            )

        assert result == '{"result": "ok"}'
        mock_client.messages.create.assert_called_once()

    def test_calls_ollama_backend(self):
        mock_response = {"message": {"content": '{"result": "ok"}'}}

        with patch("training.distill.ollama") as mock_ollama:
            mock_ollama.chat.return_value = mock_response
            result = call_teacher(
                system="system prompt",
                user="user prompt",
                backend="ollama",
                model="qwen3.5:27b",
            )

        assert result == '{"result": "ok"}'
        mock_ollama.chat.assert_called_once()


class TestGenerateExplainerPairs:
    def test_generates_pairs_from_seed_data(self, sample_school_config, sample_course_pairing_data):
        mock_response = json.dumps({
            "explanation": "Test explanation",
            "structural_factors": ["factor1"],
            "student_impact": "impact",
            "advisor_recommendation": "recommendation",
            "data_limitations": ["caveat"],
            "related_intervention": None,
        })

        with patch("training.distill.call_teacher", return_value=mock_response):
            pairs = generate_pairs(
                config=sample_school_config,
                seed_data=[sample_course_pairing_data],
                count=2,
                task="explainer",
            )

        assert len(pairs) == 2
        assert "messages" in pairs[0]
        assert len(pairs[0]["messages"]) == 3

    def test_skips_invalid_responses(self, sample_school_config, sample_course_pairing_data):
        with patch("training.distill.call_teacher", return_value="not json"):
            pairs = generate_pairs(
                config=sample_school_config,
                seed_data=[sample_course_pairing_data],
                count=3,
                task="explainer",
            )

        assert len(pairs) == 0


class TestGenerateSummarizerPairs:
    def test_generates_pairs_from_seed_data(self, sample_school_config, sample_query_result_data):
        mock_response = json.dumps({
            "summary": "Test summary",
            "key_insights": ["insight1"],
            "context": "context",
            "action_items": ["action"],
            "caveats": ["caveat"],
        })

        with patch("training.distill.call_teacher", return_value=mock_response):
            pairs = generate_pairs(
                config=sample_school_config,
                seed_data=[sample_query_result_data],
                count=2,
                task="summarizer",
            )

        assert len(pairs) == 2
        assert "messages" in pairs[0]
