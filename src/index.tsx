import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MVIKGViewer from "./MVIKGViewer";
import MVIKGQueryBuilder from "./MVIKGQueryBuilder";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", background: "#fef2f2", color: "#991b1b" }}>
          <h2>Something went wrong</h2>
          <pre style={{ overflow: "auto", whiteSpace: "pre-wrap" }}>
            {this.state.error.toString()}
          </pre>
          <pre style={{ marginTop: 16, fontSize: 12, overflow: "auto" }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const path = window.location.pathname;

function Router() {
  if (path.startsWith("/mvikg")) return <MVIKGViewer />;
  if (path.startsWith("/query")) return <MVIKGQueryBuilder />;
  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </React.StrictMode>
);
