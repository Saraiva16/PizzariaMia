import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import api, { HUB_URL } from '../services/api';
import { playWhatsAppNotificationSound } from '../services/audioNotification';
import { WhatsAppToast, type WhatsAppToastData } from '../components/WhatsAppToast/WhatsAppToast';

interface WhatsAppNotificationContextData {
  unreadConversationsCount: number;
  fetchUnreadCount: () => Promise<void>;
  markConversationAsRead: (phone: string) => Promise<void>;
  clearActiveToast: () => void;
}

const WhatsAppNotificationContext = createContext<WhatsAppNotificationContextData>({} as WhatsAppNotificationContextData);

interface IncomingSignalRMessage {
  id: number;
  remoteJid: string;
  senderPhone: string;
  senderName: string;
  text: string;
  fromMe: boolean;
  messageType: string;
  timestamp: string;
  isRead?: boolean;
}

export const WhatsAppNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadConversationsCount, setUnreadConversationsCount] = useState<number>(0);
  const [activeToast, setActiveToast] = useState<WhatsAppToastData | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const clearActiveToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Verifica se o usuário autenticado atual é Funcionário ou Admin
  const isEmployeeUser = useCallback(() => {
    const stored = localStorage.getItem('@PizzariaMia:user');
    if (!stored) return false;
    try {
      const user = JSON.parse(stored);
      return user.role === 'Employee' || user.role === 'Admin';
    } catch {
      return false;
    }
  }, []);

  // Busca do backend a quantidade exata de conversas com mensagens pendentes (SEM tocar som)
  const fetchUnreadCount = useCallback(async () => {
    if (!isEmployeeUser()) return;
    try {
      const response = await api.get<{ count: number }>('/chat/unread-count');
      if (typeof response.data?.count === 'number') {
        setUnreadConversationsCount(response.data.count);
      }
    } catch (err) {
      console.warn('[WhatsAppNotification] Erro ao carregar contagem de conversas não lidas:', err);
    }
  }, [isEmployeeUser]);

  // Marca todas as mensagens de um cliente como lidas e atualiza o selo
  const markConversationAsRead = useCallback(async (phone: string) => {
    if (!phone || !isEmployeeUser()) return;
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      await api.post('/chat/mark-read', { phone: cleanPhone });
      // Decrementa de forma otimista caso ainda não tenha recebido evento SignalR
      setUnreadConversationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('[WhatsAppNotification] Erro ao marcar conversa como lida:', err);
    }
  }, [isEmployeeUser]);

  // Carrega contagem inicial ao montar o componente (apenas inicialização visual, zero som)
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Conexão SignalR Global para Telas de Atendimento (Zero Polling)
  useEffect(() => {
    if (!isEmployeeUser()) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.start()
      .then(() => {
        // Conectado ao Hub com sucesso
      })
      .catch((err) => {
        console.warn('[WhatsAppNotification] Falha ao conectar ao SignalR:', err);
      });

    // Evento disparado quando qualquer mensagem de WhatsApp é recebida ou enviada
    connection.on('NewWhatsAppMessage', (msg: IncomingSignalRMessage) => {
      // Se a mensagem veio do cliente (não é do bot nem de atendente)
      if (!msg.fromMe) {
        const isChatRoute = window.location.pathname.toLowerCase().startsWith('/funcionario/chat');

        // Em /funcionario/chat, não emite som e não exibe Toast flutuante
        if (!isChatRoute) {
          // 1. Toca o som cristalino (protegido contra rajadas por throttle de 1.5s)
          playWhatsAppNotificationSound();

          // 2. Exibe o toast no canto inferior direito estilo Steam
          const toastItem: WhatsAppToastData = {
            id: `${msg.id}-${Date.now()}`,
            senderPhone: msg.senderPhone || msg.remoteJid.split('@')[0],
            senderName: msg.senderName || 'Cliente',
            text: msg.text || 'Nova mensagem recebida',
            timestamp: msg.timestamp || new Date().toISOString()
          };
          setActiveToast(toastItem);
        }

        // 3. Atualiza o contador de conversas não lidas em segundo plano
        fetchUnreadCount();
      }
    });

    // Evento disparado pelo backend quando uma conversa é marcada como lida
    connection.on('WhatsAppUnreadCountUpdated', (data: { count: number; phone: string }) => {
      if (typeof data?.count === 'number') {
        setUnreadConversationsCount(data.count);
      }
    });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, [isEmployeeUser, fetchUnreadCount]);

  // Ação ao clicar no toast para abrir o chat
  const handleOpenChat = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    window.location.href = `/funcionario/chat?phone=${encodeURIComponent(clean)}`;
  };

  return (
    <WhatsAppNotificationContext.Provider
      value={{
        unreadConversationsCount,
        fetchUnreadCount,
        markConversationAsRead,
        clearActiveToast
      }}
    >
      {children}
      {/* Toast flutuante no canto inferior direito (suprimido na rota de chat) */}
      {!window.location.pathname.toLowerCase().startsWith('/funcionario/chat') && (
        <WhatsAppToast
          toast={activeToast}
          onClose={() => setActiveToast(null)}
          onOpenChat={handleOpenChat}
        />
      )}
    </WhatsAppNotificationContext.Provider>
  );
};

export function useWhatsAppNotification(): WhatsAppNotificationContextData {
  return useContext(WhatsAppNotificationContext);
}
