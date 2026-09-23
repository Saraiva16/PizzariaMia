import React, { useState } from 'react';
import './PizzaForm.css';
import '../App.css';

export default function PizzaForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    let value = e.target.value;
        
    value = value.replace(/\D/g, '');
    
    if (value.length > 5) {
      value = value.slice(0, 5);
    }
    
    if (value === '') {
      setPrice('');
      return;
    }

    const numericValue = (parseInt(value, 10) / 100).toFixed(2);
    setPrice(numericValue);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const file = formData.get('image') as File;
    if (!file || file.size === 0) {
      setError("Por favor, selecione uma foto para a pizza.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5210/api/Pizzas', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha ao cadastrar a pizza. Tente novamente.');
      }

      setSuccess(true);
      form.reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container glass">
      <form onSubmit={handleSubmit}>
        
        <div className="form-group">
          <label htmlFor="name">Nome da Pizzas</label>
          <input type="text" id="name" name="name" className="form-input" placeholder="Ex: Margherita Speciale" required />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição / Ingredientes</label>
          <textarea id="description" name="description" className="form-input" placeholder="Descreva os deliciosos ingredientes..." required></textarea>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="price">Preço (R$)</label>
            <input type="text" id="price" name="price" className="form-input" value={price} onChange={handlePriceChange} placeholder="0.00" style={{ width: '100%' }} required />
          </div>
          
          <div style={{ flex: 1 }}>
            <label htmlFor="badge">Selo / Destaque</label>
            <select id="badge" name="badge" className="form-input" style={{ width: '100%' }}>
              <option value="">Nenhum</option>
              <option value="Mais Vendida">Mais Vendida</option>
              <option value="Novidade">Novidade</option>
              <option value="Chef">Sugestão do Chef</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Foto da Pizza</label>
          <div className="file-input-wrapper">
            <button type="button" className="btn-upload">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Escolher Imagem...
            </button>
            <input type="file" id="image" name="image" accept="image/*" required />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Preparando o Forno...' : 'Cadastrar Pizza'}
        </button>

      </form>

      {success && (
        <div className="success-message">
          🍕 Mama mia! Pizza cadastrada com sucesso!
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
