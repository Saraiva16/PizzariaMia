import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import NewOrderModal, { type ClientData, type AddressItem } from '../EmployeeMenu/NewOrderModal';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import './EmployeeCheckout.css';

interface Ingredient {
  id: number;
  name: string;
  additionalPrice: number;
}

interface OrderItem {
  id?: string;
  pizzaId: number;
  pizzaName?: string;
  price?: number;
  quantity: number;
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
  isHalfAndHalf?: boolean;
  secondPizzaId?: number;
  secondPizzaName?: string;
  secondPizzaPrice?: number;
}

export default function EmployeeCheckout() {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isDelivery, setIsDelivery] = useState<boolean>(true);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<number>(1); // 1 = CreditCard, 2 = DebitCard, 3 = Pix, 4 = Cash
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangeClientModalOpen, setIsChangeClientModalOpen] = useState(false);

  useEffect(() => {
    // Carrega itens selecionados
    const items = localStorage.getItem('employeeOrderItems');
    if (items) {
      try {
        const parsedItems: OrderItem[] = JSON.parse(items);
        if (parsedItems.length === 0) {
          navigate('/funcionario/cardapio');
          return;
        }
        setOrderItems(parsedItems);
      } catch {
        navigate('/funcionario/cardapio');
        return;
      }
    } else {
      navigate('/funcionario/cardapio');
      return;
    }

    // Carrega cliente selecionado
    const savedClient = localStorage.getItem('employeeSelectedClient');
    if (savedClient) {
      try {
        const client: ClientData = JSON.parse(savedClient);
        setSelectedClient(client);

        // Preenche o endereço inicial com o endereço cadastrado (se houver)
        if (client.addresses && client.addresses.length > 0) {
          const mainAddr = client.addresses.find((a: AddressItem) => a.isMain) || client.addresses[0];
          setDeliveryAddress(mainAddr.streetAndNumber);
        }
      } catch {
        // ignora erro de parse
      }
    }
  }, [navigate]);

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    localStorage.setItem('employeeSelectedClient', JSON.stringify(client));
    if (client.addresses && client.addresses.length > 0) {
      const mainAddr = client.addresses.find((a: AddressItem) => a.isMain) || client.addresses[0];
      setDeliveryAddress(mainAddr.streetAndNumber);
    } else {
      setDeliveryAddress('');
    }
    toast.success(`Cliente ${client.name} selecionado.`);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setDeliveryAddress('');
    localStorage.removeItem('employeeSelectedClient');
    toast.info('Cliente desvinculado.');
  };

  // Cálculos financeiros
  const subtotalPizzas = useMemo(() => {
    return orderItems.reduce((acc, item) => {
      const basePrice = item.isHalfAndHalf && item.secondPizzaPrice
        ? Math.max(item.price || 0, item.secondPizzaPrice)
        : (item.price || 0);
      const extrasPrice = item.addedIngredients.reduce((sum, ing) => sum + (ing.additionalPrice || 0), 0);
      return acc + (basePrice + extrasPrice) * item.quantity;
    }, 0);
  }, [orderItems]);

  const deliveryFee = isDelivery ? 10.0 : 0.0;
  const totalAmount = subtotalPizzas + deliveryFee;

  const handleConfirmOrder = async () => {
    if (!selectedClient) {
      toast.error('Por favor, identifique ou vincule o cliente antes de confirmar o pedido.');
      setIsChangeClientModalOpen(true);
      return;
    }

    if (isDelivery && !deliveryAddress.trim()) {
      toast.error('Por favor, informe o endereço de entrega do cliente.');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('O carrinho está vazio.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Localiza addressId se corresponder a um dos cadastrados
      const existingAddress = isDelivery && selectedClient.addresses?.find(
        (a) => a.streetAndNumber.trim().toLowerCase() === deliveryAddress.trim().toLowerCase()
      );

      const payload = {
        userId: selectedClient.id,
        isDelivery,
        addressId: isDelivery && existingAddress ? existingAddress.id : undefined,
        deliveryAddress: isDelivery ? deliveryAddress.trim() : 'Retirada no Balcão',
        paymentMethod,
        items: orderItems.map((item) => {
          // Prepara customização textual para a cozinha
          const halfText = item.isHalfAndHalf && item.secondPizzaName
            ? `[MEIO A MEIO: 1/2 ${item.pizzaName} + 1/2 ${item.secondPizzaName}]`
            : null;
          const addText = item.addedIngredients.length > 0 ? item.addedIngredients.map((i) => `+ ${i.name}`).join(', ') : null;
          const remText = item.removedIngredients.length > 0 ? item.removedIngredients.map((i) => `- Sem ${i.name}`).join(', ') : null;
          const customizationNotes = [halfText, addText, remText].filter(Boolean).join(' | ');

          return {
            pizzaId: item.pizzaId,
            quantity: item.quantity,
            customization: customizationNotes
          };
        })
      };

      await api.post('/orders', payload);

      toast.success('Pedido finalizado com sucesso e enviado para a cozinha!');
      localStorage.removeItem('employeeOrderItems');
      localStorage.removeItem('employeePizzaVariations');
      localStorage.removeItem('employeeSelectedClient');
      navigate('/funcionario/cardapio');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao finalizar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="employee-checkout-page">
      <div className="checkout-top-navigation">
        <button
          type="button"
          className="back-to-menu-btn"
          onClick={() => navigate('/funcionario/cardapio')}
        >
          &larr; Voltar ao Cardápio
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <span className="checkout-breadcrumb">Atendimento &gt; Resumo do Pedido</span>
        </div>
      </div>

      <div className="checkout-main-content">
        <div className="checkout-header-title">
          <h1>Resumo do Pedido</h1>
          <p>Confira os dados do cliente e os itens selecionados antes de enviar à cozinha.</p>
        </div>

        {/* Card de Dados do Cliente */}
        <section className="checkout-card client-details-card">
          <div className="card-header-row">
            <h2>Dados do Cliente</h2>
            {selectedClient ? (
              <button
                type="button"
                className="action-link-btn"
                onClick={() => setIsChangeClientModalOpen(true)}
              >
                Trocar Cliente
              </button>
            ) : (
              <button
                type="button"
                className="select-client-action-btn"
                onClick={() => setIsChangeClientModalOpen(true)}
              >
                + Vincular Cliente
              </button>
            )}
          </div>

          {selectedClient ? (
            <div className="client-info-grid">
              <div className="client-data-item">
                <span className="data-label">Nome Completo:</span>
                <span className="data-value highlight-name">{selectedClient.name}</span>
              </div>

              <div className="client-data-item">
                <span className="data-label">Telefone / Contato:</span>
                <span className="data-value">{selectedClient.phone || 'Não informado'}</span>
              </div>

              {selectedClient.email && (
                <div className="client-data-item">
                  <span className="data-label">E-mail:</span>
                  <span className="data-value">{selectedClient.email}</span>
                </div>
              )}

              <div className="client-data-item full-width-item">
                <span className="data-label">Tipo de Pedido:</span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', marginBottom: '0.6rem' }}>
                  <button
                    type="button"
                    className={`chip-addr-btn ${isDelivery ? 'active' : ''}`}
                    onClick={() => setIsDelivery(true)}
                    style={{ padding: '0.5rem 1rem', fontWeight: 600 }}
                  >
                    🛵 Entrega (Delivery - R$ 10,00)
                  </button>
                  <button
                    type="button"
                    className={`chip-addr-btn ${!isDelivery ? 'active' : ''}`}
                    onClick={() => setIsDelivery(false)}
                    style={{ padding: '0.5rem 1rem', fontWeight: 600 }}
                  >
                    🏪 Retirada no Balcão (Grátis)
                  </button>
                </div>
              </div>

              {isDelivery ? (
                <div className="client-data-item full-width-item">
                  <label htmlFor="delivery-address-input" className="data-label">
                    Endereço de Entrega *
                  </label>
                  <div className="address-input-wrapper">
                    <input
                      id="delivery-address-input"
                      type="text"
                      className="delivery-address-input"
                      placeholder="Ex: Rua das Flores, 123 - Apto 402 - Centro"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                    {selectedClient.addresses && selectedClient.addresses.length > 1 && (
                      <div className="saved-addresses-chips">
                        <span className="chips-label">Endereços salvos:</span>
                        {selectedClient.addresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            className={`chip-addr-btn ${deliveryAddress === addr.streetAndNumber ? 'active' : ''}`}
                            onClick={() => setDeliveryAddress(addr.streetAndNumber)}
                          >
                            {addr.label || 'Outro'}: {addr.streetAndNumber}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="client-data-item full-width-item" style={{ background: 'rgba(234, 88, 12, 0.08)', padding: '0.8rem', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary, #ea580c)' }}>📍 Retirada no Balcão da Pizzaria</span>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: '#666' }}>O cliente retirará o pedido presencialmente. Nenhuma taxa de entrega será cobrada.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="no-client-warning">
              <p>Nenhum cliente vinculado a este pedido ainda.</p>
              <button
                type="button"
                className="link-btn-highlight"
                onClick={() => setIsChangeClientModalOpen(true)}
              >
                Buscar ou cadastrar cliente agora
              </button>
            </div>
          )}
        </section>

        {/* Lista de Itens do Pedido */}
        <section className="checkout-card items-summary-card">
          <div className="card-header-row">
            <h2>Pizzas &amp; Personalizações ({orderItems.reduce((acc, i) => acc + i.quantity, 0)} un)</h2>
            <button
              type="button"
              className="action-link-btn"
              onClick={() => navigate('/funcionario/cardapio')}
            >
              + Adicionar mais pizzas
            </button>
          </div>

          <div className="order-items-flow">
            {orderItems.map((item, index) => {
              const basePrice = item.price || 0;
              const extrasSum = item.addedIngredients.reduce((s, ing) => s + (ing.additionalPrice || 0), 0);
              const lineTotal = (basePrice + extrasSum) * item.quantity;

              return (
                <div key={item.id || index} className="order-item-card">
                  <div className="order-item-main-row">
                    <div className="order-item-title-wrapper">
                      <span className="item-qty-badge">{item.quantity}x</span>
                      <div>
                        <strong className="item-title">
                          {item.isHalfAndHalf && item.secondPizzaName
                            ? `1/2 ${item.pizzaName} + 1/2 ${item.secondPizzaName}`
                            : (item.pizzaName || `Pizza #${item.pizzaId}`)}
                        </strong>
                        {item.isHalfAndHalf && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#ffedd5',
                            color: '#c2410c',
                            fontWeight: 600
                          }}>
                            🍕 Meio a Meio
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="item-price-tag">R$ {lineTotal.toFixed(2)}</span>
                  </div>

                  {(item.addedIngredients.length > 0 || item.removedIngredients.length > 0) && (
                    <div className="item-customizations-box">
                      {item.addedIngredients.length > 0 && (
                        <p className="cust-row added">
                          <strong>Adicionais:</strong> {item.addedIngredients.map((i) => `${i.name} (+R$ ${i.additionalPrice.toFixed(2)})`).join(', ')}
                        </p>
                      )}
                      {item.removedIngredients.length > 0 && (
                        <p className="cust-row removed">
                          <strong>Sem:</strong> {item.removedIngredients.map((i) => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Forma de Pagamento */}
        <section className="checkout-card payment-method-card">
          <h2>Forma de Pagamento</h2>
          <div className="payment-options-grid">
            {[
              { id: 1, label: 'Cartão de Crédito', icon: '💳' },
              { id: 2, label: 'Cartão de Débito', icon: '💳' },
              { id: 3, label: 'PIX', icon: '📱' },
              { id: 4, label: 'Dinheiro', icon: '💵' }
            ].map((method) => (
              <label
                key={method.id}
                className={`payment-option-label ${paymentMethod === method.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={() => setPaymentMethod(method.id)}
                />
                <span className="payment-icon">{method.icon}</span>
                <span className="payment-title">{method.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Total & Finalização */}
        <section className="checkout-card total-summary-card">
          <div className="totals-breakdown">
            <div className="totals-row">
              <span>Subtotal dos Itens:</span>
              <span>R$ {subtotalPizzas.toFixed(2)}</span>
            </div>
            <div className="totals-row">
              <span>Taxa de Entrega:</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="totals-row grand-total">
              <span>Total a Cobrar:</span>
              <span className="total-value">R$ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="checkout-final-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/funcionario/cardapio')}
            >
              Voltar ao Cardápio
            </button>
            <button
              type="button"
              className="confirm-order-submit-btn"
              disabled={isSubmitting || !selectedClient || (isDelivery && !deliveryAddress.trim()) || orderItems.length === 0}
              onClick={handleConfirmOrder}
            >
              {isSubmitting ? 'Enviando Pedido...' : 'Confirmar e Enviar para Cozinha'}
            </button>
          </div>
        </section>
      </div>

      <NewOrderModal
        isOpen={isChangeClientModalOpen}
        onClose={() => setIsChangeClientModalOpen(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
}
