import React, { Component, ErrorInfo, ReactNode } from "react";
import i18n from "../i18n";

interface Props {
  children: ReactNode;
  /** Optional section name for monitoring context */
  section?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

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

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: "1.5rem", textAlign: "center" }}>
          <h2>{i18n.t("app.somethingWentWrong")}</h2>
          <p>
            {this.props.section
              ? i18n.t("app.sectionError", { section: this.props.section })
              : i18n.t("app.unexpectedError")}
          </p>
          <button onClick={this.handleRetry}>{i18n.t("app.tryAgain")}</button>
        </div>
      );
    }

    return this.props.children;
  }
}
