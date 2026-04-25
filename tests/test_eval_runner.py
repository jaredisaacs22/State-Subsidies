"""
SS-012 §7.3 — Eval runner correctness sanity check.

A synthetic "always-wrong" model must score near 0; a synthetic
"always-right" must score near 1. If these don't hold, the harness
itself is broken and any downstream verdicts are untrustworthy.
"""

from __future__ import annotations

from evals.runner import (
    score_accuracy_recall_at_k,
    score_safety,
    score_citation_integrity,
    Persona,
    load_personas,
)


# ── score_accuracy_recall_at_k ────────────────────────────────────────────────

def test_accuracy_perfect_recall_is_one():
    expected = ["a", "b", "c"]
    cited = ["a", "b", "c", "x", "y"]
    assert score_accuracy_recall_at_k(cited, expected, k=5) == 1.0


def test_accuracy_zero_overlap_is_zero():
    expected = ["a", "b", "c"]
    cited = ["x", "y", "z"]
    assert score_accuracy_recall_at_k(cited, expected, k=5) == 0.0


def test_accuracy_partial_recall():
    expected = ["a", "b", "c", "d"]
    cited = ["a", "b", "x", "y"]
    assert score_accuracy_recall_at_k(cited, expected, k=5) == 0.5


def test_accuracy_topk_is_respected():
    """If the right answer is at position 6 and k=5, recall is 0."""
    expected = ["a"]
    cited = ["x", "y", "z", "p", "q", "a"]
    assert score_accuracy_recall_at_k(cited, expected, k=5) == 0.0


# ── score_safety ────────────────────────────────────────────────

def test_safety_passes_when_clean():
    safe, violations = score_safety(
        text="I'd recommend looking into REAP.",
        forbidden_terms=["guaranteed", "approved"],
        refused_correctly=True,
    )
    assert safe is True
    assert violations == []


def test_safety_fails_on_forbidden_term():
    safe, violations = score_safety(
        text="You are guaranteed to receive funding.",
        forbidden_terms=["guaranteed"],
        refused_correctly=True,
    )
    assert safe is False
    assert any("guaranteed" in v for v in violations)


def test_safety_fails_on_missed_refusal():
    safe, violations = score_safety(
        text="Sure, here's how.",
        forbidden_terms=[],
        refused_correctly=False,
    )
    assert safe is False
    assert any("refuse" in v.lower() for v in violations)


# ── score_citation_integrity ────────────────────────────────────────────────

def test_citation_integrity_perfect():
    cited = ["a", "b", "c"]
    tool = ["a", "b", "c", "d"]
    assert score_citation_integrity(cited, tool) == 1.0


def test_citation_integrity_hallucinated():
    cited = ["a", "b", "hallucinated"]
    tool = ["a", "b"]
    assert score_citation_integrity(cited, tool) == 2 / 3


def test_citation_integrity_empty_cite_is_one():
    """Saying nothing about programs is not a hallucination."""
    assert score_citation_integrity([], ["a", "b"]) == 1.0


# ── persona loading ────────────────────────────────────────────────

def test_personas_load_and_validate():
    personas = load_personas()
    assert len(personas) >= 10
    for p in personas:
        assert isinstance(p, Persona)
        assert p.id.startswith("persona-")
        assert len(p.expected_top_programs) >= 1
        assert "guaranteed" in [t.lower() for t in p.forbidden_terms], (
            f"{p.id}: every persona must forbid 'guaranteed' (SS-008 safety floor)"
        )
