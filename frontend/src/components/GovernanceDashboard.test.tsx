/**
 * Tests for GovernanceDashboard component (issue #11).
 * Covers: loading state, renders chart sections after data loads,
 * renders pie chart, line chart, quorum stat, top-voters table.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GovernanceDashboard } from '../pages/GovernanceDashboard';

// ── Tests ─────────────────────────────────────────────────────

describe('GovernanceDashboard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows a loading message on initial render', () => {
    render(<GovernanceDashboard />);
    expect(screen.getByText(/loading governance statistics/i)).toBeInTheDocument();
  });

  it('renders "Proposals by State" section after data loads', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/proposals by state/i)).toBeInTheDocument()
    );
  });

  it('renders "Participation Rate Over Time" section after data loads', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/participation rate over time/i)).toBeInTheDocument()
    );
  });

  it('renders "Avg Quorum Achievement" section with a percentage', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/avg quorum achievement/i)).toBeInTheDocument()
    );
    // Default mock data returns 73%
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('renders "Top 10 Voters" table with voter rows', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/top 10 voters/i)).toBeInTheDocument()
    );
    // Mock data has 10 voters; check at least the first
    expect(screen.getByText('GABC...1234')).toBeInTheDocument();
  });

  it('renders the pie chart SVG with an accessible label', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /proposals by state pie chart/i })
      ).toBeInTheDocument()
    );
  });

  it('renders the line chart SVG with an accessible label', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /voter participation rate over time/i })
      ).toBeInTheDocument()
    );
  });

  it('shows "Last updated" timestamp after data loads', async () => {
    render(<GovernanceDashboard />);
    await waitFor(() =>
      expect(screen.getByText(/last updated/i)).toBeInTheDocument()
    );
  });

  it('shows total proposal count', async () => {
    render(<GovernanceDashboard />);
    // Mock data: Active(3)+Passed(12)+Rejected(5)+Executed(10)+Cancelled(2) = 32
    await waitFor(() =>
      expect(screen.getByText(/total:\s*32/i)).toBeInTheDocument()
    );
  });
});
