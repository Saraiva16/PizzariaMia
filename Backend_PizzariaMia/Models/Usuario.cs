using Microsoft.AspNetCore.Identity;

namespace PizzariaMia.Models
{
    public class Usuario : IdentityUser<int>
    {
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
