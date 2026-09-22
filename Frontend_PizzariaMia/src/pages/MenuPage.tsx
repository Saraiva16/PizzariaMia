import React, { useEffect, useState } from 'react';
import PizzaCard from '../shared/PizzaCard';

export default function MenuPage() {
  const [pizzas, setPizzas] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5210/api/Pizzas')
      .then(res => res.json())
      .then(data => setPizzas(data))
      .catch(err => console.error("Erro ao buscar pizzas:", err));
  }, []);

  return (
    <div className="menu-container">
      <div className="menu-header">
        <div className="menu-title">
          <h2>Escolha seu sabor</h2>
          <p>Pizzas artesanais feitas no forno a lenha</p>
        </div>

        <div className="menu-filters">
          <button className="filter-badge active">Todas</button>
          <button className="filter-badge">Tradicionais</button>
          <button className="filter-badge">Especiais</button>
          <button className="filter-badge">Doces</button>
        </div>
      </div>

      <div className="pizza-grid">
        {pizzas.map((pizza: any) => (
          <PizzaCard 
            key={pizza.id} 
            pizza={pizza} 
          />
        ))}
        {pizzas.length === 0 && (
          <p>Carregando pizzas do forno...</p>
        )}
      </div>
    </div>
  );
}
