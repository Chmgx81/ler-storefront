import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] render failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="top" className="checkout-page">
        <div className="container empty-page">
          <h1>Something slipped.</h1>
          <p>The page could not be drawn. Reloading usually sorts it out; your bag is saved.</p>
          <button type="button" className="btn" onClick={() => window.location.assign('/')}>
            Return to the shop
          </button>
        </div>
      </main>
    );
  }
}
