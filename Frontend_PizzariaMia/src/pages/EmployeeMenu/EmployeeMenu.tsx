import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NewOrderModal, { type ClientData } from './NewOrderModal';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { useWhatsAppNotification } from '../../contexts/WhatsAppNotificationContext';
import api from '../../services/api';
import { toast } from 'sonner';
import { Pizza, ClipboardList, MessageSquare, LogOut, Plus } from 'lucide-react';
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
  badge?: string;
  ingredients: Ingredient[];
}

interface OrderItem {
  id: string;
  pizzaId: number;
  pizzaName: string;
  price: number;
  quantity: number;
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CATEGORIES = ['Todas', 'Tradicionais', 'Especiais', 'Esfihas', 'Doces'];

const DEFAULT_REMOVABLE_INGREDIENTS: Ingredient[] = [
  { id: 101, name: 'Cebola', additionalPrice: 0 },
  { id: 102, name: 'Azeitona', additionalPrice: 0 },
  { id: 103, name: 'Orégano', additionalPrice: 0 },
  { id: 104, name: 'Tomate', additionalPrice: 0 },
];

const DEFAULT_PIZZAS: Pizza[] = [
  {
    id: 1,
    name: 'Calabresa Especial',
    price: 54.90,
    category: 'Tradicionais',
    badge: 'Mais Pedida',
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
    badge: 'Mais Pedida',
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
    badge: 'Mais Pedida',
    ingredients: [
      { id: 2, name: 'Catupiry Extra', additionalPrice: 4.00 }
    ]
  },
  {
    id: 3,
    name: "Marguerita D'Itália",
    price: 58.00,
    category: 'Especiais',
    badge: 'Mais Pedida',
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
    id: 10,
    name: 'Esfiha de Carne Artesanal',
    price: 8.90,
    category: 'Esfihas',
    badge: 'Mais Pedida',
    ingredients: [
      { id: 3, name: 'Cebola', additionalPrice: 0 }
    ]
  },
  {
    id: 11,
    name: 'Esfiha de Frango com Catupiry',
    price: 9.50,
    category: 'Esfihas',
    ingredients: [
      { id: 2, name: 'Catupiry Extra', additionalPrice: 2.00 }
    ]
  },
  {
    id: 12,
    name: 'Esfiha de Queijo & Orégano',
    price: 8.90,
    category: 'Esfihas',
    ingredients: []
  },
  {
    id: 13,
    name: 'Esfiha de Nutella com Morango',
    price: 11.90,
    category: 'Esfihas',
    badge: 'Sobremesa',
    ingredients: []
  },
  {
    id: 7,
    name: 'Brigadeiro Gourmet',
    price: 49.90,
    category: 'Doces',
    badge: 'Mais Pedida',
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
  const { unreadConversationsCount } = useWhatsAppNotification();
  const [pizzas, setPizzas] = useState<Pizza[]>(DEFAULT_PIZZAS);
  const [pizzaVariations, setPizzaVariations] = useState<Record<number, OrderItem[]>>(() => {
    const saved = localStorage.getItem('employeePizzaVariations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });
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

  // Mantém pizzaVariations persistido para retorno do checkout ou refresh
  useEffect(() => {
    localStorage.setItem('employeePizzaVariations', JSON.stringify(pizzaVariations));
  }, [pizzaVariations]);
  
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

  // Lista de pizzas mais pedidas para atalhos rápidos
  const popularPizzas = useMemo(() => {
    return pizzas.filter((p) => p.badge && p.badge.toLowerCase().includes('mais pedida'));
  }, [pizzas]);

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

  // Operações com variações de itens no pedido
  const addVariation = (pizza: Pizza) => {
    const newId = `var_${pizza.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVariation: OrderItem = {
      id: newId,
      pizzaId: pizza.id,
      pizzaName: pizza.name,
      price: pizza.price,
      quantity: 1,
      addedIngredients: [],
      removedIngredients: []
    };

    setPizzaVariations((prev) => ({
      ...prev,
      [pizza.id]: [...(prev[pizza.id] || []), newVariation]
    }));
  };

  const removeVariation = (pizzaId: number, variationId: string) => {
    setPizzaVariations((prev) => {
      const list = (prev[pizzaId] || []).filter((v) => v.id !== variationId);
      if (list.length === 0) {
        const { [pizzaId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pizzaId]: list };
    });
  };

  const removeAllVariations = (pizzaId: number) => {
    setPizzaVariations((prev) => {
      const { [pizzaId]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateVariationQuantity = (pizzaId: number, variationId: string, delta: number) => {
    setPizzaVariations((prev) => {
      const list = prev[pizzaId] || [];
      const updated = list
        .map((v) => (v.id === variationId ? { ...v, quantity: Math.max(0, v.quantity + delta) } : v))
        .filter((v) => v.quantity > 0);

      if (updated.length === 0) {
        const { [pizzaId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pizzaId]: updated };
    });
  };

  const toggleVariationIngredient = (
    pizzaId: number,
    variationId: string,
    ingredient: Ingredient,
    type: 'add' | 'remove'
  ) => {
    setPizzaVariations((prev) => {
      const list = prev[pizzaId] || [];
      const targetIndex = list.findIndex((v) => v.id === variationId);
      if (targetIndex === -1) return prev;

      const target = list[targetIndex];
      const listKey = type === 'add' ? 'addedIngredients' : 'removedIngredients';
      const currentList = target[listKey];
      const exists = currentList.some((i) => i.id === ingredient.id);

      const newList = exists
        ? currentList.filter((i) => i.id !== ingredient.id)
        : [...currentList, ingredient];

      const updated = [...list];
      updated[targetIndex] = {
        ...target,
        [listKey]: newList
      };

      return { ...prev, [pizzaId]: updated };
    });
  };

  const totalQuantity = useMemo(() => {
    return Object.values(pizzaVariations)
      .flat()
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [pizzaVariations]);

  const handleCheckout = () => {
    const allItems = Object.values(pizzaVariations).flat();
    if (allItems.length === 0) {
      toast.error('Selecione pelo menos uma pizza para o checkout.');
      return;
    }
    // Salva no localStorage para a tela de checkout
    localStorage.setItem('employeeOrderItems', JSON.stringify(allItems));
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
    localStorage.removeItem('employeeOrderItems');
    localStorage.removeItem('employeePizzaVariations');
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
      <div className="employee-menu-header">
        <div>
          <h1 style={{ margin: 0 }}>Cardápio - Atendimento</h1>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>{userName} ({userRole})</span>
        </div>

        <nav className="employee-nav-tabs">
          <button
            type="button"
            className="nav-tab-btn active"
            onClick={() => navigate('/funcionario/cardapio')}
          >
            <Pizza size={16} /> Novo Pedido (Cardápio)
          </button>
          <button
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate('/funcionario/pedidos')}
          >
            <ClipboardList size={16} /> Consultar Pedidos
          </button>
          <button
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate('/funcionario/chat')}
          >
            <MessageSquare size={16} /> WhatsApp Chat
            {unreadConversationsCount > 0 && (
              <span className="nav-tab-unread-badge" title={`${unreadConversationsCount} conversa(s) com mensagens não abertas`}>
                {unreadConversationsCount}
              </span>
            )}
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ThemeToggle />
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
            <Plus size={16} /> Novo pedido
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
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} /> Sair
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

      {/* Seção Mais Pedidas (Atalhos Rápidos) */}
      {popularPizzas.length > 0 && (
        <section className="popular-pizzas-section">
          <div className="popular-header">
            <h3>
              <span>🔥</span> Mais Pedidas
            </h3>
            <span>Atalhos rápidos para os sabores favoritos</span>
          </div>

          <div className="popular-grid">
            {popularPizzas.map((pizza) => {
              const variations = pizzaVariations[pizza.id] || [];
              const totalPizzaQty = variations.reduce((sum, v) => sum + v.quantity, 0);

              return (
                <div key={pizza.id} className={`popular-card ${totalPizzaQty > 0 ? 'selected' : ''}`}>
                  <div className="popular-card-top">
                    <span className="popular-card-name">{pizza.name}</span>
                    <span className="popular-card-badge">{pizza.badge || 'Mais Pedida'}</span>
                  </div>

                  <div className="popular-card-bottom">
                    <span className="popular-card-price">R$ {pizza.price.toFixed(2)}</span>

                    {totalPizzaQty === 0 ? (
                      <button
                        type="button"
                        className="popular-add-btn"
                        onClick={() => addVariation(pizza)}
                      >
                        + Adicionar
                      </button>
                    ) : (
                      <div className="popular-qty-controls">
                        <button
                          type="button"
                          className="popular-qty-btn"
                          onClick={() => {
                            if (variations.length > 0) {
                              updateVariationQuantity(pizza.id, variations[variations.length - 1].id, -1);
                            }
                          }}
                        >
                          -
                        </button>
                        <span className="popular-qty-val">{totalPizzaQty}</span>
                        <button
                          type="button"
                          className="popular-qty-btn"
                          onClick={() => {
                            if (variations.length > 0) {
                              updateVariationQuantity(pizza.id, variations[variations.length - 1].id, 1);
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
            const variations = pizzaVariations[pizza.id] || [];
            const isSelected = variations.length > 0;
            const removableList =
              pizza.ingredients && pizza.ingredients.length > 0
                ? pizza.ingredients
                : DEFAULT_REMOVABLE_INGREDIENTS;

            return (
              <div key={pizza.id} className="pizza-item">
                <div className="pizza-header">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        addVariation(pizza);
                      } else {
                        removeAllVariations(pizza.id);
                      }
                    }}
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
                      {pizza.badge && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '0.725rem',
                          padding: '2px 7px',
                          borderRadius: '12px',
                          background: '#ffedd5',
                          color: '#c2410c',
                          fontWeight: 600
                        }}>
                          🔥 {pizza.badge}
                        </span>
                      )}
                    </div>
                    <div className="pizza-price">R$ {pizza.price.toFixed(2)}</div>
                  </div>

                  {!isSelected && (
                    <button
                      type="button"
                      className="popular-add-btn"
                      onClick={() => addVariation(pizza)}
                    >
                      + Adicionar
                    </button>
                  )}
                </div>

                {isSelected && (
                  <div className="pizza-variations-container">
                    {variations.map((variation, index) => (
                      <div key={variation.id} className="pizza-variation-block">
                        <div className="pizza-variation-header">
                          <span className="variation-tag">
                            🍕 {variations.length > 1 ? `Unidade #${index + 1}` : 'Personalização'}
                          </span>
                          <div className="variation-actions">
                            <div className="quantity-controls">
                              <button
                                className="quantity-btn"
                                onClick={() => updateVariationQuantity(pizza.id, variation.id, -1)}
                              >
                                -
                              </button>
                              <span>{variation.quantity}</span>
                              <button
                                className="quantity-btn"
                                onClick={() => updateVariationQuantity(pizza.id, variation.id, 1)}
                              >
                                +
                              </button>
                            </div>
                            {variations.length > 1 && (
                              <button
                                type="button"
                                className="remove-variation-btn"
                                onClick={() => removeVariation(pizza.id, variation.id)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="ingredient-groups">
                          <div className="ingredient-group">
                            <h4>Adicionar Extras</h4>
                            {allIngredients.map((ing) => (
                              <label key={ing.id} className="ingredient-checkbox">
                                <input
                                  type="checkbox"
                                  checked={variation.addedIngredients.some((i) => i.id === ing.id)}
                                  onChange={() =>
                                    toggleVariationIngredient(pizza.id, variation.id, ing, 'add')
                                  }
                                />
                                {ing.name} {ing.additionalPrice > 0 && `(+ R$ ${ing.additionalPrice.toFixed(2)})`}
                              </label>
                            ))}
                          </div>

                          <div className="ingredient-group">
                            <h4>Remover da Receita</h4>
                            {removableList.map((ing) => (
                              <label key={ing.id} className="ingredient-checkbox">
                                <input
                                  type="checkbox"
                                  checked={variation.removedIngredients.some((i) => i.id === ing.id)}
                                  onChange={() =>
                                    toggleVariationIngredient(pizza.id, variation.id, ing, 'remove')
                                  }
                                />
                                Sem {ing.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="add-variation-btn"
                      onClick={() => addVariation(pizza)}
                    >
                      + Adicionar outra {pizza.name} com ingredientes diferentes
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button className="checkout-btn" onClick={handleCheckout}>
        Ir para Checkout ({totalQuantity} pizzas)
      </button>

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
}
