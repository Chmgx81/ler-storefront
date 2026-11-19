import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main id="top" className="notfound">
      <div className="container">
        <p className="notfound-kicker">404</p>
        <h1>Nothing on this shelf.</h1>
        <p>The page you were looking for has been packed away, or never existed.</p>
        <div className="notfound-actions">
          <Link to="/" className="btn">
            Back home
          </Link>
          <Link to="/shop" className="link-arrow">
            Shop the collection
          </Link>
        </div>
      </div>
    </main>
  );
}
