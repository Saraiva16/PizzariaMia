using System.ComponentModel.DataAnnotations.Schema;

namespace PizzariaMia.Models
{
    public class Ingredient
    {
        public int Id { get; set; }
        public string Name { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal AdditionalPrice { get; set; }
    }
}
