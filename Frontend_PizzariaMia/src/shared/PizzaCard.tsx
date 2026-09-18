import React from 'react';

interface PizzaProps {
  pizza: {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    badge?: string;
  }
}

export default function PizzaCard({ pizza }: PizzaProps) {
  const imageUrl = pizza.imageUrl || 'https://via.placeholder.com/400?text=Sem+Foto';

  let badgeStyle = {};
  if (pizza.badge === 'Vegetariana') {
    badgeStyle = { backgroundColor: '#059669', color: 'white' };
  } else if (pizza.badge === 'Favorita do Chefe' || pizza.badge === 'Chef') {
    badgeStyle = { backgroundColor: 'var(--color-secondary)', color: 'var(--color-text)' };
  } else if (pizza.badge === 'Novidade') {
    badgeStyle = { backgroundColor: '#3b82f6', color: 'white' };
  }

  return (
    <article className="pizza-card">
      <div>
        <div className="card-image-container">
          <img src={imageUrl} alt={pizza.name} className="card-image" />
          {pizza.badge && (
            <span className="card-badge" style={badgeStyle}>
              {pizza.badge}
            </span>
          )}
        </div>

        <div className="card-info">
          <div className="card-header-row">
            <h3 className="card-title">{pizza.name}</h3>
            <span className="card-slices">8 fatias</span>
          </div>
          <p className="card-desc">
            {pizza.description}
          </p>
        </div>
      </div>

      <div className="card-footer">
        <div className="card-price-wrapper">
          <span className="card-price-label">A partir de</span>
          <span className="card-price">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pizza.price)}
          </span>
        </div>
        <button className="card-add-btn">
          <span>+</span>
          <span>Adicionar</span>
        </button>
      </div>
    </article>
  );
}
