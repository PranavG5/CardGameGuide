import { Component, type ReactNode } from 'react';

/** Shows a recovery screen instead of a blank page if something crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // A failed page download usually means the site was updated while open.
    const stale = /dynamically imported module|Importing a module script failed|error loading/i.test(this.state.error.message);
    return (
      <div className="center stack" style={{ padding: '60px 16px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem' }}>🃏</div>
        <h2>{stale ? 'The site was just updated' : 'Something went wrong'}</h2>
        <p className="muted">{stale ? 'Reload to get the latest version.' : 'Reload the page to keep going. Your progress is saved.'}</p>
        <button className="btn primary block" onClick={() => window.location.reload()}>
          Reload
        </button>
        <a href="/" className="small">
          Back to home
        </a>
      </div>
    );
  }
}
