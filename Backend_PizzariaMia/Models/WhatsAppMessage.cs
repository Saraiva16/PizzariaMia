using System.ComponentModel.DataAnnotations;

namespace PizzariaMia.Models
{
    public class WhatsAppMessage
    {
        public int Id { get; set; }

        [Required]
        public string RemoteJid { get; set; } = string.Empty;

        public string SenderPhone { get; set; } = string.Empty;

        public string SenderName { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public bool FromMe { get; set; }

        public string MessageType { get; set; } = "text";

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;
    }
}
