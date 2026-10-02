using System.ComponentModel.DataAnnotations;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.DTOs
{
    public class CreateOrderDto
    {
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public PaymentMethod PaymentMethod { get; set; }
        
        public string? DeliveryAddress { get; set; }
        
        [Required]
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}
