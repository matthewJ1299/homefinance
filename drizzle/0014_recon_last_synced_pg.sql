-- Additive migration only: adds a last_synced_at column for recon Graph sync state.
ALTER TABLE recon_graph_connections
  ADD COLUMN last_synced_at TIMESTAMPTZ;

