import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import './Profile.css';
import api from '../../services/api';
import { toast } from 'sonner';

export default function AddAddress() {
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Guarulhos',
    state: 'SP',
    zipCode: ''
  });
  const [loading, setLoading] = useState(false);

  const applyCepMask = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
          toast.success('Endereço encontrado pelo CEP!');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    
    if (name === 'zipCode') {
      value = applyCepMask(value);
      if (value.length === 9) {
        fetchCep(value);
      }
    }
    
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const streetAndNumber = `${address.street}, ${address.number}` + 
      (address.complement ? ` - ${address.complement}` : '') +
      ` - ${address.neighborhood}, ${address.city} - ${address.state}, ${address.zipCode}`;

    try {
      await api.post('/addresses', {
        label: address.label,
        streetAndNumber: streetAndNumber,
        isMain: false // Back-end will handle making it main if it's the first
      });
      toast.success('Endereço adicionado com sucesso!');
      navigate(-1);
    } catch (err) {
      toast.error('Erro ao adicionar endereço.');
    } finally {
      setLoading(false);
    }
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
            <label>Como deseja chamar este endereço?</label>
            <Input 
              name="label"
              value={address.label}
              onChange={handleChange}
              placeholder="Ex: Casa, Trabalho, Namorada"
              required
            />
          </div>

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
