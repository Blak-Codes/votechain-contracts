import React from "react";
import { sampleProposals } from "../data";
import ProposalListComponent from "../components/ProposalList";

/**
 * Route: /proposals
 *
 * Lists all governance proposals. Uses the shared ProposalList component
 * which renders proposal cards that link to /proposals/:id.
 *
 * Data will be replaced with a live fetch in issue #9.
 */
export default function ProposalList() {
  return (
    <main>
      <ProposalListComponent proposals={sampleProposals} />
    </main>
  );
}
