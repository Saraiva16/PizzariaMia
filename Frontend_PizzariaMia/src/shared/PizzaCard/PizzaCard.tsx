import React from 'react';
import { useCart } from '../../contexts/CartContext';
import './PizzaCard.css';

interface PizzaProps {
  pizza: {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    slices?: number;
    badge?: string;
  }
}

export default function PizzaCard({ pizza }: PizzaProps) {
  const { addToCart } = useCart();
  const imageUrl = pizza.imageUrl || 'https://via.placeholder.com/400?text=Sem+Foto';
  const slices = pizza.slices || 8;
  
  let badgeClass = 'card-badge';
  if (pizza.badge === 'Mais Pedida') {
    badgeClass += ' badge-accent';
  } else if (pizza.badge === 'Favorita do Chefe' || pizza.badge === 'Chef') {
    badgeClass += ' badge-secondary';
  } else if (pizza.badge === 'Vegetariana') {
    badgeClass += ' badge-emerald';
  } else {
    badgeClass += ' badge-accent';
  }

  const formattedPrice = pizza.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAdd = () => {
    addToCart({
      pizzaId: pizza.id,
      name: pizza.name,
      price: pizza.price,
      imageUrl: pizza.imageUrl,
      slices: pizza.slices,
      customization: 'Massa tradicional'
    });
  };

  return (
    <article className="pizza-card">
      <div>
        <div className="card-image-container">
          <img src={imageUrl} alt={pizza.name} className="card-image" />
          {pizza.badge && (
            <span className={badgeClass}>
              {pizza.badge}
            </span>
          )}
        </div>

        <div className="card-info">
          <div className="card-header-row">
            <h3 className="card-title">{pizza.name}</h3>
            <span className="card-slices">{slices} fatias</span>
          </div>
          <p className="card-desc">
            {pizza.description}
          </p>
        </div>
      </div>

      <div className="card-footer">
        <div>
          <span className="card-price-label">A partir de</span>
          <span className="card-price">{formattedPrice}</span>
        </div>
        <button className="card-add-btn" onClick={handleAdd}>
          <span>+</span>
          <span>Adicionar</span>
        </button>
      </div>
    </article>
  );
}
