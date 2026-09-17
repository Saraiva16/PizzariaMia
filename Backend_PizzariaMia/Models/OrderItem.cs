using System.ComponentModel.DataAnnotations.Schema;

namespace PizzariaMia.Models
{
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int PizzaId { get; set; }
        public int Quantity { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }
        
        public string? Notes { get; set; }

        // Navigation properties
        public Order? Order { get; set; }
        public Pizza? Pizza { get; set; }
    }
}
