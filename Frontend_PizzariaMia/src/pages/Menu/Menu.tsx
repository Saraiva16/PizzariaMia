import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PizzaCard from '../../shared/PizzaCard/PizzaCard';
import { useCart } from '../../contexts/CartContext';
import './Menu.css';
import './FloatingCart.css';

const MOCKED_PIZZAS = [
  {
    id: 1,
    name: 'Calabresa Especial',
    slices: 8,
    description: 'Molho pelati italiano, calabresa fatiada crocante, cebola roxa marinada e azeitonas pretas chilenas.',
    price: 54.90,
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    badge: 'Mais Pedida',
  },
  {
    id: 2,
    name: 'Quatro Queijos Premium',
    slices: 8,
    description: 'Base de muçarela artesanal, queijo gorgonzola curado, provolone defumado e catupiry legítimo.',
    price: 62.90,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    badge: 'Favorita do Chefe',
  },
  {
    id: 3,
    name: "Marguerita D'Itália",
    slices: 8,
    description: 'Muçarela de búfala fresca, fatias de tomate cereja confitados, azeite extravirgem e manjericão fresco.',
    price: 58.00,
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    badge: 'Vegetariana',
  },
  {
    id: 4,
    name: 'Frango Desfiado Catupiry',
    slices: 8,
    description: 'Peito de frango temperado e desfiado, coberto com autêntico requeijão Catupiry e milho verde fresco.',
    price: 56.90,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
  }
];

export default function MenuPage() {
  const [pizzas] = useState<any[]>(MOCKED_PIZZAS);
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <div className="menu-container">
      <div className="menu-header">
        <div className="menu-title">
          <h2>Escolha seu sabor</h2>
          <p>Pizzas artesanais feitas no forno a lenha</p>
        </div>

        <div className="menu-filters">
          <button className="filter-badge active">Todas</button>
          <button className="filter-badge">Tradicionais</button>
          <button className="filter-badge">Especiais</button>
          <button className="filter-badge">Doces</button>
        </div>
      </div>

      <div className="pizza-grid">
        {pizzas.map((pizza) => (
          <PizzaCard 
            key={pizza.id} 
            pizza={pizza} 
          />
        ))}
      </div>

      {totalItems > 0 && (
        <button 
          className="floating-cart-btn" 
          onClick={() => navigate('/checkout')}
        >
          <div className="cart-icon-container">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span className="cart-badge">{totalItems}</span>
          </div>
          <span className="cart-text">pronto para ir ao forno?</span>
        </button>
      )}
    </div>
  );
}
