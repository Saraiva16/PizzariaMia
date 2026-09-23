import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './Checkout.css';

export default function CheckoutPage() {
  const { cartItems, removeFromCart, subtotal, totalItems } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('pix');

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

          {/* Delivery Address (Mocked/Disabled) */}
          <section className="checkout-section opacity-50">
            <div className="section-header">
              <h3 className="section-title">Endereço de Entrega</h3>
              <span className="badge-soon">Em breve</span>
            </div>
            <div className="address-box disabled">
              <div className="address-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className="address-details">
                <p className="address-title">Buscar endereço do perfil...</p>
                <p className="address-subtitle">Funcionalidade disponível após integração de usuários.</p>
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

            <button className="btn-finish" onClick={() => alert('Pedido finalizado com sucesso! (Mock)')}>
              Confirmar Pedido
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
