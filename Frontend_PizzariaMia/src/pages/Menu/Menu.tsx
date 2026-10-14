import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PizzaCard from '../../shared/PizzaCard/PizzaCard';
import PizzaModal from './components/PizzaModal/PizzaModal';
import { useCart } from '../../contexts/CartContext';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
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
    category: 'Tradicionais'
  },
  {
    id: 4,
    name: 'Frango Desfiado Catupiry',
    slices: 8,
    description: 'Peito de frango temperado e desfiado, coberto com autêntico requeijão Catupiry e milho verde fresco.',
    price: 56.90,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
    category: 'Tradicionais'
  },
  {
    id: 2,
    name: 'Quatro Queijos Premium',
    slices: 8,
    description: 'Base de muçarela artesanal, queijo gorgonzola curado, provolone defumado e catupiry legítimo.',
    price: 62.90,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    badge: 'Favorita do Chefe',
    category: 'Especiais'
  },
  {
    id: 3,
    name: "Marguerita D'Itália",
    slices: 8,
    description: 'Muçarela de búfala fresca, fatias de tomate cereja confitados, azeite extravirgem e manjericão fresco.',
    price: 58.00,
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    badge: 'Vegetariana',
    category: 'Especiais'
  }
];

export default function MenuPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [selectedPizza, setSelectedPizza] = useState<any | null>(null);
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const filters = ['Todas', 'Tradicionais', 'Especiais', 'Doces'];

  // Group pizzas by category
  const groupedPizzas = MOCKED_PIZZAS.reduce((acc, pizza) => {
    if (!acc[pizza.category]) {
      acc[pizza.category] = [];
    }
    acc[pizza.category].push(pizza);
    return acc;
  }, {} as Record<string, typeof MOCKED_PIZZAS>);

  const categoriesToRender = activeFilter === 'Todas' 
    ? Object.keys(groupedPizzas) 
    : [activeFilter];

  return (
    <div className="menu-page">
      <header className="menu-header-sticky">
        <div className="header-top-row">
          <div className="brand-info">
            <h1>Pizzaria <span>Mia</span></h1>
            <p>Pizzas artesanais feitas no forno a lenha</p>
          </div>
          
          <div className="header-actions">
            <ThemeToggle />
            <button className="icon-btn" title="Meu Perfil" onClick={() => navigate('/perfil')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            <button className="icon-btn" title="Meus Pedidos" onClick={() => navigate('/pedidos')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
            <button className="icon-btn cart-btn-header" title="Carrinho" onClick={() => navigate('/checkout')}>
              <div className="cart-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {totalItems > 0 && <span className="cart-badge-header">{totalItems}</span>}
              </div>
            </button>
          </div>
        </div>

        <div className="header-bottom-row">
          <h2 className="section-main-title">CARDÁPIO</h2>
          <div className="menu-filters">
            {filters.map(f => (
              <button 
                key={f}
                className={`filter-badge ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="menu-content">
        {categoriesToRender.map(category => {
          const pizzas = groupedPizzas[category] || [];
          if (pizzas.length === 0) return null;

          return (
            <section key={category} className="menu-category-section">
              <div className="category-header">
                <h3>{category.toUpperCase()}</h3>
                <div className="category-line"></div>
              </div>
              
              <div className="pizza-grid">
                {pizzas.map((pizza) => (
                  <PizzaCard 
                    key={pizza.id} 
                    pizza={pizza} 
                    onSelect={setSelectedPizza}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

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

      {selectedPizza && (
        <PizzaModal 
          pizza={selectedPizza} 
          onClose={() => setSelectedPizza(null)} 
        />
      )}
    </div>
  );
}
