import { Link } from 'react-router-dom';
import { Page } from '../components/Layout';

export default function NotFound() {
  return (
    <Page title="Not found" back="/">
      <div className="panel center stack">
        <div style={{ fontSize: '3rem' }}>🃏</div>
        <h2>That page folded.</h2>
        <Link to="/" className="btn primary">
          Back to home
        </Link>
      </div>
    </Page>
  );
}
