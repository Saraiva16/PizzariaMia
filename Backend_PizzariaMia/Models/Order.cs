using System.ComponentModel.DataAnnotations.Schema;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.Models
{
    public class Order
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        
        public OrderStatus Status { get; set; } = OrderStatus.Pending;
        public PaymentMethod PaymentMethod { get; set; }
        public string? DeliveryAddress { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Usuario? Usuario { get; set; }
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
}
