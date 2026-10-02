using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs.EvolutionAPI;
using PizzariaMia.Services;
using System.Text.Json;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WhatsappWebhookController : ControllerBase
    {
        private readonly ILogger<WhatsappWebhookController> _logger;
        private readonly IEvolutionApiService _evolutionApi;
        private readonly IBotStateService _botState;

        public WhatsappWebhookController(ILogger<WhatsappWebhookController> logger, IEvolutionApiService evolutionApi, IBotStateService botState)
        {
            _logger = logger;
            _evolutionApi = evolutionApi;
            _botState = botState;
        }

        [HttpPost]
        public async Task<IActionResult> ReceiveWebhook([FromBody] WebhookPayloadDto payload)
        {
            if (payload.Event == "messages.upsert")
            {
                var data = payload.Data;

                try
                {
                    var key = data.GetProperty("key");
                    bool fromMe = key.GetProperty("fromMe").GetBoolean();

                    if (fromMe) return Ok();

                    string remoteJid = key.GetProperty("remoteJid").GetString();
                    string customerName = data.TryGetProperty("pushName", out var pushNameProp) ? pushNameProp.GetString() : "Cliente";
                    var message = data.GetProperty("message");
                    string textMessage = "";
                    
                    if (message.TryGetProperty("conversation", out var conv)) textMessage = conv.GetString();
                    else if (message.TryGetProperty("extendedTextMessage", out var ext) && ext.TryGetProperty("text", out var extText)) textMessage = extText.GetString();

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem de {customerName}: {textMessage}");

                    // 1. Descobre em qual fase o cliente está
                    var currentStep = await _botState.GetUserStepAsync(remoteJid);
                    string resposta = "";

                    // 2. Máquina de Estados do Bot
                    switch (currentStep)
                    {
                        case OrderStep.BemVindo:
                            resposta = $"Olá {customerName}! Bem-vindo à Pizzaria Mia 🍕.\nO que você gostaria de pedir hoje?\n1 - Calabresa\n2 - Mussarela\n3 - Frango com Catupiry";
                            await _botState.SetUserStepAsync(remoteJid, OrderStep.EscolhendoSabor);
                            break;

                        case OrderStep.EscolhendoSabor:
                            resposta = $"Sabor {textMessage} anotado com sucesso! 📝\nPor favor, digite o endereço de entrega completo:";
                            await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoEndereco);
                            break;

                        case OrderStep.AguardandoEndereco:
                            resposta = $"Endereço anotado! 🛵\nO total deu R$ 45,00. O pagamento será feito via Pix na entrega.\nSeu pedido já foi para a cozinha! Obrigado por escolher a Pizzaria Mia!";
                            // Finalizou o fluxo, então limpamos a memória
                            await _botState.ClearUserStepAsync(remoteJid);
                            break;
                    }
                    
                    // 3. Dispara a resposta apropriada para o cliente
                    if (!string.IsNullOrEmpty(resposta))
                    {
                        await _evolutionApi.SendTextAsync(remoteJid, resposta);
                    }
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
