-- Add optional detailedSummary column to Incentive
-- Long-form program description shown on the per-program detail page.
-- Existing rows are NULL; falls back to shortSummary in the UI.

ALTER TABLE "Incentive"
  ADD COLUMN "detailedSummary" TEXT;
