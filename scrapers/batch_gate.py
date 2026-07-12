"""
Batch-level shape alarms and per-row tripwires (Theme B / GAP-D2, GAP-D4).

Doctrine §1.1/§1.4: treat every upstream source as an adversary. Per-row
quality gates (db_writer._passes_quality_gate) catch individually bad rows;
this module catches the failure shapes that row gates cannot see:

  * A source that "succeeds" with zero rows — the classic silent shape change
    (a parser that quietly keeps zero columns was a weeks-long scar elsewhere).
  * A batch where most rows fail the quality gate — the parse is broken, and
    even the rows that pass are suspect. Nothing should be written.
  * Field values that violate known relations (money out of range, non-https
    source, expired-but-ACTIVE status) — quarantined or normalized before any
    DB write, never silently stored.
"""

from __future__ import annotations

from datetime import datetime

from .models import IncentiveStatus, ScrapedIncentive

# A single program above this is presumed a parse error (units, concatenated
# digits, footnote markers). The largest real federal programs are well below.
MAX_PLAUSIBLE_FUNDING_USD = 50_000_000_000

# If more than this fraction of a batch fails the row quality gate, the parse
# itself is broken — abort all writes for the batch.
BATCH_REJECTION_ABORT_RATIO = 0.5


def row_tripwires(inc: ScrapedIncentive) -> list[str]:
    """
    Return quarantine reasons for a single row. Empty list = row may proceed
    to the ordinary quality gate. Any reason = the row is NOT written, and the
    reason is surfaced in the run report (a labeled gap, never a silent drop).
    """
    reasons: list[str] = []

    if inc.funding_amount is not None:
        # 0 or negative is a parse artifact masquerading as data — doctrine:
        # a missing value must stay missing (None), never become a fake zero.
        if inc.funding_amount <= 0:
            reasons.append("funding_amount_not_positive")
        elif inc.funding_amount > MAX_PLAUSIBLE_FUNDING_USD:
            reasons.append("funding_amount_above_plausible_cap")

    if inc.source_url and not inc.source_url.startswith("https://"):
        # Promotion checklist requires https on every row; http:// slipped
        # through the old startswith("http") gate.
        reasons.append("source_url_not_https")

    return reasons


def normalize_row(inc: ScrapedIncentive, now: datetime) -> list[str]:
    """
    Apply rules-based normalizations in place; return notes for the report.
    Only normalizations that mirror an existing standing rule belong here —
    never invented values.
    """
    notes: list[str] = []

    # Same rule refresh_expired_statuses applies daily: a past deadline cannot
    # be ACTIVE. Normalizing at ingest closes the up-to-24h window where an
    # expired program would render as ACTIVE.
    if (
        inc.status == IncentiveStatus.ACTIVE
        and inc.deadline is not None
        and inc.deadline < now
    ):
        inc.status = IncentiveStatus.CLOSED
        notes.append("status_normalized_active_to_closed_past_deadline")

    return notes


def apply_tripwires(
    incentives: list[ScrapedIncentive], now: datetime | None = None
) -> tuple[list[ScrapedIncentive], list[dict]]:
    """
    Partition a batch into (clean rows, quarantined rows). Clean rows may have
    been normalized (see normalize_row). Quarantined entries carry their
    reasons for the run report.
    """
    now = now or datetime.utcnow()
    clean: list[ScrapedIncentive] = []
    quarantined: list[dict] = []

    for inc in incentives:
        reasons = row_tripwires(inc)
        if reasons:
            quarantined.append(
                {"title": inc.title, "sourceUrl": inc.source_url, "reasons": reasons}
            )
            continue
        normalize_row(inc, now)
        clean.append(inc)

    return clean, quarantined


def batch_alarms(
    per_source_counts: dict[str, dict],
    total_rows: int,
    quality_gate_failures: int,
) -> tuple[bool, list[str]]:
    """
    Batch-level shape alarms (GAP-D2). Returns (abort_all_writes, alarms).

    - A source reporting "ok" with 0 rows is a shape-change signal: the fetch
      worked but the parser recognized nothing. The alarm is per-source and
      does not block other sources' writes, but it must fail the run loudly.
    - A batch whose quality-gate failure ratio exceeds
      BATCH_REJECTION_ABORT_RATIO aborts ALL writes: when most of a parse is
      garbage, the rows that happen to pass are not trustworthy either.
    """
    alarms: list[str] = []

    for name, entry in per_source_counts.items():
        if entry.get("status") == "ok" and entry.get("rows", 0) == 0:
            alarms.append(f"shape_alarm_zero_rows:{name}")

    abort = False
    if total_rows > 0 and (quality_gate_failures / total_rows) > BATCH_REJECTION_ABORT_RATIO:
        alarms.append(
            f"shape_alarm_batch_rejection_ratio:{quality_gate_failures}/{total_rows}"
        )
        abort = True

    return abort, alarms
