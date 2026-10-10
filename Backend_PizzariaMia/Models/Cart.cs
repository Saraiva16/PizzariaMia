using System.ComponentModel.DataAnnotations.Schema;

namespace PizzariaMia.Models
{
    public class Cart
    {
        public int Id { get; set; }
        
        public int? UserId { get; set; }
        
        public string? SessionId { get; set; } // Used to track guest users' carts
        
        public string? CouponCode { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public User? User { get; set; }
        public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
    }
}
