import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PizzaCard from '../../shared/PizzaCard/PizzaCard';
import PizzaModal, { type PizzaItem } from './components/PizzaModal/PizzaModal';
import { useCart } from '../../contexts/CartContext';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import api from '../../services/api';
import './Menu.css';
import './FloatingCart.css';

export interface MenuItem extends PizzaItem {
  standarSize?: string;
  active?: boolean;
}

export function inferCategory(item: { name: string; badge?: string | null; standarSize?: string; price: number; category?: string }): string {
  if (item.category && item.category !== 'Todas') return item.category;
  const nameLower = item.name.toLowerCase();
  const badgeLower = (item.badge || '').toLowerCase();
  const sizeLower = (item.standarSize || '').toLowerCase();

  if (sizeLower.includes('combo') || nameLower.startsWith('pacote') || nameLower.startsWith('combo')) {
    return 'Combos';
  }
  if (sizeLower.includes('unidade') || nameLower.startsWith('esfiha')) {
    return 'Esfihas';
  }
  if (sizeLower.includes('lata') || sizeLower.includes('litro') || sizeLower.includes('garrafa') || badgeLower.includes('bebida') || nameLower.includes('refrigerante') || nameLower.includes('cerveja') || nameLower.includes('água') || nameLower.includes('h2o') || nameLower.includes('coca') || nameLower.includes('fanta') || nameLower.includes('pepsi') || nameLower.includes('guaraná')) {
    return 'Bebidas';
  }
  if (badgeLower.includes('doce') || nameLower.includes('doce') || nameLower.includes('chocolate') || nameLower.includes('brigadeiro') || nameLower.includes('beijinho') || nameLower.includes('prestígio') || nameLower.includes('sensação')) {
    return 'Doces';
  }
  if (item.price >= 60 || badgeLower.includes('especial') || badgeLower.includes('premium')) {
    return 'Especiais';
  }
  return 'Tradicionais';
}

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
  },
  {
    id: 201,
    name: 'Esfiha de Carne Clássica',
    slices: 1,
    description: 'Massa artesanal fininha e recheio suculento de carne moída de primeira temperada com tomates, cebola e especiarias árabes.',
    price: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80',
    badge: 'Artesanal',
    category: 'Esfihas'
  },
  {
    id: 202,
    name: 'Esfiha de Queijo & Ervas',
    slices: 1,
    description: 'Generosa camada de queijo minas padrão derretido com toque aromático de orégano fresco e azeite.',
    price: 7.00,
    imageUrl: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    badge: 'Forno a Lenha',
    category: 'Esfihas'
  },
  {
    id: 203,
    name: 'Esfiha de Frango com Catupiry',
    slices: 1,
    description: 'Peito de frango refogado e desfiado com requeijão Catupiry legítimo gratinado.',
    price: 7.50,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    badge: 'Recheada',
    category: 'Esfihas'
  },
  {
    id: 204,
    name: 'Esfiha Doce de Nutella com Morango',
    slices: 1,
    description: 'Creme de avelã Nutella genuíno coberto com morangos frescos fatiados.',
    price: 9.50,
    imageUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80',
    badge: 'Sobremesa',
    category: 'Esfihas'
  }
];

export default function MenuPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [selectedPizza, setSelectedPizza] = useState<PizzaItem | null>(null);
  const [items, setItems] = useState<MenuItem[]>(MOCKED_PIZZAS);
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const filters = ['Todas', 'Tradicionais', 'Especiais', 'Doces', 'Esfihas', 'Combos', 'Bebidas'];

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.get('/pizzas/active');
        if (response.data && response.data.length > 0) {
          const mapped: MenuItem[] = response.data
            .filter((p: { name: string }) => p.name !== 'Pedido via WhatsApp')
            .map((p: { id: number; name: string; description: string; price: number; imageUrl?: string; badge?: string; standarSize?: string; active?: boolean }) => ({
              id: p.id,
              name: p.name,
              slices: p.standarSize === 'Unidade' || p.standarSize === 'Combo' ? 1 : 8,
              description: p.description,
              price: Number(p.price),
              imageUrl: p.imageUrl || undefined,
              badge: p.badge || undefined,
              standarSize: p.standarSize,
              category: inferCategory(p)
            }));
          setItems(mapped);
        }
      } catch {
        // mantém MOCKED_PIZZAS como fallback
      }
    };

    fetchMenu();
  }, []);

  // Group pizzas by category
  const groupedPizzas = useMemo(() => {
    return items.reduce((acc, item) => {
      const cat = item.category || 'Tradicionais';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [items]);

  const categoriesToRender = useMemo(() => {
    if (activeFilter === 'Todas') {
      const preferredOrder = ['Tradicionais', 'Especiais', 'Doces', 'Esfihas', 'Combos', 'Bebidas'];
      return preferredOrder.filter(cat => groupedPizzas[cat] && groupedPizzas[cat].length > 0);
    }
    return [activeFilter];
  }, [activeFilter, groupedPizzas]);

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
          allPizzas={items}
          onClose={() => setSelectedPizza(null)} 
        />
      )}
    </div>
  );
}
