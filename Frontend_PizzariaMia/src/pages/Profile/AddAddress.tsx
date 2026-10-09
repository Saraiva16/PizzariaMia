import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import './Profile.css';

export default function AddAddress() {
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    zipCode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to save new address to backend would go here
    // ...
    navigate(-1); // Return to profile
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Voltar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1>Novo Endereço</h1>
        <div style={{ width: '40px' }}></div> {/* Spacer for centering */}
      </header>

      <main className="profile-content">
        <form className="profile-form" onSubmit={handleSave}>
          
          <div className="form-group">
            <label>CEP</label>
            <Input 
              name="zipCode"
              value={address.zipCode}
              onChange={handleChange}
              placeholder="00000-000"
              required
            />
          </div>

          <div className="form-group">
            <label>Rua / Avenida</label>
            <Input 
              name="street"
              value={address.street}
              onChange={handleChange}
              placeholder="Ex: Rua das Flores"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Número</label>
              <Input 
                name="number"
                value={address.number}
                onChange={handleChange}
                placeholder="123"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 2 }}>
              <label>Complemento</label>
              <Input 
                name="complement"
                value={address.complement}
                onChange={handleChange}
                placeholder="Apto, Bloco..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bairro</label>
            <Input 
              name="neighborhood"
              value={address.neighborhood}
              onChange={handleChange}
              placeholder="Ex: Centro"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Cidade</label>
              <Input 
                name="city"
                value={address.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Estado</label>
              <Input 
                name="state"
                value={address.state}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <Button variant="primary" type="submit" style={{ marginTop: '1rem' }}>
            SALVAR ENDEREÇO
          </Button>
        </form>
      </main>
    </div>
  );
}
