import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button/Button';
import './Orders.css';

// Mock data for orders
const MOCKED_ORDERS = [
  {
    id: '1105',
    date: 'Hoje',
    time: 'Agora',
    status: 'Em Preparo',
    address: 'Rua das Pizzas, 123 - Apto 45',
    items: [
      '1x Calabresa Especial (Borda Cheddar)',
      '1x Coca-Cola 2L'
    ],
    total: 72.90,
    rating: null
  },
  {
    id: '1092',
    date: '08 Out 2026',
    time: '20:15',
    status: 'Entregue',
    address: 'Rua das Pizzas, 123 - Apto 45',
    items: [
      '1x Calabresa Especial (Borda Catupiry)',
      '1x Frango Desfiado Catupiry'
    ],
    total: 119.80,
    rating: null // Not rated yet
  },
  {
    id: '0984',
    date: '15 Set 2026',
    time: '19:30',
    status: 'Entregue',
    address: 'Rua das Pizzas, 123 - Apto 45',
    items: [
      "2x Marguerita D'Itália"
    ],
    total: 116.00,
    rating: 5 // Rated 5 stars
  },
  {
    id: '0842',
    date: '10 Ago 2026',
    time: '21:00',
    status: 'Entregue',
    address: 'Av. Paulista, 1000 - Conjunto 200',
    items: [
      '1x Quatro Queijos Premium'
    ],
    total: 62.90,
    rating: 4 // Rated 4 stars
  }
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders] = useState(MOCKED_ORDERS);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleOrderAgain = (orderId: string) => {
    // In a real app, this would fetch order details and add to cart context
    alert(`Pedindo novamente o pedido #${orderId}. Os itens foram adicionados ao carrinho!`);
    navigate('/checkout');
  };

  const handleRate = (orderId: string) => {
    alert(`Abrindo modal de avaliação para o pedido #${orderId}`);
  };

  const handleTrack = (orderId: string) => {
    navigate(`/pedidos/${orderId}/acompanhar`);
  };

  const getStatusClass = (status: string) => {
    if (status === 'Em Preparo' || status === 'A Caminho') return 'status-progress';
    if (status === 'Cancelado') return 'status-cancelled';
    return 'status-delivered';
  };

  return (
    <div className="orders-page">
      <header className="orders-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Voltar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1>Meus Pedidos</h1>
        <div style={{ width: '40px' }}></div> {/* Spacer for centering */}
      </header>

      <main className="orders-content">
        {orders.length === 0 ? (
          <div className="empty-orders">
            <p>Você ainda não tem nenhum pedido :(</p>
            <Button variant="primary" onClick={() => navigate('/cardapio')}>
              Explorar Cardápio
            </Button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-meta">
                    <span className="order-id">Pedido #{order.id}</span>
                    <span className="order-date">{order.date} às {order.time}</span>
                  </div>
                  <span className={`order-status ${getStatusClass(order.status)}`}>{order.status}</span>
                </div>

                <div className="order-details">
                  <div className="order-items">
                    {order.items.map((item, idx) => (
                      <p key={idx} className="item-text">{item}</p>
                    ))}
                  </div>
                  <div className="order-address-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{order.address}</span>
                  </div>
                </div>

                <div className="order-footer">
                  <div className="order-total-price">
                    {formatCurrency(order.total)}
                  </div>
                  
                  <div className="order-actions">
                    {order.status === 'Entregue' ? (
                      <>
                        {order.rating === null ? (
                          <button className="rate-btn" onClick={() => handleRate(order.id)}>
                            ⭐ Avaliar
                          </button>
                        ) : (
                          <div className="stars-display">
                            {[1, 2, 3, 4, 5].map(star => (
                              <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill={star <= order.rating! ? "var(--color-primary)" : "none"} stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                              </svg>
                            ))}
                          </div>
                        )}
                        <Button variant="primary" className="reorder-btn" onClick={() => handleOrderAgain(order.id)}>
                          Pedir Novamente
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" className="track-btn" onClick={() => handleTrack(order.id)}>
                        Acompanhar Pedido
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
