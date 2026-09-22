using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace PizzariaMia.DTOs
{
    public class PizzaCreateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        public string? Badge { get; set; }

        public string StandarSize { get; set; } = "8 fatias";

        public bool Active { get; set; } = true;

        [Required]
        public IFormFile Image { get; set; } = null!;
    }
}
