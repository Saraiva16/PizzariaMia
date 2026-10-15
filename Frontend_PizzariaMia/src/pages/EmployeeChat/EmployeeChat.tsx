import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import './EmployeeChat.css';

interface ChatConversation {
  remoteJid: string;
  phone: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageFromMe: boolean;
  unread: boolean;
  activeOrderId?: number;
  activeOrderStatus?: string;
  activeOrderTotal?: number;
}

interface ChatMessage {
  id: number;
  remoteJid: string;
  senderPhone: string;
  senderName: string;
  text: string;
  fromMe: boolean;
  messageType: string;
  timestamp: string;
}

export default function EmployeeChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetPhoneParam = searchParams.get('phone');

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carrega lista de conversas
  const fetchConversations = useCallback(async (selectPhone?: string) => {
    try {
      setLoadingConversations(true);
      const response = await api.get<ChatConversation[]>('/chat/conversations');
      const list = response.data || [];
      setConversations(list);

      // Se houver um telefone alvo (da URL ou do parâmetro)
      const phoneToSelect = selectPhone || targetPhoneParam;
      if (phoneToSelect) {
        const clean = phoneToSelect.replace(/\D/g, '');
        const found = list.find((c) => c.phone.replace(/\D/g, '') === clean);
        if (found) {
          setSelectedConversation(found);
        } else {
          // Cria conversa temporária na tela para poder responder diretamente
          const tempConv: ChatConversation = {
            remoteJid: `${clean}@s.whatsapp.net`,
            phone: clean,
            name: `Cliente ${clean}`,
            lastMessage: 'Iniciar conversa...',
            lastMessageTime: new Date().toISOString(),
            lastMessageFromMe: false,
            unread: false
          };
          setSelectedConversation(tempConv);
        }
      } else if (!selectedConversation && list.length > 0) {
        setSelectedConversation(list[0]);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao carregar conversas do WhatsApp.');
    } finally {
      setLoadingConversations(false);
    }
  }, [targetPhoneParam]);

  // Carrega mensagens da conversa selecionada
  const fetchMessages = useCallback(async (phone: string) => {
    try {
      setLoadingMessages(true);
      const response = await api.get<ChatMessage[]>(`/chat/messages?phone=${encodeURIComponent(phone)}`);
      setMessages(response.data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao carregar histórico de mensagens.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phone);
    }
  }, [selectedConversation, fetchMessages]);

  // Referência para acessar conversa selecionada dentro dos listeners do SignalR
  const selectedConversationRef = useRef<ChatConversation | null>(null);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Conexão SignalR em Tempo Real para Mensagens do WhatsApp (Zero Polling)
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5210/orderTrackingHub')
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        // Conexão WebSocket estabelecida com sucesso
      })
      .catch((err) => {
        console.warn('Falha ao conectar ao SignalR para chat:', err);
      });

    connection.on('NewWhatsAppMessage', (newMsg: ChatMessage) => {
      const currentSelected = selectedConversationRef.current;
      const normalize = (p?: string) => (p || '').replace(/\D/g, '');
      const msgPhone = normalize(newMsg.senderPhone || newMsg.remoteJid.split('@')[0]);

      // Se a mensagem pertencer à conversa atualmente aberta
      if (currentSelected && normalize(currentSelected.phone) === msgPhone) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }

      // Atualiza ou reposiciona a conversa na lista lateral
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => normalize(c.phone) === msgPhone);
        const timeFormatted = new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let updatedConv: ChatConversation;
        if (existingIndex >= 0) {
          updatedConv = {
            ...prev[existingIndex],
            lastMessage: newMsg.text,
            lastMessageTime: timeFormatted,
            lastMessageFromMe: newMsg.fromMe,
            unread: currentSelected && normalize(currentSelected.phone) === msgPhone ? false : true
          };
        } else {
          updatedConv = {
            remoteJid: newMsg.remoteJid,
            phone: msgPhone,
            name: newMsg.senderName || 'Cliente',
            lastMessage: newMsg.text,
            lastMessageTime: timeFormatted,
            lastMessageFromMe: newMsg.fromMe,
            unread: true
          };
        }

        const remaining = prev.filter((_, idx) => idx !== existingIndex);
        return [updatedConv, ...remaining];
      });
    });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedConversation || isSending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');

    try {
      setIsSending(true);
      const response = await api.post('/chat/send', {
        phone: selectedConversation.phone,
        text: textToSend
      });

      if (response.data && response.data.data) {
        setMessages((prev) => [...prev, response.data.data]);
        setTimeout(scrollToBottom, 50);
      }
      fetchConversations(selectedConversation.phone);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Falha ao enviar mensagem pelo WhatsApp.');
      setInputMessage(textToSend); // restaura o texto se falhar
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchContact.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastMessage.toLowerCase().includes(q);
  });

  const storedUser = localStorage.getItem('@PizzariaMia:user');
  let userName = 'Funcionário';
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      userName = parsed.name || userName;
    } catch {
      // ignore
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('@PizzariaMia:token');
    localStorage.removeItem('@PizzariaMia:user');
    localStorage.removeItem('employeeSelectedClient');
    localStorage.removeItem('employeeOrderItems');
    localStorage.removeItem('employeePizzaVariations');
    navigate('/');
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="employee-chat-page">
      {/* Top Header */}
      <header className="employee-chat-header">
        <div className="header-brand-box">
          <h1>Pizzaria <span>Mia</span> - Atendimento</h1>
          <span className="user-greeting">Olá, {userName}</span>
        </div>

        {/* Abas de Navegação Principal */}
        <nav className="employee-nav-tabs">
          <button
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate('/funcionario/cardapio')}
          >
            🍕 Novo Pedido (Cardápio)
          </button>
          <button
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate('/funcionario/pedidos')}
          >
            📋 Consultar Pedidos
          </button>
          <button
            type="button"
            className="nav-tab-btn active"
            onClick={() => navigate('/funcionario/chat')}
          >
            💬 WhatsApp Chat
          </button>
        </nav>

        <div className="header-right-controls">
          <ThemeToggle />
          <button type="button" className="logout-header-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {/* WhatsApp Web Container */}
      <div className="whatsapp-web-container">
        {/* Painel Esquerdo: Lista de Conversas */}
        <aside className="chat-sidebar">
          <div className="sidebar-top-bar">
            <h2>Mensagens WhatsApp</h2>
            <button
              type="button"
              className="refresh-chat-btn"
              onClick={() => fetchConversations()}
              title="Atualizar conversas"
            >
              🔄
            </button>
          </div>

          <div className="sidebar-search-box">
            <input
              type="text"
              placeholder="Pesquisar conversa ou número..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
            />
          </div>

          <div className="conversations-scroll-list">
            {loadingConversations ? (
              <div className="chat-loading-placeholder">
                <div className="chat-spinner"></div>
                <span>Carregando conversas...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="chat-empty-conversations">
                <span>💬</span>
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.phone === conv.phone;

                return (
                  <div
                    key={conv.phone}
                    className={`conversation-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="contact-avatar">
                      {conv.name.charAt(0).toUpperCase() || '👤'}
                    </div>

                    <div className="conversation-details">
                      <div className="conversation-row-top">
                        <span className="contact-name">{conv.name}</span>
                        <span className="last-msg-time">{formatMessageTime(conv.lastMessageTime)}</span>
                      </div>

                      <div className="conversation-row-bottom">
                        <p className="last-msg-preview">
                          {conv.lastMessageFromMe && <span className="double-check">✓✓ </span>}
                          {conv.lastMessage}
                        </p>
                        {conv.activeOrderId && (
                          <span className="active-order-pill" title="Pedido em andamento">
                            🍕 #{conv.activeOrderId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Painel Direito: Janela de Conversa Ativa */}
        <section className="chat-main-window">
          {selectedConversation ? (
            <>
              {/* Header da Conversa Ativa */}
              <div className="chat-active-header">
                <div className="chat-contact-info">
                  <div className="active-contact-avatar">
                    {selectedConversation.name.charAt(0).toUpperCase() || '👤'}
                  </div>
                  <div>
                    <h3 className="active-contact-name">{selectedConversation.name}</h3>
                    <span className="active-contact-phone">📞 {selectedConversation.phone}</span>
                  </div>
                </div>

                {selectedConversation.activeOrderId && (
                  <div className="active-order-banner">
                    <span className="order-banner-title">
                      🍕 <strong>Pedido #{selectedConversation.activeOrderId}</strong> (R${' '}
                      {selectedConversation.activeOrderTotal?.toFixed(2)})
                    </span>
                    <button
                      type="button"
                      className="goto-order-btn"
                      onClick={() => navigate(`/funcionario/pedidos`)}
                    >
                      Ver Pedido &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* Área de Rolagem de Mensagens */}
              <div className="chat-messages-container">
                {loadingMessages ? (
                  <div className="chat-loading-placeholder">
                    <div className="chat-spinner"></div>
                    <span>Carregando histórico...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-no-messages">
                    <span className="bubble-icon">💬</span>
                    <h4>Inicie a conversa com {selectedConversation.name}</h4>
                    <p>
                      Envie uma mensagem abaixo para confirmar os sabores da pizza, adicionais e o endereço de
                      entrega.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOrder = msg.messageType === 'order' || msg.text.includes('Carrinho');

                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-wrapper ${msg.fromMe ? 'sent' : 'received'}`}
                      >
                        <div className={`message-bubble ${isOrder ? 'order-bubble' : ''}`}>
                          {isOrder && <div className="order-bubble-header">🛒 Pedido do Catálogo</div>}
                          <p className="message-text">{msg.text}</p>
                          <div className="message-meta">
                            <span className="message-timestamp">{formatMessageTime(msg.timestamp)}</span>
                            {msg.fromMe && <span className="double-check-blue">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Envio de Mensagem */}
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <textarea
                  className="chat-textarea"
                  placeholder="Digite sua mensagem para o cliente... (Pressione Enter para enviar)"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  autoFocus
                />
                <button
                  type="submit"
                  className="send-message-btn"
                  disabled={isSending || !inputMessage.trim()}
                  title="Enviar mensagem"
                >
                  {isSending ? '...' : '➤'}
                </button>
              </form>
            </>
          ) : (
            <div className="no-conversation-selected">
              <span className="whatsapp-big-icon">💬</span>
              <h3>WhatsApp da Pizzaria Mia</h3>
              <p>Selecione uma conversa à esquerda ou clique em "Conversar no WhatsApp" em qualquer pedido para atender o cliente.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
