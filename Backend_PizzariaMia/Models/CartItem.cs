using System.ComponentModel.DataAnnotations.Schema;

namespace PizzariaMia.Models
{
    public class CartItem
    {
        public int Id { get; set; }
        public int CartId { get; set; }
        public int PizzaId { get; set; }
        public int Quantity { get; set; }
        
        public string? Notes { get; set; }

        // Navigation properties
        public Cart? Cart { get; set; }
        public Pizza? Pizza { get; set; }
    }
}
