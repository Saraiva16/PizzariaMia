import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { useWhatsAppNotification } from '../../contexts/WhatsAppNotificationContext';
import {
  Search,
  X,
  Calendar,
  RefreshCw,
  Printer,
  Clock,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Flame,
  Truck,
  Pizza,
  ClipboardList,
  MessageSquare,
  LogOut
} from 'lucide-react';
import './EmployeeOrders.css';

interface OrderItemDetail {
  id: number;
  pizzaId: number;
  pizzaName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  notes?: string;
}

interface EmployeeOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  addressLabel?: string;
  status: 'Pending' | 'Preparing' | 'OutForDelivery' | 'Completed' | 'Canceled' | string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDetail[];
}

interface EmployeeOrdersResponse {
  orders: EmployeeOrder[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  counts: {
    todos: number;
    urgentes: number;
    andamento: number;
    a_caminho: number;
    concluidos: number;
  };
}

type StatusFilterType = 'todos' | 'urgentes' | 'andamento' | 'a_caminho' | 'concluidos';

export default function EmployeeOrders() {
  const navigate = useNavigate();
  const { unreadConversationsCount } = useWhatsAppNotification();
  const [orders, setOrders] = useState<EmployeeOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('todos');
  const [selectedDate, setSelectedDate] = useState<string>(''); // Vazio = Turno atual (corte 3h)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({
    todos: 0,
    urgentes: 0,
    andamento: 0,
    a_caminho: 0,
    concluidos: 0
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<EmployeeOrder | null>(null);
  const [now, setNow] = useState(Date.now());

  // Atualiza o relógio a cada 30 segundos para recalcular urgências em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handlePrintOrder = (order: EmployeeOrder) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getElapsedMinutes = useCallback((dateString: string) => {
    const created = new Date(dateString);
    return Math.floor((now - created.getTime()) / (1000 * 60));
  }, [now]);

  const isUrgentOrder = useCallback((order: EmployeeOrder) => {
    return (order.status === 'Pending' || order.status === 'Preparing') && getElapsedMinutes(order.createdAt) >= 15;
  }, [getElapsedMinutes]);

  // Contagem resiliente de pedidos urgentes ativos (garante exibição mesmo antes de restart do backend)
  const activeUrgentOrdersCount = useMemo(() => {
    const localUrgents = orders.filter((o) =>
      (o.status === 'Pending' || o.status === 'Preparing') && getElapsedMinutes(o.createdAt) >= 15
    ).length;

    const backendUrgents = typeof counts.urgentes === 'number' && !isNaN(counts.urgentes)
      ? counts.urgentes
      : 0;

    return Math.max(backendUrgents, localUrgents);
  }, [counts.urgentes, orders, getElapsedMinutes]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      if (statusFilter !== 'todos') {
        params.append('statusFilter', statusFilter);
      }
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      params.append('page', page.toString());
      params.append('pageSize', '20');

      const response = await api.get<EmployeeOrdersResponse>(`/orders/employee-orders?${params.toString()}`);
      if (response.data) {
        setOrders(response.data.orders || []);
        setPage(response.data.page || 1);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
        if (response.data.counts) {
          setCounts({
            todos: response.data.counts.todos ?? 0,
            urgentes: response.data.counts.urgentes ?? 0,
            andamento: response.data.counts.andamento ?? 0,
            a_caminho: response.data.counts.a_caminho ?? 0,
            concluidos: response.data.counts.concluidos ?? 0
          });
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao carregar lista de pedidos.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, selectedDate, page]);

  // Filtra em memória caso o filtro seja urgentes
  const displayedOrders: EmployeeOrder[] = useMemo(() => {
    if (statusFilter === 'urgentes') {
      return orders.filter(isUrgentOrder);
    }
    return orders;
  }, [orders, statusFilter, isUrgentOrder]);

  // Quando busca, status ou data mudarem, reinicia na primeira página
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, selectedDate]);

  // Recarrega quando os filtros ou busca mudam
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 250); // Debounce de 250ms para digitação suave

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await api.put(`/orders/${orderId}/status`, JSON.stringify(newStatus), {
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success(`Situação do pedido #${orderId} atualizada para ${formatStatusLabel(newStatus)}.`);
      fetchOrders();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao atualizar situação do pedido.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pendente';
      case 'Preparing':
        return 'Em Preparo';
      case 'OutForDelivery':
        return 'A Caminho';
      case 'Completed':
        return 'Concluído';
      case 'Canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Preparing':
        return 'badge-preparing';
      case 'OutForDelivery':
        return 'badge-out-for-delivery';
      case 'Completed':
        return 'badge-completed';
      case 'Canceled':
        return 'badge-canceled';
      default:
        return 'badge-default';
    }
  };

  const formatElapsedTime = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `Há ${diffHours}h ${diffMinutes % 60}m`;
  };

  const storedUser = localStorage.getItem('@PizzariaMia:user');
  let userName = 'Funcionário';
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      userName = parsed.name || userName;
    } catch {
      // fallback
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

  return (
    <div className="employee-orders-container">
      {/* Top Header */}
      <header className="employee-orders-header">
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
            <Pizza size={16} /> Novo Pedido (Cardápio)
          </button>
          <button
            type="button"
            className="nav-tab-btn active"
            onClick={() => navigate('/funcionario/pedidos')}
          >
            <ClipboardList size={16} /> Consultar Pedidos
          </button>
          <button
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate('/funcionario/chat')}
          >
            <MessageSquare size={16} /> WhatsApp Chat
            {unreadConversationsCount > 0 && (
              <span className="nav-tab-unread-badge" title={`${unreadConversationsCount} conversa(s) com mensagens não abertas`}>
                {unreadConversationsCount}
              </span>
            )}
          </button>
        </nav>

        <div className="header-right-controls">
          <ThemeToggle />
          <button type="button" className="logout-header-btn" onClick={handleLogout}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="employee-orders-content">
        <div className="orders-page-title-row">
          <div>
            <h2>Consulta &amp; Situação de Pedidos</h2>
            <p>Localize rapidamente o pedido do cliente por nome, telefone ou endereço.</p>
          </div>
          <button
            type="button"
            className="refresh-orders-btn"
            onClick={fetchOrders}
            title="Atualizar lista"
          >
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>

        {/* Filtros e Barra de Pesquisa */}
        <section className="orders-search-filters-bar">
          <div className="orders-toolbar-row">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="orders-search-input"
                placeholder="Buscar por Nome do Cliente, Telefone, Endereço ou Nº do Pedido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Seletor de Data / Calendário */}
            <div className="orders-calendar-filter">
              <label htmlFor="orders-calendar-input" className="calendar-label" title="Filtrar por data específica">
                <Calendar size={15} /> <span>Data:</span>
              </label>
              <input
                id="orders-calendar-input"
                type="date"
                className="orders-calendar-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Selecione um dia específico no calendário"
              />
              {selectedDate ? (
                <button
                  type="button"
                  className="clear-date-btn"
                  onClick={() => setSelectedDate('')}
                  title="Voltar ao turno operacional atual"
                >
                  <X size={13} /> Voltar ao Turno Atual
                </button>
              ) : (
                <span className="current-shift-indicator" title="Exibindo pedidos do turno operacional atual (reset automático às 03:00)">
                  🟢 Turno Atual (reset às 3h)
                </span>
              )}
            </div>
          </div>

          <div className="status-filters-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setStatusFilter('todos')}
            >
              Todos ({counts.todos})
            </button>
            <button
              type="button"
              className={`filter-pill urgent-filter-pill ${statusFilter === 'urgentes' ? 'active' : ''} ${activeUrgentOrdersCount > 0 ? 'has-urgents' : ''}`}
              onClick={() => setStatusFilter('urgentes')}
              title="Filtrar pedidos com mais de 15 minutos em espera ou preparo"
            >
              <AlertTriangle size={14} /> Urgentes ({activeUrgentOrdersCount})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'andamento' ? 'active' : ''}`}
              onClick={() => setStatusFilter('andamento')}
            >
              <Flame size={14} /> Em Andamento ({counts.andamento})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'a_caminho' ? 'active' : ''}`}
              onClick={() => setStatusFilter('a_caminho')}
            >
              <Truck size={14} /> A Caminho ({counts.a_caminho})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'concluidos' ? 'active' : ''}`}
              onClick={() => setStatusFilter('concluidos')}
            >
              <CheckCircle2 size={14} /> Concluídos ({counts.concluidos})
            </button>
          </div>
        </section>

        {/* Lista de Pedidos */}
        {loading ? (
          <div className="orders-loading-state">
            <div className="spinner"></div>
            <p>Buscando pedidos...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="orders-empty-state">
            <span className="empty-icon">🍕</span>
            <h3>Nenhum pedido encontrado</h3>
            <p>
              {searchQuery
                ? `Nenhum resultado corresponde à busca "${searchQuery}". Tente verificar o nome, telefone ou endereço.`
                : 'Não há pedidos registrados nesta categoria no momento.'}
            </p>
            {searchQuery && (
              <button type="button" className="reset-search-btn" onClick={() => setSearchQuery('')}>
                Limpar Pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="orders-cards-grid">
            {displayedOrders.map((order) => {
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const isUpdating = updatingId === order.id;

              return (
                <div key={order.id} className={`employee-order-card ${isUrgentOrder(order) ? 'urgent-order' : ''}`}>
                  {/* Topo do Card */}
                  <div className="emp-order-card-header">
                    <div className="order-id-time">
                      <div className="order-number-urgency-row">
                        <span className="emp-order-number">Pedido #{order.id}</span>
                        {isUrgentOrder(order) && (
                          <span className="order-urgent-badge" title="Pedido em andamento há mais de 15 minutos!">
                            <AlertTriangle size={13} /> Urgente (+{getElapsedMinutes(order.createdAt)}m)
                          </span>
                        )}
                      </div>
                      <span className="order-timestamp">
                        <Clock size={12} className="timestamp-clock-icon" /> {formattedTime} • {formatElapsedTime(order.createdAt)}
                      </span>
                    </div>

                    <div className="emp-order-header-actions">
                      <button
                        type="button"
                        className="order-print-btn"
                        onClick={() => handlePrintOrder(order)}
                        title="Imprimir Comanda Térmica (80mm)"
                      >
                        <Printer size={14} />
                        <span>Imprimir</span>
                      </button>
                      <span className={`order-status-badge ${getStatusBadgeClass(order.status)}`}>
                        {formatStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  {/* Informações do Cliente */}
                  <div className="order-client-section">
                    <div className="client-data-row">
                      <span className="client-avatar">
                        <User size={16} />
                      </span>
                      <div>
                        <strong className="client-name">{order.customerName}</strong>
                        {order.customerPhone && (
                          <div className="client-phone-row">
                            <span><Phone size={13} /> {order.customerPhone}</span>
                            <button
                              type="button"
                              className="whatsapp-chat-shortcut-btn"
                              onClick={() =>
                                navigate(`/funcionario/chat?phone=${encodeURIComponent(order.customerPhone)}`)
                              }
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageSquare size={13} /> WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {order.items.some((i) => i.pizzaName.includes('WhatsApp')) && (
                      <div
                        className="whatsapp-catalog-alert-box"
                        onClick={() =>
                          navigate(`/funcionario/chat?phone=${encodeURIComponent(order.customerPhone)}`)
                        }
                        title="Clique para abrir o chat e confirmar os sabores"
                      >
                        <AlertTriangle size={15} />
                        <span>Pedido vindo do Catálogo do WhatsApp. Clique aqui para falar com o cliente e confirmar os sabores!</span>
                      </div>
                    )}

                    <div className="client-address-row">
                      <span className="address-icon">
                        <MapPin size={16} />
                      </span>
                      <p className="address-text">
                        <strong>Entrega:</strong> {order.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="order-items-preview">
                    <span className="items-preview-title">
                      Itens ({order.items.reduce((s, i) => s + i.quantity, 0)}):
                    </span>
                    <ul className="items-list">
                      {order.items.map((item) => (
                        <li key={item.id} className="item-row">
                          <span className="item-qty">{item.quantity}x</span>
                          <div className="item-name-notes">
                            <span className="item-name">{item.pizzaName}</span>
                            {item.notes && <span className="item-custom-notes">{item.notes}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Rodapé e Ações do Pedido */}
                  <div className="order-card-footer">
                    <div className="order-finance">
                      <span className="order-total-label">Total a Cobrar</span>
                      <span className="order-total-val">R$ {order.totalAmount.toFixed(2)}</span>
                      <span className="order-payment-method">({order.paymentMethod})</span>
                    </div>

                    {/* Ações de Avanço de Status */}
                    <div className="order-status-actions">
                      {order.status === 'Pending' && (
                        <button
                          type="button"
                          className="status-action-btn preparing-action"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                        >
                          {isUpdating ? 'Salvando...' : 'Iniciar Preparo'}
                        </button>
                      )}

                      {order.status === 'Preparing' && (
                        <button
                          type="button"
                          className="status-action-btn dispatch-action"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'OutForDelivery')}
                        >
                          {isUpdating ? 'Salvando...' : 'Despachar (A Caminho)'}
                        </button>
                      )}

                      {order.status === 'OutForDelivery' && (
                        <button
                          type="button"
                          className="status-action-btn complete-action"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        >
                          {isUpdating ? 'Salvando...' : 'Concluir Entrega'}
                        </button>
                      )}

                      {order.status === 'Completed' && (
                        <span className="status-finished-tag">✓ Pedido Finalizado</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Barra de Paginação (20 por página) */}
        {!loading && totalPages > 1 && (
          <div className="orders-pagination-bar">
            <span className="pagination-info">
              Mostrando {orders.length > 0 ? (page - 1) * 20 + 1 : 0} a{' '}
              {Math.min(page * 20, totalCount)} de <strong>{totalCount}</strong> pedidos
            </span>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={page <= 1}
                onClick={() => {
                  setPage((prev) => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Página anterior"
              >
                &laquo; Anterior
              </button>

              <div className="pagination-pages-indicator">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </div>

              <button
                type="button"
                className="pagination-nav-btn"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((prev) => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Próxima página"
              >
                Próxima &raquo;
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Componente de Impressão Térmica (80mm) visível apenas em @media print */}
      {orderToPrint && (
        <div id="thermal-receipt" className="thermal-receipt-container">
          <div className="receipt-header">
            <h2 className="receipt-title">PIZZARIA MIA</h2>
            <p className="receipt-subtitle">Comanda de Produção &amp; Entrega</p>
            <div className="receipt-divider">================================</div>
            <div className="receipt-meta">
              <div><strong>PEDIDO #{orderToPrint.id}</strong></div>
              <div>Data: {new Date(orderToPrint.createdAt).toLocaleDateString('pt-BR')} {new Date(orderToPrint.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="receipt-divider">--------------------------------</div>
          </div>

          <div className="receipt-customer">
            <div><strong>Cliente:</strong> {orderToPrint.customerName}</div>
            {orderToPrint.customerPhone && (
              <div><strong>Telefone:</strong> {orderToPrint.customerPhone}</div>
            )}
            <div className="receipt-address">
              <strong>Destino:</strong> {orderToPrint.deliveryAddress}
            </div>
            <div className="receipt-divider">--------------------------------</div>
          </div>

          <div className="receipt-items">
            <div className="receipt-items-header">
              <span>QTD  ITEM</span>
              <span>TOTAL</span>
            </div>
            <div className="receipt-divider">- - - - - - - - - - - - - - - -</div>
            {orderToPrint.items.map((it) => (
              <div key={it.id} className="receipt-item-row">
                <div className="receipt-item-main">
                  <strong>{it.quantity}x {it.pizzaName}</strong>
                  {it.notes && <div className="receipt-item-notes">Obs: {it.notes}</div>}
                </div>
                <div className="receipt-item-price">
                  R$ {it.subTotal.toFixed(2)}
                </div>
              </div>
            ))}
            <div className="receipt-divider">--------------------------------</div>
          </div>

          <div className="receipt-totals">
            <div className="receipt-total-row">
              <span>TOTAL A COBRAR:</span>
              <strong>R$ {orderToPrint.totalAmount.toFixed(2)}</strong>
            </div>
            <div className="receipt-payment-row">
              <span>Forma de Pagto:</span>
              <strong>{orderToPrint.paymentMethod}</strong>
            </div>
            <div className="receipt-divider">================================</div>
          </div>

          <div className="receipt-footer">
            <p>Impresso em: {new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Pizzaria Mia • Sabor Incomparável</p>
          </div>
        </div>
      )}
    </div>
  );
}
