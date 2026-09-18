import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <header className="main-header">
        <div className="header-content">
          <Link to="/" className="logo-section">
            <span className="logo-icon">🍕</span>
            <div className="logo-text">
              <h1>Pizzaria Mia</h1>
              <p>Cardápio Online & Delivery</p>
            </div>
          </Link>

          <div className="header-actions">
            <Link to="/cadastrar" className="nav-btn">Nova Pizza</Link>
            <button className="cart-btn">
              <span>Sacola</span>
              <span className="cart-badge">2</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
