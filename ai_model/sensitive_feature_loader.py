"""
Issue #109: load institution ML feature exclusions from Postgres and strip them
from sklearn feature lists before training / inference in complete_ml_pipeline.py.
"""

from __future__ import annotations

import os
from typing import FrozenSet, List, Sequence

DEFAULT_INSTITUTION = "bscc"


def log_institution_ml_privacy_exclusions(excluded: FrozenSet[str]) -> None:
    if excluded:
        print(f"\n(#109) Institution ML privacy: excluding features {sorted(excluded)}")


def load_excluded_ml_keys() -> FrozenSet[str]:
    """
    Reads excluded_ml_feature_keys for the default institution.
    Returns empty set if DB is unreachable or the table/row is missing.
    """
    try:
        import psycopg2  # noqa: PLC0415
    except ImportError:
        return frozenset()

    host = os.environ.get("DB_HOST", "127.0.0.1")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    dbname = os.environ.get("DB_NAME", "postgres")
    port = int(os.environ.get("DB_PORT", "54332"))

    try:
        conn = psycopg2.connect(
            host=host, user=user, password=password, dbname=dbname, port=port
        )
    except Exception as exc:  # noqa: BLE001
        print(f"(#109) Could not connect for sensitive ML settings: {exc}")
        return frozenset()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT excluded_ml_feature_keys
                FROM institution_sensitive_ml_settings
                WHERE institution_code = %s
                LIMIT 1
                """,
                (DEFAULT_INSTITUTION,),
            )
            row = cur.fetchone()
            if not row or row[0] is None:
                return frozenset()
            keys = row[0]
            if not isinstance(keys, list):
                return frozenset()
            return frozenset(str(k) for k in keys if isinstance(k, str))
    except Exception as exc:  # noqa: BLE001
        print(f"(#109) Could not read institution_sensitive_ml_settings: {exc}")
        return frozenset()
    finally:
        conn.close()


def strip_excluded_features(
    features: Sequence[str], excluded: FrozenSet[str]
) -> List[str]:
    if not excluded:
        return list(features)
    return [f for f in features if f not in excluded]
