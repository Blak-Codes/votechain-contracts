import { useState } from "react";
import { TransactionToast } from "../components/TransactionToast";
import { VoteConfirmationDialog, VoteChoice } from "../components/VoteConfirmationDialog";
import { useTransactionStatus } from "../hooks/useTransactionStatus";

type Props = {
  proposalTitle?: string;
  estimatedFee?: string;
  onSubmitVote?: (choice: VoteChoice) => Promise<string>;
};

export default function VotingPanel({
  proposalTitle = "Current proposal",
  estimatedFee = "0.00001 XLM",
  onSubmitVote,
}: Props) {
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null);
  const { tx, submit, retry, reset } = useTransactionStatus();

  async function confirmVote() {
    if (!pendingChoice || !onSubmitVote) return;
    const hash = await onSubmitVote(pendingChoice);
    setPendingChoice(null);
    submit(hash);
  }

  return (
    <section aria-labelledby="voting-panel-title">
      <h2 id="voting-panel-title">Cast your vote</h2>
      <div className="vote-actions" role="group" aria-label="Choose a vote">
        {(["Yes", "No", "Abstain"] as VoteChoice[]).map((choice) => (
          <button key={choice} type="button" onClick={() => setPendingChoice(choice)}>
            {choice}
          </button>
        ))}
      </div>
      <TransactionToast tx={tx} onRetry={() => tx.hash && retry(tx.hash)} onDismiss={reset} />
      {pendingChoice && (
        <VoteConfirmationDialog
          proposalTitle={proposalTitle}
          choice={pendingChoice}
          estimatedFee={estimatedFee}
          onConfirm={confirmVote}
          onCancel={() => setPendingChoice(null)}
        />
      )}
    </section>
  );
}
