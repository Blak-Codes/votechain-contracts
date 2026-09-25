import React, { Component, ErrorInfo, ReactNode, createRef } from "react";

interface Props {
  children: ReactNode;
  /** Optional section name for monitoring context */
  section?: string;
}

interface State {
  error: Error | null;
}

const GITHUB_ISSUES_URL =
  "https://github.com/veracindarella/votechain-contracts/issues/new?template=bug_report.yml";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  /** Ref to the fallback region so focus can be moved there on error */
  private fallbackRef = createRef<HTMLDivElement>();

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to monitoring service (replace with real integration, e.g. Sentry)
    console.error(
      `[ErrorBoundary]${this.props.section ? ` [${this.props.section}]` : ""}`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    // Move focus to the fallback region when an error is first caught
    if (!prevState.error && this.state.error && this.fallbackRef.current) {
      this.fallbackRef.current.focus();
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { section } = this.props;

    if (error) {
      const message = section
        ? `The "${section}" section failed to load.`
        : "An unexpected error occurred.";

      return (
        <div
          ref={this.fallbackRef}
          role="alert"
          tabIndex={-1}
          style={{
            padding: "1.5rem",
            textAlign: "center",
            border: "1px solid #c62828",
            borderRadius: "8px",
            background: "#1e1e1e",
            color: "#fff",
            margin: "1rem",
            outline: "none",
          }}
          aria-label="Error: something went wrong"
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p>{message}</p>
          {error.message && (
            <p
              style={{
                fontSize: "0.85rem",
                opacity: 0.7,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {error.message}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
            <button
              onClick={this.handleRetry}
              style={{ padding: "0.4rem 1rem", cursor: "pointer" }}
              aria-label="Reload this section"
            >
              Reload
            </button>
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "0.4rem 1rem",
                color: "#90caf9",
                textDecoration: "underline",
                fontSize: "0.9rem",
                alignSelf: "center",
              }}
              aria-label="Report this issue on GitHub (opens in new tab)"
            >
              Report issue ↗
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
