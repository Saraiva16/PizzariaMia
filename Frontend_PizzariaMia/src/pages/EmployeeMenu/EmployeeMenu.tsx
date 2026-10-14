import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewOrderModal, { type ClientData } from './NewOrderModal';
import { toast } from 'sonner';
import './EmployeeMenu.css';

// Interfaces mockadas temporariamente
interface Ingredient {
  id: number;
  name: string;
  additionalPrice: number;
}

interface Pizza {
  id: number;
  name: string;
  price: number;
  ingredients: Ingredient[];
}

interface OrderItem {
  pizzaId: number;
  quantity: number;
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
}

export default function EmployeeMenu() {
  const navigate = useNavigate();
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [orderItems, setOrderItems] = useState<Record<number, OrderItem>>({});
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
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
    // Simulando chamada para buscar pizzas
    setPizzas([
      { id: 1, name: 'Margarita', price: 45.00, ingredients: [{ id: 3, name: 'Cebola', additionalPrice: 0 }] },
      { id: 2, name: 'Calabresa', price: 50.00, ingredients: [{ id: 4, name: 'Milho', additionalPrice: 0 }] },
    ]);
  }, []);

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

      <div className="pizza-list">
        {pizzas.map(pizza => {
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
                  <div className="pizza-name">{pizza.name}</div>
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
                      {allIngredients.map(ing => (
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
                      {pizza.ingredients.map(ing => (
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
