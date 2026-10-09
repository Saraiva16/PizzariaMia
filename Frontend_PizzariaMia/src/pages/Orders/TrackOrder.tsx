import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TrackOrder.css';

const STAGES = [
  { id: 1, label: 'Pedido Efetuado' },
  { id: 2, label: 'Pedido em Preparo' },
  { id: 3, label: 'Indo até você' },
  { id: 4, label: 'Pedido Entregue' }
];

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mocking current state - Let's say it's currently at stage 2
  const [currentStage, setCurrentStage] = useState(2);
  const [timestamps, setTimestamps] = useState<Record<number, string>>({
    1: '20:15',
    2: '20:20',
  });

  const orderDetails = {
    id: id || '1105',
    items: [
      '1x Calabresa Especial (Borda Cheddar)',
      '1x Coca-Cola 2L'
    ],
    address: 'Rua das Pizzas, 123 - Apto 45',
    total: 72.90
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="track-page">
      <header className="track-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Voltar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1>Acompanhar Pedido #{orderDetails.id}</h1>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="track-content">
        <div className="tracker-container">
          <div className="stepper">
            {STAGES.map((stage, index) => {
              const isCompleted = stage.id <= currentStage;
              const isActive = stage.id === currentStage;
              const isNextActive = stage.id === currentStage + 1;

              return (
                <React.Fragment key={stage.id}>
                  <div className={`step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="step-circle">
                      {isCompleted && !isActive ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <div className="step-dot" />
                      )}
                    </div>
                    <div className="step-label">
                      <span>{stage.label}</span>
                      <span className="step-time">{timestamps[stage.id] || '--:--'}</span>
                    </div>
                  </div>

                  {index < STAGES.length - 1 && (
                    <div className={`step-connector ${stage.id < currentStage ? 'completed' : ''} ${isActive ? 'animating' : ''}`}>
                      <div className="connector-progress" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="order-summary-card">
          <h2>Detalhes do Pedido</h2>
          
          <div className="summary-section">
            <h3>Itens</h3>
            <ul className="summary-items">
              {orderDetails.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="summary-section">
            <h3>Endereço de Entrega</h3>
            <div className="summary-address">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <p>{orderDetails.address}</p>
            </div>
          </div>

          <div className="summary-footer">
            <span>Total a pagar</span>
            <span className="summary-total">{formatCurrency(orderDetails.total)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
