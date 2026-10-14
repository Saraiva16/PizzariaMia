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

        public OrdersController(IOrderRepository orderRepository, IPizzaRepository pizzaRepository, IHubContext<OrderTrackingHub> hubContext, PizzariaMia.Data.AppDbContext context)
        {
            _orderRepository = orderRepository;
            _pizzaRepository = pizzaRepository;
            _hubContext = hubContext;
            _context = context;
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
    }
}
