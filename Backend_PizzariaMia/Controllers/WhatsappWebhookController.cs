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
                    bool isOrderMessage = false;
                    
                    if (message.TryGetProperty("conversation", out var conv)) 
                        textMessage = conv.GetString();
                    else if (message.TryGetProperty("extendedTextMessage", out var ext) && ext.TryGetProperty("text", out var extText)) 
                        textMessage = extText.GetString();
                    else if (message.TryGetProperty("orderMessage", out var orderMsg)) 
                    {
                        // O usuário enviou um carrinho do Catálogo Nativo do WhatsApp!
                        isOrderMessage = true;
                        
                        // Imprime o JSON completo do orderMessage no console para debug
                        Console.WriteLine("=== PAYLOAD DO ORDER MESSAGE ===");
                        Console.WriteLine(orderMsg.GetRawText());
                        Console.WriteLine("=================================");

                        int itemCount = orderMsg.TryGetProperty("itemCount", out var count) ? count.GetInt32() : 1;
                        textMessage = $"[CARRINHO NATIVO RECEBIDO COM {itemCount} ITENS]";
                    }

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem de {customerName}: {textMessage}");

                    var currentStep = await _botState.GetUserStepAsync(remoteJid);

                    // Se recebemos um carrinho nativo, processamos diretamente independente da etapa
                    if (isOrderMessage)
                    {
                        await _evolutionApi.SendTextAsync(remoteJid, "✅ *Recebemos o seu carrinho do catálogo!* \nEstamos processando os itens e um atendente já vai confirmar o valor do frete e o endereço com você.");
                        await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                        return Ok(new { success = true });
                    }

                    // INTERCEPTADOR GLOBAL: Palavras-chave para destravar o bot e voltar ao menu
                    string txtLower = textMessage.ToLower().Trim();
                    if (txtLower == "voltar" || txtLower == "cancelar" || txtLower == "menu" || txtLower == "inicio")
                    {
                        await _botState.ClearUserStepAsync(remoteJid);
                        currentStep = OrderStep.BemVindo;
                    }

                    // 2. Máquina de Estados do Bot
                    switch (currentStep)
                    {
                        case OrderStep.BemVindo:
                            string saudacao = $"Olá, {customerName}! Bem-vindo à *Pizzaria Mia* 🍕✨\n\nComo posso te ajudar hoje?\n1️⃣ *Fazer um Pedido* 🛵\n2️⃣ *Ver o Cardápio* 📖\n3️⃣ *Falar com um Atendente* 👨‍💻\n\n_(Digite *voltar* a qualquer momento para ver este menu)_";
                            await _evolutionApi.SendTextAsync(remoteJid, saudacao);
                            await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoComando);
                            break;

                        case OrderStep.AguardandoComando:
                            if (textMessage == "1")
                            {
                                await _evolutionApi.SendTextAsync(remoteJid, "Você pode montar seu pedido rapidamente e ver fotos no nosso site:\n👉 https://pizzariamia.com.br/cardapio");
                                await _evolutionApi.SendTextAsync(remoteJid, "Mas se preferir, é só mandar seu pedido escrito aqui mesmo!\nEx: _\"Quero uma pizza G metade calabresa metade mussarela, para a Rua das Flores, 123\"_");
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.DigitandoPedidoLivre);
                            }
                            else if (textMessage == "2")
                            {
                                await _evolutionApi.SendTextAsync(remoteJid, "Você pode conferir todos os nossos produtos tocando no ícone de 🛒 *Catálogo* aqui no topo da nossa conversa do WhatsApp! Pode adicionar no carrinho e me enviar por aqui mesmo.");
                                await _evolutionApi.SendTextAsync(remoteJid, "Ou, se preferir uma visualização melhor, acesse nosso site completo:\n👉 https://pizzariamia.com.br/cardapio");
                            }
                            else if (textMessage == "3")
                            {
                                await _evolutionApi.SendTextAsync(remoteJid, "Vou te transferir para um de nossos atendentes! 👨‍🍳\nO tempo médio de resposta no momento é de *5 minutos*. Por favor, já pode ir enviando sua dúvida.");
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                            }
                            else
                            {
                                await _evolutionApi.SendTextAsync(remoteJid, "Desculpe, não entendi! 😅\nPor favor, digite apenas *1*, *2* ou *3*.");
                            }
                            break;

                        case OrderStep.DigitandoPedidoLivre:
                            await _evolutionApi.SendTextAsync(remoteJid, "✅ Anotei seu pedido! \nUm de nossos atendentes vai ler sua mensagem em instantes para confirmar o valor total e o tempo de entrega com você.");
                            await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                            break;

                        case OrderStep.AtendimentoHumano:
                            // Não fazemos nada, o bot fica mudo para o humano conversar.
                            break;

                        default:
                            // Se o usuário ficou preso em um estado que não existe mais (ex: estado 4 de testes antigos)
                            await _botState.ClearUserStepAsync(remoteJid);
                            await _evolutionApi.SendTextAsync(remoteJid, "Sistema atualizado. Por favor, envie um 'Oi' novamente para recomeçar o atendimento.");
                            break;
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
