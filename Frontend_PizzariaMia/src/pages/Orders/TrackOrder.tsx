import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TrackOrder.css';

import * as signalR from '@microsoft/signalr';
import api from '../../services/api';
import { toast } from 'sonner';

const STAGES = [
  { id: 1, label: 'Pedido Efetuado', status: 'Pending' },
  { id: 2, label: 'Pedido em Preparo', status: 'Preparing' },
  { id: 3, label: 'Indo até você', status: 'OutForDelivery' },
  { id: 4, label: 'Pedido Entregue', status: 'Completed' }
];

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentStage, setCurrentStage] = useState(1);
  const [timestamps, setTimestamps] = useState<Record<number, string>>({});
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(response => {
        const data = response.data;
        setOrderDetails({
          id: data.id,
          items: data.items,
          address: data.address,
          total: data.total
        });
        
        const statusStr = data.status;
        const stageIndex = STAGES.findIndex(s => s.status === statusStr);
        if (stageIndex >= 0) {
          setCurrentStage(stageIndex + 1);
          
          const newTimestamps: Record<number, string> = {
            1: new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          // Se já passou da primeira etapa, usar o updatedAt para a etapa atual
          if (stageIndex > 0 && data.updatedAt) {
            newTimestamps[stageIndex + 1] = new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          
          setTimestamps(newTimestamps);
        }
      })
      .catch(error => {
        console.error('Error fetching order', error);
        toast.error('Erro ao buscar pedido.');
      });

    // Inicia conexão WebSocket
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5210/orderTrackingHub')
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        console.log('Conectado ao SignalR Hub!');
        connection.invoke('JoinOrderGroup', id);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    connection.on('StatusChanged', (newStatus: string) => {
      toast.info(`Status do pedido atualizado: ${newStatus}`);
      const stageIndex = STAGES.findIndex(s => s.status === newStatus);
      if (stageIndex >= 0) {
        setCurrentStage(stageIndex + 1);
        setTimestamps(prev => ({
          ...prev,
          [stageIndex + 1]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
      }
    });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('LeaveOrderGroup', id);
        connection.stop();
      }
    };
  }, [id]);

  const formatCurrency = (value: number) => {
    return value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  };

  if (!orderDetails) {
    return <div className="track-page"><p>Carregando pedido...</p></div>;
  }

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
              {orderDetails.items.map((item: any, idx: number) => {
                let customText = "";
                if (item.notes && item.notes !== "{}") {
                  try {
                    const parsed = JSON.parse(item.notes);
                    const elements = [];
                    if (parsed.border && parsed.border !== 'Sem borda') elements.push(`Borda: ${parsed.border}`);
                    if (parsed.notes) elements.push(`Obs: ${parsed.notes}`);
                    if (elements.length > 0) customText = ` (${elements.join(', ')})`;
                  } catch {
                    const raw = item.notes.replace(/"/g, '');
                    if (raw) customText = ` (${raw})`;
                  }
                }
                return <li key={idx}>{item.quantity}x {item.pizzaName}{customText}</li>;
              })}
            </ul>
          </div>

          <div className="summary-section">
            <h3>Endereço de Entrega</h3>
            <div className="summary-address">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <p>
                {orderDetails.address 
                  ? `${orderDetails.address.label.replace(' (Auto-Gerado)', '')} - ${orderDetails.address.street}`
                  : 'Endereço não informado'
                }
              </p>
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
