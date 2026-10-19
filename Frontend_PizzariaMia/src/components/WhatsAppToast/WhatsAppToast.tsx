import React, { useEffect, useState } from 'react';
import './WhatsAppToast.css';

export type WhatsAppToastData = {
  id: string;
  senderPhone: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface WhatsAppToastProps {
  toast: WhatsAppToastData | null;
  onClose: () => void;
  onOpenChat: (phone: string) => void;
}

export const WhatsAppToast: React.FC<WhatsAppToastProps> = ({ toast, onClose, onOpenChat }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!toast) return;

    setIsClosing(false);
    // Fecha automaticamente após 6.5 segundos
    const timer = setTimeout(() => {
      handleClose();
    }, 6500);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Aguarda animação de saída
  };

  const handleOpen = () => {
    onOpenChat(toast.senderPhone);
    handleClose();
  };

  // Formata o número de telefone se for padrão BR (ex: 5511991374020)
  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13 && clean.startsWith('55')) {
      return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  return (
    <div
      className={`whatsapp-steam-toast ${isClosing ? 'toast-fade-out' : 'toast-slide-in'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-header">
        <div className="toast-brand">
          <span className="toast-wa-icon">💬</span>
          <span className="toast-app-name">WhatsApp • Pizzaria Mia</span>
        </div>
        <button
          type="button"
          className="toast-close-btn"
          onClick={handleClose}
          title="Fechar notificação"
        >
          &times;
        </button>
      </div>

      <div className="toast-body" onClick={handleOpen}>
        <div className="toast-client-info">
          <span className="toast-client-name">{toast.senderName || 'Cliente'}</span>
          <span className="toast-client-phone">{formatPhone(toast.senderPhone)}</span>
        </div>
        <p className="toast-message-preview">{toast.text}</p>
      </div>

      <div className="toast-actions">
        <button type="button" className="toast-open-chat-btn" onClick={handleOpen}>
          💬 Abrir Conversa
        </button>
      </div>

      <div className="toast-progress-bar">
        <div className="toast-progress-fill"></div>
      </div>
    </div>
  );
};
