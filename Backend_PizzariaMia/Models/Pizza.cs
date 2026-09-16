namespace PizzariaMia.Models
{
    public class Pizza
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Badge { get; set; }
        public string StandarSize { get; set; } = "8 fatias";
        public bool Active { get; set; } = true;
    }
}
