import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import ConfirmModal from '../../shared/ConfirmModal/ConfirmModal';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Mocked user data
  const [userData, setUserData] = useState({
    name: 'Mateus Saraiva Silva',
    phone: '(11) 99137-4020',
    email: 'mateus@example.com',
    addresses: [
      { id: 1, street: 'Rua das Pizzas, 123', complement: 'Apto 45', isMain: true },
      { id: 2, street: 'Av. Paulista, 1000', complement: 'Conjunto 200', isMain: false }
    ],
    paymentMethod: 'Cartão de Crédito final 4321'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetMainAddress = (id: number) => {
    if (!isEditing) return;
    setUserData(prev => ({
      ...prev,
      addresses: prev.addresses.map(addr => ({
        ...addr,
        isMain: addr.id === id
      }))
    }));
  };

  const handleSaveClick = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmSave = () => {
    // Logic to save data to backend
    setIsEditing(false);
    setIsConfirmModalOpen(false);
  };

  // Sort addresses so the main one is always first
  const sortedAddresses = [...userData.addresses].sort((a, b) => {
    if (a.isMain) return -1;
    if (b.isMain) return 1;
    return 0;
  });

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Voltar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1>Perfil</h1>
        
        {isEditing ? (
          <Button variant="primary" className="edit-btn save-mode" onClick={handleSaveClick}>
            SALVAR
          </Button>
        ) : (
          <Button variant="text" className="edit-btn" onClick={() => setIsEditing(true)}>
            EDITAR <span className="edit-icon">✏️</span>
          </Button>
        )}
      </header>

      <main className="profile-content">
        <div className="profile-form">
          <div className="form-group">
            <label>Nome Completo</label>
            <Input 
              name="name"
              value={userData.name}
              onChange={handleChange}
              disabled={!isEditing}
              className={!isEditing ? 'input-disabled' : ''}
            />
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <Input 
              name="phone"
              value={userData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className={!isEditing ? 'input-disabled' : ''}
            />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <Input 
              type="email"
              name="email"
              value={userData.email}
              onChange={handleChange}
              disabled={!isEditing}
              className={!isEditing ? 'input-disabled' : ''}
            />
          </div>

          <div className="form-group address-section">
            <div className="section-header">
              <label>Endereços Cadastrados</label>
              <button 
                type="button" 
                className="add-link" 
                onClick={() => navigate('/perfil/endereco/novo')}
              >
                + Adicionar
              </button>
            </div>
            
            <div className="addresses-list">
              {sortedAddresses.map(addr => (
                <div 
                  key={addr.id} 
                  className={`address-card ${addr.isMain ? 'main-address' : ''} ${isEditing ? 'is-selectable' : ''}`}
                  onClick={() => handleSetMainAddress(addr.id)}
                >
                  <div className="address-info" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                    {isEditing && (
                      <input 
                        type="radio" 
                        readOnly
                        checked={addr.isMain} 
                        className="address-radio"
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="address-street">{addr.street}</span>
                      {addr.complement && <span className="address-comp">{addr.complement}</span>}
                    </div>
                  </div>
                  {addr.isMain && <span className="main-badge">Principal</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Meio de Pagamento (Principal)</label>
            <Input 
              name="paymentMethod"
              value={userData.paymentMethod}
              onChange={handleChange}
              disabled={!isEditing}
              className={!isEditing ? 'input-disabled' : ''}
            />
          </div>
        </div>

        <div className="profile-actions-bottom">
          <Button variant="text" className="change-password-btn">
            Alterar a senha
          </Button>
        </div>
      </main>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        title="Salvar alterações"
        message="Tem certeza que deseja salvar os novos dados do perfil?"
        confirmText="Salvar"
        onConfirm={confirmSave}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
}
