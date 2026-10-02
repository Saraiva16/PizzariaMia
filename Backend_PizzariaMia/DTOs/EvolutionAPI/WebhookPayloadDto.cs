using System.Text.Json;

namespace PizzariaMia.DTOs.EvolutionAPI
{
    public class WebhookPayloadDto
    {
        public string Event { get; set; }
        public string Instance { get; set; }
        // Em vez de forçar um tipo rígido que quebra o C#, recebemos como JsonElement genérico
        public JsonElement Data { get; set; } 
    }
}
