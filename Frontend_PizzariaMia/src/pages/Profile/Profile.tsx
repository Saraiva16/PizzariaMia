import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../shared/Input/Input';
import { Button } from '../../shared/Button/Button';
import ConfirmModal from '../../shared/ConfirmModal/ConfirmModal';
import './Profile.css';
import api from '../../services/api';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const [userData, setUserData] = useState({
    name: '',
    phone: '',
    email: '', // Not used in backend yet
    addresses: [] as any[],
    paymentMethod: 'PIX'
  });

  const fetchData = async () => {
    try {
      const [meRes, addrRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/addresses')
      ]);
      setUserData(prev => ({
        ...prev,
        name: meRes.data.name,
        phone: meRes.data.phone,
        addresses: addrRes.data.map((a: any) => ({
          id: a.id,
          street: a.streetAndNumber,
          label: a.label,
          isMain: a.isMain
        }))
      }));
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error('Erro ao carregar perfil.');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetMainAddress = async (id: number) => {
    if (!isEditing) return;
    
    const targetAddr = userData.addresses.find(a => a.id === id);
    if (!targetAddr) return;

    try {
      await api.put(`/addresses/${id}`, {
        label: targetAddr.label,
        streetAndNumber: targetAddr.street,
        isMain: true
      });
      fetchData(); // Reload addresses to get correct Main
      toast.success('Endereço principal atualizado.');
    } catch {
      toast.error('Erro ao atualizar endereço.');
    }
  };

  const handleRemoveAddress = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.delete(`/addresses/${id}`);
      fetchData();
      toast.success('Endereço removido.');
    } catch {
      toast.error('Erro ao remover endereço.');
    }
  };

  const handleSaveClick = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmSave = () => {
    // Only saves profile name/phone, not addresses
    setIsEditing(false);
    setIsConfirmModalOpen(false);
    toast.success('Perfil atualizado com sucesso!');
  };

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
                  <div className="address-info" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                    {isEditing && (
                      <input 
                        type="radio" 
                        readOnly
                        checked={addr.isMain} 
                        className="address-radio"
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <span className="address-street"><strong>{addr.label}</strong></span>
                      <span className="address-comp">{addr.street}</span>
                    </div>
                    {isEditing && (
                      <button 
                        className="btn-remove-address" 
                        onClick={(e) => handleRemoveAddress(e, addr.id)}
                        title="Remover"
                        style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0.5rem' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  {addr.isMain && !isEditing && <span className="main-badge">Principal</span>}
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
