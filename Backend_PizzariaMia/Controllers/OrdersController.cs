using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.DTOs;
using PizzariaMia.Models;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var order = new Order
            {
                UserId = dto.UserId,
                PaymentMethod = dto.PaymentMethod,
                DeliveryAddress = dto.DeliveryAddress,
                Status = PizzariaMia.Models.Enums.OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            decimal totalAmount = 0;

            foreach (var itemDto in dto.Items)
            {
                var pizza = await _context.Pizzas.FindAsync(itemDto.PizzaId);
                if (pizza == null)
                    return BadRequest($"Pizza com ID {itemDto.PizzaId} não encontrada.");

                var orderItem = new OrderItem
                {
                    PizzaId = itemDto.PizzaId,
                    Quantity = itemDto.Quantity,
                    Crust = itemDto.Crust,
                    Notes = itemDto.Notes,
                    UnitPrice = pizza.Price
                };

                // Calcular acréscimos dos ingredientes adicionados
                decimal additionsPrice = 0;
                if (itemDto.AddedIngredients != null)
                {
                    foreach (var ingredientId in itemDto.AddedIngredients)
                    {
                        var ingredient = await _context.Ingredients.FindAsync(ingredientId);
                        if (ingredient != null)
                        {
                            orderItem.AddedIngredients.Add(ingredient);
                            additionsPrice += ingredient.AdditionalPrice;
                        }
                    }
                }

                // Processar ingredientes removidos (não altera preço normalmente)
                if (itemDto.RemovedIngredients != null)
                {
                    foreach (var ingredientId in itemDto.RemovedIngredients)
                    {
                        var ingredient = await _context.Ingredients.FindAsync(ingredientId);
                        if (ingredient != null)
                        {
                            orderItem.RemovedIngredients.Add(ingredient);
                        }
                    }
                }

                // Calcula o SubTotal (Preço da pizza + Adicionais) * Quantidade
                orderItem.SubTotal = (pizza.Price + additionsPrice) * itemDto.Quantity;
                totalAmount += orderItem.SubTotal;

                order.Items.Add(orderItem);
            }

            order.TotalAmount = totalAmount;

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Pedido criado com sucesso", OrderId = order.Id, TotalAmount = order.TotalAmount });
        }
    }
}
