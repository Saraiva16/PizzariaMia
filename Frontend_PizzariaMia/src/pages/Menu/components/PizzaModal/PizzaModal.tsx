import React, { useState } from 'react';
import { useCart } from '../../../../contexts/CartContext';
import { toast } from 'sonner';
import './PizzaModal.css';

interface PizzaModalProps {
  pizza: any;
  onClose: () => void;
}

export default function PizzaModal({ pizza, onClose }: PizzaModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [border, setBorder] = useState('Sem borda');
  const [notes, setNotes] = useState('');

  if (!pizza) return null;

  const formattedPrice = pizza.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const total = (pizza.price * quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAdd = () => {
    // Adiciona X quantidades da MESMA pizza configurada
    for (let i = 0; i < quantity; i++) {
      addToCart({
        pizzaId: pizza.id,
        name: pizza.name,
        price: pizza.price,
        imageUrl: pizza.imageUrl,
        slices: pizza.slices,
        customization: `${border}${notes ? ` - Observação: ${notes}` : ''}`
      });
    }
    
    toast.success(`${quantity}x ${pizza.name} adicionada(s)!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img src={pizza.imageUrl || 'https://via.placeholder.com/400'} alt={pizza.name} />
          <div className="modal-title-info">
            <h2>{pizza.name}</h2>
            <p>{pizza.description}</p>
            <span className="modal-price">{formattedPrice}</span>
          </div>
        </div>

        <div className="modal-body">
          <div className="config-section">
            <label>Borda recheada?</label>
            <select value={border} onChange={(e) => setBorder(e.target.value)} className="modal-select">
              <option value="Sem borda">Sem borda (+ R$ 0,00)</option>
              <option value="Borda de Catupiry">Borda de Catupiry (+ R$ 8,00)</option>
              <option value="Borda de Cheddar">Borda de Cheddar (+ R$ 8,00)</option>
            </select>
          </div>

          <div className="config-section">
            <label>Alguma observação?</label>
            <textarea 
              placeholder="Ex: Tirar cebola, bem assada..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="modal-textarea"
            />
          </div>
        </div>

        <div className="modal-footer">
          <div className="quantity-selector">
            <button 
              className="qty-btn" 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >-</button>
            <span className="qty-value">{quantity}</span>
            <button 
              className="qty-btn" 
              onClick={() => setQuantity(quantity + 1)}
            >+</button>
          </div>
          
          <button className="add-to-cart-btn" onClick={handleAdd}>
            <span>Adicionar</span>
            <span>{total}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
