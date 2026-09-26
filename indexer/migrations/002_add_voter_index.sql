-- Migration 002: add voter address index and improve event table
--
-- Adds a dedicated column and index for the voter address extracted from
-- "vote" event payloads. This enables efficient look-ups of all votes cast
-- by a specific address (required by GET /voters/:address/votes).
--
-- The voter_address column is nullable because non-vote events (created,
-- final, executed, cancelled) do not have a voter address.

ALTER TABLE contract_events
    ADD COLUMN IF NOT EXISTS voter_address TEXT;

CREATE INDEX IF NOT EXISTS idx_events_voter
    ON contract_events (voter_address)
    WHERE voter_address IS NOT NULL;

-- Composite index to speed up the common query pattern:
-- "all votes on a given proposal ordered by ledger"
CREATE INDEX IF NOT EXISTS idx_events_proposal_ledger
    ON contract_events (proposal_id, ledger_seq)
    WHERE proposal_id IS NOT NULL;
