import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';
import './NewOrderModal.css';

export interface AddressItem {
  id: number;
  label: string;
  streetAndNumber: string;
  isMain: boolean;
}

export interface ClientData {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  addresses?: AddressItem[];
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: ClientData) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onSelectClient
}) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundClients, setFoundClients] = useState<ClientData[]>([]);

  // Estados para o pré-cadastro rápido
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = value;
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }

    setPhone(formatted);
    setSearched(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 8) {
      toast.error('Por favor, informe um número de telefone válido.');
      return;
    }

    try {
      setLoading(true);
      setSearched(false);
      const response = await api.get<ClientData[]>(`/users/search?query=${encodeURIComponent(phone)}`);
      setFoundClients(response.data || []);
      setSearched(true);

      if (response.data && response.data.length > 0) {
        toast.success(`Cliente encontrado: ${response.data[0].name}`);
      } else {
        toast.info('Nenhum cadastro encontrado. Preencha o pré-cadastro abaixo.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao consultar cliente no sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Por favor, informe o nome do cliente.');
      return;
    }

    try {
      setIsRegistering(true);
      const response = await api.post<ClientData>('/users/quick-register', {
        name: newName.trim(),
        phone,
        address: newAddress.trim() || undefined
      });

      toast.success(`Cliente ${response.data.name} cadastrado com sucesso!`);
      onSelectClient(response.data);
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao realizar pré-cadastro.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleConfirmClient = (client: ClientData) => {
    onSelectClient(client);
    handleClose();
  };

  const handleClose = () => {
    setPhone('');
    setNewName('');
    setNewAddress('');
    setSearched(false);
    setFoundClients([]);
    onClose();
  };

  return (
    <div className="new-order-modal-overlay" onClick={handleClose}>
      <div className="new-order-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-order-modal-header">
          <h2>Novo Pedido - Identificar Cliente</h2>
          <button className="new-order-close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>

        {!searched || foundClients.length > 0 ? (
          <form className="new-order-form" onSubmit={handleSearch}>
            <label className="new-order-label">Telefone do Cliente</label>
            <div className="new-order-input-row">
              <input
                type="tel"
                className="new-order-input"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                autoFocus
                required
              />
              <button
                type="submit"
                className="new-order-search-btn"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>
        ) : null}

        {searched && foundClients.length > 0 && (
          <div className="new-order-client-card">
            <div className="new-order-client-info">
              <h4>{foundClients[0].name}</h4>
              <p><strong>Telefone:</strong> {foundClients[0].phone || phone}</p>
              {foundClients[0].email && <p><strong>Email:</strong> {foundClients[0].email}</p>}
            </div>

            {foundClients[0].addresses && foundClients[0].addresses.length > 0 && (
              <div className="new-order-addresses-list">
                <strong>Endereços cadastrados:</strong>
                <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                  {foundClients[0].addresses.map((addr) => (
                    <li key={addr.id}>
                      {addr.label ? `${addr.label}: ` : ''}{addr.streetAndNumber}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              className="new-order-select-client-btn"
              onClick={() => handleConfirmClient(foundClients[0])}
            >
              Iniciar Pedido com este Cliente
            </button>
          </div>
        )}

        {searched && foundClients.length === 0 && (
          <div className="new-order-quick-register">
            <div className="new-order-quick-register-header">
              <h3>Cliente Não Encontrado</h3>
              <p>Preencha os dados abaixo para o pré-cadastro e siga com o pedido:</p>
            </div>

            <form onSubmit={handleQuickRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="new-order-field">
                <label>Telefone</label>
                <input type="text" value={phone} disabled />
              </div>

              <div className="new-order-field">
                <label>Nome do Cliente *</label>
                <input
                  type="text"
                  placeholder="Ex: Maria da Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="new-order-field">
                <label>Endereço de Entrega</label>
                <input
                  type="text"
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div className="new-order-actions-row">
                <button
                  type="button"
                  className="new-order-back-btn"
                  onClick={() => setSearched(false)}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="new-order-submit-register-btn"
                  disabled={isRegistering}
                >
                  {isRegistering ? 'Cadastrando...' : 'Cadastrar e Iniciar Pedido'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewOrderModal;
