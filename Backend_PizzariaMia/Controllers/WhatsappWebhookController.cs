using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs.EvolutionAPI;
using System.Text.Json;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WhatsappWebhookController : ControllerBase
    {
        private readonly ILogger<WhatsappWebhookController> _logger;

        public WhatsappWebhookController(ILogger<WhatsappWebhookController> logger)
        {
            _logger = logger;
        }

        [HttpPost]
        public IActionResult ReceiveWebhook([FromBody] WebhookPayloadDto payload)
        {
            if (payload.Event == "messages.upsert")
            {
                var data = payload.Data;

                try
                {
                    // Lendo as propriedades do JsonElement
                    var key = data.GetProperty("key");
                    bool fromMe = key.GetProperty("fromMe").GetBoolean();

                    if (fromMe)
                    {
                        return Ok(); // Ignora mensagens do bot
                    }

                    string remoteJid = key.GetProperty("remoteJid").GetString();
                    string customerName = data.TryGetProperty("pushName", out var pushNameProp) ? pushNameProp.GetString() : "Cliente";
                    
                    var message = data.GetProperty("message");
                    
                    string textMessage = "";
                    
                    if (message.TryGetProperty("conversation", out var conv))
                    {
                        textMessage = conv.GetString();
                    }
                    else if (message.TryGetProperty("extendedTextMessage", out var ext) && ext.TryGetProperty("text", out var extText))
                    {
                        textMessage = extText.GetString();
                    }

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem recebida de {customerName} ({remoteJid}): {textMessage}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Erro ao processar mensagem do WhatsApp: {ex.Message}");
                }
            }

            return Ok(new { success = true });
        }
    }
}
