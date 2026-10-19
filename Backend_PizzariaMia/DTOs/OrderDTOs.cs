using System.ComponentModel.DataAnnotations;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.DTOs
{
    public class CheckoutDto
    {
        public int? UserId { get; set; }
        public int? AddressId { get; set; }
        public string? DeliveryAddress { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CreditCard;
        
        [Required]
        public List<CheckoutItemDto> Items { get; set; } = new();
    }

    public class CheckoutItemDto
    {
        public int PizzaId { get; set; }
        public int Quantity { get; set; }
        public string Customization { get; set; } = string.Empty; // stringified JSON from frontend
    }

    public class OrderResponseDto
    {
        public int Id { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
