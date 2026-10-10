using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs.EvolutionAPI;
using PizzariaMia.Services;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WhatsappWebhookController : ControllerBase
    {
        private readonly ILogger<WhatsappWebhookController> _logger;
        private readonly IEvolutionApiService _evolutionApi;
        private readonly IBotStateService _botState;
        private readonly PizzariaMia.Data.AppDbContext _context;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<PizzariaMia.Hubs.OrderTrackingHub> _hubContext;

        public WhatsappWebhookController(
            ILogger<WhatsappWebhookController> logger, 
            IEvolutionApiService evolutionApi, 
            IBotStateService botState,
            PizzariaMia.Data.AppDbContext context,
            Microsoft.AspNetCore.SignalR.IHubContext<PizzariaMia.Hubs.OrderTrackingHub> hubContext)
        {
            _logger = logger;
            _evolutionApi = evolutionApi;
            _botState = botState;
            _context = context;
            _hubContext = hubContext;
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
                    decimal totalOrderAmount = 0;
                    int orderItemCount = 1;
                    
                    if (message.TryGetProperty("conversation", out var conv)) 
                        textMessage = conv.GetString();
                    else if (message.TryGetProperty("extendedTextMessage", out var ext) && ext.TryGetProperty("text", out var extText)) 
                        textMessage = extText.GetString();
                    else if (message.TryGetProperty("orderMessage", out var orderMsg)) 
                    {
                        // O usuário enviou um carrinho do Catálogo Nativo do WhatsApp!
                        isOrderMessage = true;
                        
                        // Pega total amount e itemCount
                        if (orderMsg.TryGetProperty("totalAmount1000", out var amountObj))
                        {
                            totalOrderAmount = amountObj.GetProperty("low").GetInt32() / 1000m;
                        }
                        orderItemCount = orderMsg.TryGetProperty("itemCount", out var count) ? count.GetInt32() : 1;

                        // Imprime o JSON completo do orderMessage no console para debug
                        Console.WriteLine("=== PAYLOAD DO ORDER MESSAGE ===");
                        Console.WriteLine(orderMsg.GetRawText());
                        Console.WriteLine("=================================");

                        textMessage = $"[CARRINHO NATIVO RECEBIDO COM {orderItemCount} ITENS]";
                    }

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem de {customerName}: {textMessage}");

                    var currentStep = await _botState.GetUserStepAsync(remoteJid);

                    // Se recebemos um carrinho nativo, processamos diretamente independente da etapa
                    if (isOrderMessage)
                    {

                        // Garante que o usuário existe
                        string phoneNum = remoteJid.Split('@')[0];
                        var user = _context.Users.FirstOrDefault(u => u.Phone == phoneNum);
                        if (user == null)
                        {
                            user = new PizzariaMia.Models.User
                            {
                                Name = customerName,
                                Phone = phoneNum,
                                Email = $"{phoneNum}@whatsapp.com",
                                PasswordHash = "whatsapp-guest",
                                Role = "User"
                            };
                            _context.Users.Add(user);
                            _context.SaveChanges();
                        }

                        // Garante que a Pizza genérica existe
                        var genericPizza = _context.Pizzas.FirstOrDefault(p => p.Name == "Pedido via WhatsApp");
                        if (genericPizza == null)
                        {
                            genericPizza = new PizzariaMia.Models.Pizza
                            {
                                Name = "Pedido via WhatsApp",
                                Description = "Pizza pendente de edição pelo atendente",
                                Price = 0,
                                ImageUrl = "https://cdn-icons-png.flaticon.com/512/124/124034.png" // WhatsApp icon
                            };
                            _context.Pizzas.Add(genericPizza);
                            _context.SaveChanges();
                        }

                        var order = new PizzariaMia.Models.Order
                        {
                            UserId = user.Id,
                            AddressId = null,
                            PaymentMethod = PizzariaMia.Models.Enums.PaymentMethod.Pix,
                            Status = PizzariaMia.Models.Enums.OrderStatus.Pending,
                            TotalAmount = totalOrderAmount > 0 ? totalOrderAmount : 1.00m,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            Items = new List<PizzariaMia.Models.OrderItem>
                            {
                                new PizzariaMia.Models.OrderItem
                                {
                                    PizzaId = genericPizza.Id,
                                    Quantity = 1,
                                    UnitPrice = totalOrderAmount > 0 ? totalOrderAmount : 1.00m,
                                    SubTotal = totalOrderAmount > 0 ? totalOrderAmount : 1.00m,
                                    Notes = $"Carrinho nativo do WhatsApp com {orderItemCount} itens. Valor: {totalOrderAmount.ToString("C")}. Atendente, edite este pedido com as opções corretas baseadas no WhatsApp do cliente!"
                                }
                            }
                        };

                        _context.Orders.Add(order);
                        _context.SaveChanges();

                        // Dispara evento para a cozinha/painel recarregar
                        await _hubContext.Clients.All.SendAsync("StatusChanged", "Pending");
                        
                        await _evolutionApi.SendTextAsync(remoteJid, $"✅ *Recebemos o seu pedido!* (Total: {totalOrderAmount.ToString("C")})\n\nUm de nossos atendentes já vai confirmar os sabores, o valor do frete e o endereço de entrega com você por aqui mesmo.");
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
