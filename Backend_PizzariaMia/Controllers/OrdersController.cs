using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs;
using PizzariaMia.Models;
using PizzariaMia.Models.Enums;
using PizzariaMia.Repositories;
using System.Security.Claims;

using Microsoft.AspNetCore.SignalR;
using PizzariaMia.Hubs;
using Microsoft.EntityFrameworkCore;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requires JWT
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IPizzaRepository _pizzaRepository;
        private readonly IHubContext<OrderTrackingHub> _hubContext;
        private readonly PizzariaMia.Data.AppDbContext _context;
        private readonly PizzariaMia.Services.IBotStateService _botState;

        public OrdersController(
            IOrderRepository orderRepository,
            IPizzaRepository pizzaRepository,
            IHubContext<OrderTrackingHub> hubContext,
            PizzariaMia.Data.AppDbContext context,
            PizzariaMia.Services.IBotStateService botState)
        {
            _orderRepository = orderRepository;
            _pizzaRepository = pizzaRepository;
            _hubContext = hubContext;
            _context = context;
            _botState = botState;
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CheckoutDto model)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            // Se for funcionário ou administrador e model.UserId for informado, vincula o pedido ao cliente
            int targetUserId = userId;
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            if ((userRole == "Employee" || userRole == "Admin") && model.UserId.HasValue && model.UserId.Value > 0)
            {
                targetUserId = model.UserId.Value;
            }

            var targetUser = await _context.Users.FindAsync(targetUserId);

            if (model.Items == null || !model.Items.Any())
                return BadRequest(new { error = "O carrinho está vazio." });

            decimal totalAmount = 12.00m; // Default delivery fee
            var orderItems = new List<OrderItem>();

            foreach (var item in model.Items)
            {
                var pizza = await _pizzaRepository.GetByIdAsync(item.PizzaId);
                if (pizza == null)
                    return BadRequest(new { error = $"Pizza com ID {item.PizzaId} não encontrada." });

                var itemTotal = pizza.Price * item.Quantity;
                totalAmount += itemTotal;

                orderItems.Add(new OrderItem
                {
                    PizzaId = pizza.Id,
                    Quantity = item.Quantity,
                    UnitPrice = pizza.Price,
                    SubTotal = itemTotal,
                    Notes = item.Customization
                });
            }

            // Resolução do Endereço de Entrega
            Address? address = null;
            if (model.AddressId.HasValue && model.AddressId.Value > 0)
            {
                address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == model.AddressId && a.UserId == targetUserId);
            }

            if (address == null && !string.IsNullOrWhiteSpace(model.DeliveryAddress))
            {
                address = new Address
                {
                    UserId = targetUserId,
                    Label = "Entrega Pedido Atendimento",
                    StreetAndNumber = model.DeliveryAddress.Trim(),
                    IsMain = true
                };
                _context.Addresses.Add(address);
                await _context.SaveChangesAsync();
            }
            else if (address == null)
            {
                address = await _context.Addresses.FirstOrDefaultAsync(a => a.UserId == targetUserId);
            }

            var order = new Order
            {
                UserId = targetUserId,
                CustomerName = targetUser?.Name,
                CustomerPhone = targetUser?.Phone,
                AddressId = address?.Id,
                PaymentMethod = model.PaymentMethod,
                TotalAmount = totalAmount,
                Status = OrderStatus.Pending,
                Items = orderItems
            };

            await _orderRepository.AddAsync(order);

            // Phase 4: Trigger a SignalR event to the kitchen (or just track immediately)
            await _hubContext.Clients.Group($"Order_{order.Id}").SendAsync("StatusChanged", order.Status.ToString());

            return Ok(new OrderResponseDto
            {
                Id = order.Id,
                TotalAmount = order.TotalAmount,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt
            });
        }

        [HttpPut("{id}/status")]
        // In a real app, only Admin/Kitchen roles can access this.
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string newStatusStr)
        {
            if (!Enum.TryParse(newStatusStr, out OrderStatus newStatus))
                return BadRequest("Status inválido.");

            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
                return NotFound();

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;
            await _orderRepository.UpdateAsync(order);

            // Se o pedido foi concluído ou cancelado, libera a máquina de estados do bot para novo pedido
            if (newStatus == OrderStatus.Completed || newStatus == OrderStatus.Canceled)
            {
                try
                {
                    var user = await _context.Users.FindAsync(order.UserId);
                    if (user != null && !string.IsNullOrWhiteSpace(user.Phone))
                    {
                        string cleanPhone = user.Phone.Replace("+", "").Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Trim();
                        string remoteJid = $"{cleanPhone}@s.whatsapp.net";
                        await _botState.ClearUserStepAsync(remoteJid);
                    }
                }
                catch { }
            }

            // Dispara WebSockets em tempo real para o front-end
            await _hubContext.Clients.Group($"Order_{order.Id}").SendAsync("StatusChanged", order.Status.ToString());

            return Ok(new { message = "Status atualizado", status = order.Status.ToString() });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrder(int id)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            // Usando o contexto para carregar navegações (Items.Pizza e Address)
            var order = await _context.Orders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Pizza)
                .Include(o => o.Address)
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

            if (order == null)
                return NotFound();

            var items = order.Items.Select(i => new
            {
                quantity = i.Quantity,
                pizzaName = i.Pizza.Name,
                notes = i.Notes
            }).ToList();

            var addressLabel = order.Address != null 
                ? new { label = order.Address.Label, street = order.Address.StreetAndNumber } 
                : null;

            return Ok(new
            {
                id = order.Id,
                status = order.Status.ToString(),
                createdAt = order.CreatedAt,
                updatedAt = order.UpdatedAt,
                total = order.TotalAmount,
                address = addressLabel,
                items = items
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            // Typically we'd have a method in IOrderRepository: _orderRepository.GetOrdersByUserIdAsync(userId)
            // But since IRepository has GetAllAsync, we'll do a simple filter.
            var allOrders = await _orderRepository.GetAllAsync();
            var myOrders = allOrders.Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt)
                .Select(o => new OrderResponseDto
                {
                    Id = o.Id,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status.ToString(),
                    CreatedAt = o.CreatedAt
                }).ToList();

            return Ok(myOrders);
        }

        [HttpGet("employee-orders")]
        [Authorize(Roles = "Employee,Admin")]
        public async Task<IActionResult> GetEmployeeOrders(
            [FromQuery] string? query,
            [FromQuery] string? statusFilter,
            [FromQuery] string? date,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var baseOrdersQuery = _context.Orders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Pizza)
                .Include(o => o.Address)
                .Include(o => o.User)
                .AsQueryable();

            // 1. Regra de Data / Turno Operacional (corte diário às 03:00 da manhã)
            if (!string.IsNullOrWhiteSpace(date))
            {
                // Se uma data específica foi informada pelo calendário (formato YYYY-MM-DD)
                if (DateTime.TryParse(date, out DateTime selectedDay))
                {
                    // Considera o dia selecionado no fuso horário de Brasília (UTC-3: 00:00 BR = 03:00 UTC)
                    var dayStartUtc = DateTime.SpecifyKind(selectedDay.Date, DateTimeKind.Utc).AddHours(3);
                    var dayEndUtc = dayStartUtc.AddDays(1).AddTicks(-1);
                    baseOrdersQuery = baseOrdersQuery.Where(o => o.CreatedAt >= dayStartUtc && o.CreatedAt <= dayEndUtc);
                }
            }
            else
            {
                // Turno Atual (Padrão): Limpa pedidos concluídos/cancelados do expediente anterior às 03:00 da manhã
                var brNow = DateTime.UtcNow.AddHours(-3);
                DateTime shiftStartBr = brNow.Hour < 3 
                    ? brNow.Date.AddDays(-1).AddHours(3) 
                    : brNow.Date.AddHours(3);
                DateTime shiftStartUtc = shiftStartBr.AddHours(3);

                // Pedidos ativos continuam visíveis, mas pedidos já concluídos ou cancelados de antes das 3h somem
                baseOrdersQuery = baseOrdersQuery.Where(o => 
                    (o.Status != OrderStatus.Completed && o.Status != OrderStatus.Canceled) || 
                    o.CreatedAt >= shiftStartUtc);
            }

            // 2. Filtro por termo de busca (nome, telefone, endereço ou ID do pedido)
            if (!string.IsNullOrWhiteSpace(query))
            {
                var lowerQuery = query.Trim().ToLower();
                baseOrdersQuery = baseOrdersQuery.Where(o =>
                    (o.CustomerName != null && o.CustomerName.ToLower().Contains(lowerQuery)) ||
                    (o.User != null && o.User.Name.ToLower().Contains(lowerQuery)) ||
                    (o.CustomerPhone != null && o.CustomerPhone.Contains(lowerQuery)) ||
                    (o.User != null && o.User.Phone.Contains(lowerQuery)) ||
                    (o.Address != null && o.Address.StreetAndNumber.ToLower().Contains(lowerQuery)) ||
                    o.Id.ToString().Contains(lowerQuery)
                );
            }

            // 3. Contadores para as abas de status (calculados antes de filtrar por status específico)
            var totalCount = await baseOrdersQuery.CountAsync();
            var inProgressCount = await baseOrdersQuery.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Preparing);
            var outForDeliveryCount = await baseOrdersQuery.CountAsync(o => o.Status == OrderStatus.OutForDelivery);
            var completedCount = await baseOrdersQuery.CountAsync(o => o.Status == OrderStatus.Completed);

            // 4. Aplica o filtro de status selecionado
            var ordersQuery = baseOrdersQuery;
            if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter.ToLower() != "todos")
            {
                var sf = statusFilter.ToLower();
                if (sf == "andamento" || sf == "in_progress")
                {
                    ordersQuery = ordersQuery.Where(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Preparing);
                }
                else if (sf == "a_caminho" || sf == "out_for_delivery")
                {
                    ordersQuery = ordersQuery.Where(o => o.Status == OrderStatus.OutForDelivery);
                }
                else if (sf == "concluidos" || sf == "completed")
                {
                    ordersQuery = ordersQuery.Where(o => o.Status == OrderStatus.Completed);
                }
            }

            // 5. Paginação de 20 itens por página
            pageSize = pageSize <= 0 ? 20 : pageSize;
            var filteredTotalCount = await ordersQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(filteredTotalCount / (double)pageSize);
            page = Math.Max(1, page);

            var orders = await ordersQuery
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = orders.Select(o => new
            {
                id = o.Id,
                customerName = o.CustomerName ?? o.User?.Name ?? "Cliente Balcão",
                customerPhone = o.CustomerPhone ?? o.User?.Phone ?? "",
                deliveryAddress = o.Address?.StreetAndNumber ?? "Retirada no Balcão",
                addressLabel = o.Address?.Label,
                status = o.Status.ToString(),
                totalAmount = o.TotalAmount,
                paymentMethod = o.PaymentMethod.ToString(),
                createdAt = o.CreatedAt,
                updatedAt = o.UpdatedAt,
                items = o.Items.Select(i => new
                {
                    id = i.Id,
                    pizzaId = i.PizzaId,
                    pizzaName = i.Pizza != null ? i.Pizza.Name : $"Pizza #{i.PizzaId}",
                    quantity = i.Quantity,
                    unitPrice = i.UnitPrice,
                    subTotal = i.SubTotal,
                    notes = i.Notes
                }).ToList()
            });

            return Ok(new
            {
                orders = result,
                page,
                pageSize,
                totalCount = filteredTotalCount,
                totalPages,
                counts = new
                {
                    todos = totalCount,
                    andamento = inProgressCount,
                    a_caminho = outForDeliveryCount,
                    concluidos = completedCount
                }
            });
        }
    }
}
