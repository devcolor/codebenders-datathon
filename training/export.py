"""Ollama model export and registration for student success adapters.

Converts an MLX LoRA adapter into an Ollama model by generating a Modelfile
and running ``ollama create``.

Usage:
    python -m training.export --school bishop-state
    python -m training.export --school bishop-state --task explainer --model 9b
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from training.config import get_training_data_dir, load_school_config
from training.prompts import EXPLAINER_STUDENT_SYSTEM, SUMMARIZER_STUDENT_SYSTEM

_SYSTEM_PROMPTS = {
    "explainer": EXPLAINER_STUDENT_SYSTEM,
    "summarizer": SUMMARIZER_STUDENT_SYSTEM,
}

# ---------------------------------------------------------------------------
# Modelfile template
# ---------------------------------------------------------------------------

_MODELFILE_TEMPLATE = """\
FROM {base_model}

# Adapter produced by MLX QLoRA fine-tuning
ADAPTER {adapter_path}

# System prompt
SYSTEM {system_prompt_json}

# Recommended inference parameters
PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|endoftext|>"
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_modelfile(base_model: str, adapter_path: str, system_prompt: str) -> str:
    """Generate an Ollama Modelfile string.

    Parameters
    ----------
    base_model:
        The base Ollama model tag (e.g. ``"qwen3.5:9b"``).
    adapter_path:
        Absolute path to the MLX LoRA adapter directory.
    system_prompt:
        The system prompt string to embed in the Modelfile.

    Returns
    -------
    str
        The fully rendered Modelfile content.
    """
    system_prompt_json = json.dumps(system_prompt)
    return _MODELFILE_TEMPLATE.format(
        base_model=base_model,
        adapter_path=adapter_path,
        system_prompt_json=system_prompt_json,
    )


# ---------------------------------------------------------------------------
# Export runner
# ---------------------------------------------------------------------------

def export_model(school: str, task: str, model: str = "9b") -> int:
    """Write a Modelfile and register the model with Ollama.

    Parameters
    ----------
    school:
        School directory name (e.g. ``"bishop-state"``).
    task:
        Task name: ``"explainer"`` or ``"summarizer"``.
    model:
        Model size key used during fine-tuning (``"4b"``, ``"9b"``, or ``"27b"``).
        Used to locate the adapter and set the base model tag.

    Returns
    -------
    int
        The ``ollama create`` subprocess return code (0 = success).
    """
    config = load_school_config(school)
    data_dir = get_training_data_dir(school)

    adapter_path = data_dir / "adapters" / task
    if not adapter_path.exists():
        raise FileNotFoundError(
            f"Adapter not found at {adapter_path}. "
            "Run `python -m training.finetune` first."
        )

    if task not in _SYSTEM_PROMPTS:
        raise ValueError(f"Unknown task '{task}'. Must be one of: {list(_SYSTEM_PROMPTS)}")
    system_prompt = _SYSTEM_PROMPTS[task]

    base_model = f"qwen3.5:{model}"
    ollama_model_name = f"{school}-{task}"

    # Write Modelfile
    modelfile_content = generate_modelfile(
        base_model=base_model,
        adapter_path=str(adapter_path.resolve()),
        system_prompt=system_prompt,
    )

    export_dir = data_dir / "export" / task
    export_dir.mkdir(parents=True, exist_ok=True)
    modelfile_path = export_dir / "Modelfile"

    with modelfile_path.open("w", encoding="utf-8") as fh:
        fh.write(modelfile_content)

    print(f"[export] Modelfile written to {modelfile_path}")
    print(f"[export] Base model: {base_model}")
    print(f"[export] Adapter: {adapter_path.resolve()}")
    print(f"[export] Registering as Ollama model: {ollama_model_name}")

    cmd = ["ollama", "create", ollama_model_name, "--file", str(modelfile_path)]
    print(f"[export] Running: {' '.join(cmd)}", flush=True)

    result = subprocess.run(cmd, check=False)

    if result.returncode == 0:
        print(f"[export] Model '{ollama_model_name}' registered successfully.")
        print(f"[export] Test with: ollama run {ollama_model_name}")
    else:
        print(
            f"[export] ollama create failed with return code {result.returncode}. "
            "Ensure Ollama is running and the adapter path is correct.",
            file=sys.stderr,
        )

    return result.returncode


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export a fine-tuned adapter as an Ollama model."
    )
    parser.add_argument(
        "--school", required=True,
        help="School directory name (e.g. bishop-state)",
    )
    parser.add_argument(
        "--task", choices=["explainer", "summarizer"], default=None,
        help="Task to export (default: both)",
    )
    parser.add_argument(
        "--model", choices=["4b", "9b", "27b"], default="9b",
        help="Model size used during fine-tuning (default: 9b)",
    )
    args = parser.parse_args()

    tasks = [args.task] if args.task else ["explainer", "summarizer"]
    exit_codes: list[int] = []

    for task in tasks:
        print(f"\n{'='*60}\nEXPORT: {task.upper()} | model={args.model}\n{'='*60}")
        try:
            code = export_model(args.school, task, args.model)
            exit_codes.append(code)
        except (FileNotFoundError, ValueError) as exc:
            print(f"[error] {exc}", file=sys.stderr)
            exit_codes.append(1)

    sys.exit(max(exit_codes) if exit_codes else 0)


if __name__ == "__main__":
    main()
