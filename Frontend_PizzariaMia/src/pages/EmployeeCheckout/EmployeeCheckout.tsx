import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeeCheckout.css';

interface Ingredient {
  id: number;
  name: string;
  additionalPrice: number;
}

interface OrderItem {
  pizzaId: number;
  quantity: number;
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
}

interface Client {
  id: number;
  name: string;
  email: string; // Utilizado como telefone na simulação
}

export default function EmployeeCheckout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const items = localStorage.getItem('employeeOrderItems');
    if (items) {
      setOrderItems(JSON.parse(items));
    } else {
      navigate('/employee/menu');
    }
  }, [navigate]);

  const handleSearchClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5210/api/users/search?query=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        if (users && users.length > 0) {
          // Simplificação: pega o primeiro
          setSelectedClient(users[0]);
        } else {
          alert('Cliente não encontrado.');
          setSelectedClient(null);
        }
      } else {
        alert('Erro ao buscar cliente.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedClient) {
      alert('Selecione um cliente antes de finalizar.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Payload simplificado mapeando para o DTO que fizemos merge
      const payload = {
        userId: selectedClient.id,
        items: orderItems.map(item => ({
          pizzaId: item.pizzaId,
          quantity: item.quantity,
          addedIngredientsIds: item.addedIngredients.map(i => i.id),
          removedIngredientsIds: item.removedIngredients.map(i => i.id),
          crust: 0,
          notes: ''
        }))
      };

      const response = await fetch('http://localhost:5210/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Pedido finalizado com sucesso!');
        localStorage.removeItem('employeeOrderItems');
        navigate('/employee/menu');
      } else {
        alert('Erro ao finalizar pedido.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao finalizar pedido.');
    }
  };

  return (
    <div className="employee-checkout-container">
      <h1>Resumo do Pedido</h1>

      <div className="checkout-section">
        <h2>Vincular Cliente</h2>
        <form className="search-client-form" onSubmit={handleSearchClient}>
          <input 
            type="text" 
            className="search-input"
            placeholder="Digite telefone ou nome..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn" disabled={isSearching}>
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {selectedClient && (
          <div className="client-result">
            <div>
              <strong>{selectedClient.name}</strong><br/>
              <span>Contato: {selectedClient.email}</span>
            </div>
            <button onClick={() => setSelectedClient(null)} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>
              Remover
            </button>
          </div>
        )}
      </div>

      <div className="checkout-section">
        <h2>Itens do Pedido</h2>
        <div className="order-items-list">
          {orderItems.map((item, index) => (
            <div key={index} className="order-item-summary">
              <div className="item-details">
                <h4>{item.quantity}x Pizza #{item.pizzaId}</h4>
                {item.addedIngredients.length > 0 && (
                  <p className="customization-text">+ Adicionais: {item.addedIngredients.map(i => i.name).join(', ')}</p>
                )}
                {item.removedIngredients.length > 0 && (
                  <p className="customization-text">- Sem: {item.removedIngredients.map(i => i.name).join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        className="confirm-btn" 
        onClick={handleConfirmOrder}
        disabled={!selectedClient || orderItems.length === 0}
      >
        Confirmar Pedido
      </button>
    </div>
  );
}
