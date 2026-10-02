using System.ComponentModel.DataAnnotations;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.DTOs
{
    public class CreateOrderItemDto
    {
        [Required]
        public int PizzaId { get; set; }
        
        [Required]
        [Range(1, 100)]
        public int Quantity { get; set; }
        
        public CrustType Crust { get; set; } = CrustType.None;
        
        public List<int> AddedIngredients { get; set; } = new();
        
        public List<int> RemovedIngredients { get; set; } = new();
        
        public string? Notes { get; set; }
    }
}
