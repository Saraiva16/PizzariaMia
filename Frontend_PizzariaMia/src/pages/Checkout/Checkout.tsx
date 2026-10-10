import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, type CartItem } from '../../contexts/CartContext';
import ConfirmModal from '../../shared/ConfirmModal/ConfirmModal';
import EditCartItemModal from './components/EditCartItemModal/EditCartItemModal';
import './Checkout.css';
import api from '../../services/api';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { cartItems, removeFromCart, updateCartItem, clearCart, subtotal, totalItems } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [itemToEdit, setItemToEdit] = useState<CartItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);

  React.useEffect(() => {
    // Load addresses
    api.get('/addresses')
      .then(res => {
        setAddresses(res.data);
        const main = res.data.find((a: any) => a.isMain);
        if (main) setSelectedAddress(main.id);
        else if (res.data.length > 0) setSelectedAddress(res.data[0].id);
      })
      .catch(err => {
        if (err.response?.status === 401) {
          toast.error('Faça login para continuar');
          navigate('/login');
        }
      });
  }, [navigate]);

  const deliveryFee = 12.00;
  const total = subtotal + deliveryFee;

  const handleRequestRemove = (id: string) => {
    setItemToRemove(id);
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove);
      setItemToRemove(null);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddress) {
      toast.error('Por favor, selecione um endereço de entrega. Se não tiver, adicione no perfil.');
      return;
    }

    try {
      setLoading(true);
      const itemsPayload = cartItems.map(item => ({
        PizzaId: item.pizzaId,
        Quantity: item.quantity,
        Customization: JSON.stringify(item.customization || {})
      }));

      // PaymentMethod enum: CreditCard = 0, DebitCard = 1, Cash = 2, Pix = 3
      let paymentEnum = 3; // pix
      if (paymentMethod === 'credit') paymentEnum = 0;
      if (paymentMethod === 'cash') paymentEnum = 2;

      const response = await api.post('/orders', {
        AddressId: selectedAddress,
        PaymentMethod: paymentEnum,
        Items: itemsPayload
      });

      clearCart();
      toast.success('Pedido confirmado com sucesso!');
      navigate(`/pedidos/${response.data.id}/acompanhar`);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Você precisa estar logado para fazer um pedido.');
        navigate('/login');
      } else {
        toast.error('Erro ao processar pedido.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCustomizationText = (cust: any) => {
    if (!cust) return '';
    if (typeof cust === 'string') return cust;
    return `${cust.border}${cust.notes ? ` - Obs: ${cust.notes}` : ''}`;
  };

  if (totalItems === 0) {
    return (
      <div className="checkout-empty">
        <h2>Seu carrinho está vazio</h2>
        <p>Volte ao cardápio e adicione algumas pizzas deliciosas!</p>
        <button className="btn-primary" onClick={() => navigate('/cardapio')}>
          Ver Cardápio
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <button className="btn-back" onClick={() => navigate('/cardapio')}>
          &larr; Voltar
        </button>
        <h2>Resumo do Pedido</h2>
      </header>

      <div className="checkout-content">
        <div className="checkout-main">
          {/* Order Items */}
          <section className="checkout-section">
            <h3 className="section-title">Suas Pizzas ({totalItems})</h3>
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <img src={item.imageUrl} alt={item.name} className="item-image" />
                  <div className="item-details">
                    <div className="item-header">
                      <h4>{item.name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-edit"
                          onClick={() => setItemToEdit(item)}
                          title="Editar Borda/Observação"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button 
                          className="btn-remove"
                          onClick={() => handleRequestRemove(item.id)}
                          title="Remover"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="item-desc">{item.slices} fatias • {getCustomizationText(item.customization)}</p>
                    
                    <div className="item-footer">
                      <div className="qty-controls">
                        <button 
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateCartItem(item.id, { quantity: item.quantity - 1 });
                            } else {
                              handleRequestRemove(item.id);
                            }
                          }}
                        >-</button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                        >+</button>
                      </div>
                      <p className="item-price">
                        {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery Address */}
          <section className="checkout-section">
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <h3 className="section-title">Endereço de Entrega</h3>
            </div>
            <div className="address-options">
              {addresses.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '1rem', color: '#666' }}>Nenhum endereço cadastrado.</p>
                  <button className="btn-primary" onClick={() => navigate('/perfil/endereco/novo')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    + Adicionar Endereço
                  </button>
                </div>
              ) : (
                addresses.map(addr => (
                  <label key={addr.id} className={`address-option ${selectedAddress === addr.id ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="address" 
                      value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)}
                    />
                    <div className="address-option-icon">
                      {addr.label?.toLowerCase() === 'casa' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                      )}
                    </div>
                    <div className="address-option-details">
                      <p className="address-option-title">
                        {addr.label}
                        {addr.isMain && <span className="address-badge">Principal</span>}
                      </p>
                      <p className="address-option-desc">{addr.streetAndNumber}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>

          {/* Payment Method */}
          <section className="checkout-section">
            <h3 className="section-title">Forma de Pagamento</h3>
            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === 'pix' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="pix"
                  checked={paymentMethod === 'pix'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-icon">❖</div>
                <span>PIX (Pagamento Rápido)</span>
              </label>
              
              <label className={`payment-option ${paymentMethod === 'credit' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="credit"
                  checked={paymentMethod === 'credit'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-icon">💳</div>
                <span>Cartão de Crédito</span>
              </label>

              <label className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-icon">💵</div>
                <span>Dinheiro (Pagar na Entrega)</span>
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="checkout-sidebar">
          <div className="summary-card">
            <h3>Total do Pedido</h3>
            
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            
            <div className="summary-row">
              <span>Taxa de Entrega</span>
              <span>{deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            
            <div className="summary-divider"></div>
            
            <div className="summary-row total-row">
              <span>Total</span>
              <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <button className="btn-finish" onClick={handleConfirmOrder} disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </aside>
      </div>
      <ConfirmModal
        isOpen={itemToRemove !== null}
        title="Remover Pizza"
        message="Tem certeza que deseja remover esta pizza do seu pedido?"
        confirmText="Remover"
        onConfirm={confirmRemove}
        onCancel={() => setItemToRemove(null)}
      />
      <EditCartItemModal
        item={itemToEdit}
        onClose={() => setItemToEdit(null)}
      />
    </div>
  );
}
