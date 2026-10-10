namespace PizzariaMia.Models
{
    public class Address
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        public string Label { get; set; } = string.Empty; // e.g., "Casa", "Trabalho"
        public string StreetAndNumber { get; set; } = string.Empty;
        public bool IsMain { get; set; } = false;

        public User? User { get; set; }
    }
}
