import React, { useState, useEffect } from 'react';
import { useCart, type CartItem } from '../../../../contexts/CartContext';
import { toast } from 'sonner';
import '../../../Menu/components/PizzaModal/PizzaModal.css';

interface EditCartItemModalProps {
  item: CartItem | null;
  onClose: () => void;
}

export default function EditCartItemModal({ item, onClose }: EditCartItemModalProps) {
  const { updateCartItem } = useCart();
  
  const [border, setBorder] = useState('Sem borda');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item && item.customization && typeof item.customization === 'object') {
      setBorder(item.customization.border || 'Sem borda');
      setNotes(item.customization.notes || '');
    }
  }, [item]);

  if (!item) return null;

  const handleSave = () => {
    updateCartItem(item.id, {
      customization: {
        border,
        notes
      }
    });
    
    toast.success(`Alterações salvas em ${item.name}!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img src={item.imageUrl || 'https://via.placeholder.com/400'} alt={item.name} />
          <div className="modal-title-info">
            <h2>Editar {item.name}</h2>
            <p>Ajuste a borda ou observações deste item no seu pedido.</p>
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

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="add-to-cart-btn" onClick={handleSave} style={{ width: '100%', justifyContent: 'center' }}>
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
