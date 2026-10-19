import React, { useState } from 'react';
import { useCart } from '../../../../contexts/CartContext';
import { toast } from 'sonner';
import './PizzaModal.css';

export interface PizzaItem {
  id: number;
  name: string;
  slices?: number;
  description: string;
  price: number;
  imageUrl?: string;
  badge?: string;
  category: string;
}

interface PizzaModalProps {
  pizza: PizzaItem;
  allPizzas?: PizzaItem[];
  onClose: () => void;
}

export default function PizzaModal({ pizza, allPizzas = [], onClose }: PizzaModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [border, setBorder] = useState('Sem borda');
  const [notes, setNotes] = useState('');
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [secondPizzaId, setSecondPizzaId] = useState<number | null>(null);

  if (!pizza) return null;

  // Localiza segundo sabor selecionado
  const secondPizza = allPizzas.find((p) => p.id === secondPizzaId) || null;

  // Regra padrão de pizzaria: Preço cobrado é o maior valor entre as duas metades
  const basePrice = isHalfAndHalf && secondPizza 
    ? Math.max(pizza.price, secondPizza.price) 
    : pizza.price;

  const formattedBasePrice = basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const total = (basePrice * quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAdd = () => {
    const itemName = isHalfAndHalf && secondPizza
      ? `Pizza 1/2 ${pizza.name} + 1/2 ${secondPizza.name}`
      : pizza.name;

    const finalNotes = isHalfAndHalf && secondPizza
      ? `Metade 1: ${pizza.name} | Metade 2: ${secondPizza.name}${notes ? ` | Obs: ${notes}` : ''}`
      : notes;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        pizzaId: pizza.id,
        name: itemName,
        price: basePrice,
        imageUrl: pizza.imageUrl || 'https://via.placeholder.com/400',
        slices: pizza.slices || 8,
        customization: {
          border: border,
          notes: finalNotes
        }
      });
    }

    toast.success(`${quantity}x ${itemName} adicionada(s) ao carrinho!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img src={pizza.imageUrl || 'https://via.placeholder.com/400'} alt={pizza.name} />
          <div className="modal-title-info">
            <h2>{isHalfAndHalf && secondPizza ? `Meio a Meio: ${pizza.name} & ${secondPizza.name}` : pizza.name}</h2>
            <p>{pizza.description}</p>
            <span className="modal-price">{formattedBasePrice}</span>
          </div>
        </div>

        <div className="modal-body">
          {/* Seção Meio a Meio (disponível apenas para pizzas) */}
          {allPizzas.length > 1 && pizza.category !== 'Esfihas' && (
            <div className="config-section half-pizza-box">
              <div className="half-toggle-row">
                <label htmlFor="half-and-half-chk" className="half-toggle-label">
                  🍕 Deseja Meio a Meio? (2 Sabores)
                </label>
                <input
                  id="half-and-half-chk"
                  type="checkbox"
                  className="half-pizza-switch"
                  checked={isHalfAndHalf}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsHalfAndHalf(checked);
                    if (checked && !secondPizzaId) {
                      const other = allPizzas.find((p) => p.id !== pizza.id && p.category !== 'Esfihas');
                      if (other) setSecondPizzaId(other.id);
                    }
                  }}
                />
              </div>

              {isHalfAndHalf && (
                <div className="second-flavor-container">
                  <label>Selecione a 2ª Metade:</label>
                  <select
                    className="modal-select"
                    value={secondPizzaId || ''}
                    onChange={(e) => setSecondPizzaId(Number(e.target.value))}
                  >
                    {allPizzas
                      .filter((p) => p.id !== pizza.id && p.category !== 'Esfihas')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          1/2 {p.name} - R$ {p.price.toFixed(2)} {p.price > pizza.price ? `(+ R$ ${(p.price - pizza.price).toFixed(2)})` : ''}
                        </option>
                      ))}
                  </select>
                  <span className="half-notice-text">
                    ℹ️ O valor é calculado pelo maior preço entre os dois sabores.
                  </span>
                </div>
              )}
            </div>
          )}

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
