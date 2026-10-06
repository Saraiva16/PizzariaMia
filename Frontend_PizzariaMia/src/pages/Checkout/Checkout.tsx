import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './Checkout.css';

export default function CheckoutPage() {
  const { cartItems, removeFromCart, subtotal, totalItems } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [address, setAddress] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: ''
  });

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cep') {
      let formattedCep = value.replace(/\D/g, ''); // Remove tudo que não for número
      if (formattedCep.length > 8) {
        formattedCep = formattedCep.slice(0, 8);
      }
      if (formattedCep.length > 5) {
        formattedCep = formattedCep.replace(/^(\d{5})(\d)/, '$1-$2');
      }
      setAddress(prev => ({ ...prev, [name]: formattedCep }));
      return;
    }

    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const deliveryFee = 12.00;
  const total = subtotal + deliveryFee;

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
                      <button 
                        className="btn-remove"
                        onClick={() => removeFromCart(item.id)}
                        title="Remover"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    <p className="item-desc">{item.slices} fatias • {item.customization}</p>
                    <p className="item-price">
                      {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery Address */}
          <section className="checkout-section">
            <div className="section-header">
              <h3 className="section-title">Endereço de Entrega</h3>
            </div>
            <div className="address-form">
              <div className="form-group">
                <label htmlFor="cep">CEP</label>
                <input 
                  type="text" 
                  id="cep" 
                  name="cep" 
                  value={address.cep} 
                  onChange={handleAddressChange} 
                  placeholder="00000-000"
                />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 3 }}>
                  <label htmlFor="street">Rua</label>
                  <input 
                    type="text" 
                    id="street" 
                    name="street" 
                    value={address.street} 
                    onChange={handleAddressChange} 
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="number">Número</label>
                  <input 
                    type="text" 
                    id="number" 
                    name="number" 
                    value={address.number} 
                    onChange={handleAddressChange} 
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="complement">Complemento</label>
                  <input 
                    type="text" 
                    id="complement" 
                    name="complement" 
                    value={address.complement} 
                    onChange={handleAddressChange} 
                    placeholder="Apto, Bloco, etc. (Opcional)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="neighborhood">Bairro</label>
                  <input 
                    type="text" 
                    id="neighborhood" 
                    name="neighborhood" 
                    value={address.neighborhood} 
                    onChange={handleAddressChange} 
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="city">Cidade</label>
                <input 
                  type="text" 
                  id="city" 
                  name="city" 
                  value={address.city} 
                  onChange={handleAddressChange} 
                  placeholder="Sua cidade"
                />
              </div>
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

            <button 
              className="btn-finish" 
              onClick={() => {
                console.log('Pedido:', { cartItems, address, paymentMethod, total });
                alert(`Pedido finalizado com sucesso!\nEndereço: ${address.street}, ${address.number}`);
              }}
              disabled={!address.street || !address.number || !address.neighborhood || !address.city}
            >
              Confirmar Pedido
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
