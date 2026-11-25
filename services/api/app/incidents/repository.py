"""
HealthCore — Incidents Repository
===================================
Data access layer for incident analysis results.

Currently uses in-memory storage. Designed to be easily swapped out
for TinyDB or another database backend later.
"""

from typing import Optional

from healthcore.analyzer import AnalysisResult


class IncidentRepository:
    """
    Repository for storing and retrieving analysis results.

    Thread-safe for single-worker deployments. For multi-worker,
    swap the internal storage for a database backend.
    """

    def __init__(self) -> None:
        self._last_result: Optional[AnalysisResult] = None

    def save(self, result: AnalysisResult) -> None:
        """
        Persist an analysis result.

        Currently stores only the most recent result (overwrites previous).
        In a future version this could append to a history table.
        """
        self._last_result = result

    def get_last(self) -> Optional[AnalysisResult]:
        """Retrieve the most recent analysis result."""
        return self._last_result

    def clear(self) -> None:
        """Clear the stored result."""
        self._last_result = None