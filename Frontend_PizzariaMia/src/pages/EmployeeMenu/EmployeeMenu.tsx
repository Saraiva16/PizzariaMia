import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NewOrderModal, { type ClientData } from './NewOrderModal';
import api from '../../services/api';
import { toast } from 'sonner';
import './EmployeeMenu.css';

// Interfaces
interface Ingredient {
  id: number;
  name: string;
  additionalPrice: number;
}

interface Pizza {
  id: number;
  name: string;
  price: number;
  category?: string;
  ingredients: Ingredient[];
}

interface OrderItem {
  pizzaId: number;
  quantity: number;
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CATEGORIES = ['Todas', 'Tradicionais', 'Especiais', 'Doces'];

const DEFAULT_PIZZAS: Pizza[] = [
  {
    id: 1,
    name: 'Calabresa Especial',
    price: 54.90,
    category: 'Tradicionais',
    ingredients: [
      { id: 3, name: 'Cebola', additionalPrice: 0 },
      { id: 4, name: 'Milho', additionalPrice: 0 }
    ]
  },
  {
    id: 4,
    name: 'Frango Desfiado Catupiry',
    price: 56.90,
    category: 'Tradicionais',
    ingredients: [
      { id: 1, name: 'Bacon Extra', additionalPrice: 5.00 },
      { id: 2, name: 'Catupiry Extra', additionalPrice: 4.00 }
    ]
  },
  {
    id: 5,
    name: 'Portuguesa Clássica',
    price: 58.00,
    category: 'Tradicionais',
    ingredients: [
      { id: 3, name: 'Cebola', additionalPrice: 0 },
      { id: 4, name: 'Milho', additionalPrice: 0 }
    ]
  },
  {
    id: 2,
    name: 'Quatro Queijos Premium',
    price: 62.90,
    category: 'Especiais',
    ingredients: [
      { id: 2, name: 'Catupiry Extra', additionalPrice: 4.00 }
    ]
  },
  {
    id: 3,
    name: "Marguerita D'Itália",
    price: 58.00,
    category: 'Especiais',
    ingredients: [
      { id: 3, name: 'Cebola', additionalPrice: 0 }
    ]
  },
  {
    id: 6,
    name: 'Alho Negro & Gorgonzola',
    price: 66.00,
    category: 'Especiais',
    ingredients: [
      { id: 1, name: 'Bacon Extra', additionalPrice: 5.00 }
    ]
  },
  {
    id: 7,
    name: 'Brigadeiro Gourmet',
    price: 49.90,
    category: 'Doces',
    ingredients: []
  },
  {
    id: 8,
    name: 'Banana com Canela',
    price: 46.90,
    category: 'Doces',
    ingredients: []
  },
  {
    id: 9,
    name: 'Romeu e Julieta',
    price: 52.00,
    category: 'Doces',
    ingredients: []
  }
];

export default function EmployeeMenu() {
  const navigate = useNavigate();
  const [pizzas, setPizzas] = useState<Pizza[]>(DEFAULT_PIZZAS);
  const [orderItems, setOrderItems] = useState<Record<number, OrderItem>>({});
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(() => {
    const saved = localStorage.getItem('employeeSelectedClient');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Lista global de ingredientes (simulação)
  const allIngredients: Ingredient[] = [
    { id: 1, name: 'Bacon Extra', additionalPrice: 5.00 },
    { id: 2, name: 'Catupiry Extra', additionalPrice: 4.00 },
    { id: 3, name: 'Cebola', additionalPrice: 0 },
    { id: 4, name: 'Milho', additionalPrice: 0 },
  ];

  useEffect(() => {
    const fetchPizzas = async () => {
      try {
        const response = await api.get('/pizzas/active');
        if (response.data && response.data.length > 0) {
          setPizzas(response.data);
          return;
        }
      } catch {
        // fallback para DEFAULT_PIZZAS
      }
      setPizzas(DEFAULT_PIZZAS);
    };

    fetchPizzas();
  }, []);

  // Conjunto de letras iniciais que possuem pizzas cadastradas
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    pizzas.forEach((pizza) => {
      const firstLetter = pizza.name.trim().charAt(0).toUpperCase();
      if (firstLetter >= 'A' && firstLetter <= 'Z') {
        letters.add(firstLetter);
      }
    });
    return letters;
  }, [pizzas]);

  // Filtragem combinada por letra inicial e por categoria
  const filteredPizzas = useMemo(() => {
    return pizzas.filter((pizza) => {
      const matchesCategory =
        activeCategory === 'Todas' ||
        (pizza.category && pizza.category.toLowerCase() === activeCategory.toLowerCase());

      const matchesLetter =
        !selectedLetter ||
        selectedLetter === 'Todas' ||
        pizza.name.trim().toUpperCase().startsWith(selectedLetter);

      return matchesCategory && matchesLetter;
    });
  }, [pizzas, activeCategory, selectedLetter]);

  const handleQuantityChange = (pizzaId: number, delta: number) => {
    setOrderItems(prev => {
      const current = prev[pizzaId] || { pizzaId, quantity: 0, addedIngredients: [], removedIngredients: [] };
      const newQuantity = Math.max(0, current.quantity + delta);
      
      if (newQuantity === 0) {
        const { [pizzaId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [pizzaId]: { ...current, quantity: newQuantity } };
    });
  };

  const toggleIngredient = (pizzaId: number, ingredient: Ingredient, type: 'add' | 'remove') => {
    setOrderItems(prev => {
      const current = prev[pizzaId];
      if (!current) return prev;

      const listKey = type === 'add' ? 'addedIngredients' : 'removedIngredients';
      const list = current[listKey];
      const exists = list.find(i => i.id === ingredient.id);

      const newList = exists 
        ? list.filter(i => i.id !== ingredient.id)
        : [...list, ingredient];

      return { ...prev, [pizzaId]: { ...current, [listKey]: newList } };
    });
  };

  const handleCheckout = () => {
    const items = Object.values(orderItems);
    if (items.length === 0) {
      alert('Selecione pelo menos uma pizza.');
      return;
    }
    // Salva no localStorage ou contexto para a tela de checkout
    localStorage.setItem('employeeOrderItems', JSON.stringify(items));
    navigate('/funcionario/checkout');
  };

  const storedUser = localStorage.getItem('@PizzariaMia:user');
  let userName = 'Funcionário';
  let userRole = 'Employee';
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      userName = parsed.name || userName;
      userRole = parsed.role || userRole;
    } catch {
      // fallback
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('@PizzariaMia:token');
    localStorage.removeItem('@PizzariaMia:user');
    localStorage.removeItem('employeeSelectedClient');
    navigate('/');
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    localStorage.setItem('employeeSelectedClient', JSON.stringify(client));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    localStorage.removeItem('employeeSelectedClient');
    toast.info('Cliente desvinculado do pedido.');
  };

  return (
    <div className="employee-menu-container">
      <div className="employee-menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Cardápio - Atendimento</h1>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>{userName} ({userRole})</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            style={{
              background: '#e53935',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(229, 57, 53, 0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            + Novo pedido
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #dc3545',
              color: '#dc3545',
              padding: '7px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {selectedClient && (
        <div
          style={{
            background: '#e8f5e9',
            border: '1px solid #c8e6c9',
            borderRadius: '8px',
            padding: '10px 16px',
            margin: '1rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ color: '#2e7d32' }}>Cliente em atendimento:</strong>{' '}
            <span style={{ fontWeight: 600, color: '#1b5e20' }}>{selectedClient.name}</span>{' '}
            <span style={{ color: '#555', fontSize: '0.9rem' }}>({selectedClient.phone || selectedClient.email})</span>
          </div>
          <button
            type="button"
            onClick={handleClearClient}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d32f2f',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            Alterar / Desvincular
          </button>
        </div>
      )}

      {/* Seção de Filtros: A-Z e Categorias */}
      <div className="employee-filters-section">
        {/* Filtro Alfabético A-Z */}
        <div className="alphabet-filter-wrapper">
          <span className="filter-section-label">Filtro Alfabético (A-Z)</span>
          <div className="alphabet-filter-bar">
            <button
              type="button"
              className={`alphabet-all-btn ${!selectedLetter ? 'active' : ''}`}
              onClick={() => setSelectedLetter(null)}
            >
              TODAS
            </button>
            {ALPHABET.map((letter) => {
              const isAvailable = availableLetters.has(letter);
              const isSelected = selectedLetter === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!isAvailable}
                  className={`alphabet-letter-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedLetter(isSelected ? null : letter)}
                  title={isAvailable ? `Filtrar pizzas com a letra ${letter}` : `Nenhuma pizza cadastrada com a letra ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro de Categorias */}
        <div className="category-filters-wrapper">
          <span className="filter-section-label">Categorias</span>
          <div className="category-filters-bar">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-filter-badge ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredPizzas.length === 0 ? (
        <div className="empty-filter-results">
          <p>Nenhuma pizza encontrada para os filtros selecionados.</p>
          <button
            type="button"
            className="clear-filters-btn"
            onClick={() => {
              setSelectedLetter(null);
              setActiveCategory('Todas');
            }}
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="pizza-list">
          {filteredPizzas.map((pizza) => {
            const orderItem = orderItems[pizza.id];
            const isSelected = !!orderItem && orderItem.quantity > 0;

            return (
              <div key={pizza.id} className="pizza-item">
                <div className="pizza-header">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => handleQuantityChange(pizza.id, e.target.checked ? 1 : -(orderItem?.quantity || 1))}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <div className="pizza-info">
                    <div className="pizza-name">
                      {pizza.name}
                      {pizza.category && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          fontWeight: 500
                        }}>
                          {pizza.category}
                        </span>
                      )}
                    </div>
                    <div className="pizza-price">R$ {pizza.price.toFixed(2)}</div>
                  </div>
                  
                  {isSelected && (
                    <div className="quantity-controls">
                      <button className="quantity-btn" onClick={() => handleQuantityChange(pizza.id, -1)}>-</button>
                      <span>{orderItem.quantity}</span>
                      <button className="quantity-btn" onClick={() => handleQuantityChange(pizza.id, 1)}>+</button>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="customization-panel">
                    <div className="ingredient-groups">
                      <div className="ingredient-group">
                        <h4>Adicionar Extras</h4>
                        {allIngredients.map((ing) => (
                          <label key={ing.id} className="ingredient-checkbox">
                            <input 
                              type="checkbox"
                              checked={orderItem.addedIngredients.some(i => i.id === ing.id)}
                              onChange={() => toggleIngredient(pizza.id, ing, 'add')}
                            />
                            {ing.name} {ing.additionalPrice > 0 && `(+ R$ ${ing.additionalPrice.toFixed(2)})`}
                          </label>
                        ))}
                      </div>
                      
                      <div className="ingredient-group">
                        <h4>Remover Padrão</h4>
                        {pizza.ingredients.map((ing) => (
                          <label key={ing.id} className="ingredient-checkbox">
                            <input 
                              type="checkbox"
                              checked={orderItem.removedIngredients.some(i => i.id === ing.id)}
                              onChange={() => toggleIngredient(pizza.id, ing, 'remove')}
                            />
                            Sem {ing.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button className="checkout-btn" onClick={handleCheckout}>
        Ir para Checkout ({Object.keys(orderItems).length} itens)
      </button>

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
}
