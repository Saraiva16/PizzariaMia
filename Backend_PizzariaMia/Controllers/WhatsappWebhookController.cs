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
                    bool fromMe = key.TryGetProperty("fromMe", out var fromMeProp) && fromMeProp.GetBoolean();
                    string remoteJid = key.GetProperty("remoteJid").GetString() ?? "";
                    string phoneNum = remoteJid.Split('@')[0];
                    string customerName = data.TryGetProperty("pushName", out var pushNameProp) ? pushNameProp.GetString() ?? "Cliente" : "Cliente";
                    var message = data.GetProperty("message");
                    string textMessage = "";
                    bool isOrderMessage = false;
                    decimal totalOrderAmount = 0;
                    int orderItemCount = 1;
                    
                    if (message.TryGetProperty("conversation", out var conv)) 
                        textMessage = conv.GetString() ?? "";
                    else if (message.TryGetProperty("extendedTextMessage", out var ext) && ext.TryGetProperty("text", out var extText)) 
                        textMessage = extText.GetString() ?? "";
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

                        textMessage = $"🛒 [Carrinho com {orderItemCount} itens enviado pelo WhatsApp - Total: {totalOrderAmount:C}]";
                    }

                    // Se não tiver texto nem for orderMessage, tenta extrair outros tipos
                    if (string.IsNullOrWhiteSpace(textMessage))
                    {
                        if (message.TryGetProperty("imageMessage", out _)) textMessage = "📷 [Imagem]";
                        else if (message.TryGetProperty("audioMessage", out _)) textMessage = "🎵 [Áudio]";
                        else textMessage = "[Mensagem]";
                    }

                    // Evita duplicar mensagens que o próprio bot ou atendente acabou de salvar
                    if (fromMe)
                    {
                        bool alreadySaved = _context.WhatsAppMessages.Any(m =>
                            m.FromMe &&
                            m.RemoteJid == remoteJid &&
                            m.Text == textMessage &&
                            m.CreatedAt >= DateTime.UtcNow.AddSeconds(-15));

                        if (alreadySaved)
                        {
                            return Ok();
                        }
                    }

                    // Persiste a mensagem no histórico do Chat
                    var incomingChatMsg = new PizzariaMia.Models.WhatsAppMessage
                    {
                        RemoteJid = remoteJid,
                        SenderPhone = phoneNum,
                        SenderName = customerName,
                        Text = textMessage,
                        FromMe = fromMe,
                        MessageType = isOrderMessage ? "order" : "text",
                        Timestamp = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.WhatsAppMessages.Add(incomingChatMsg);
                    await _context.SaveChangesAsync();

                    // Notifica frontends conectados via SignalR
                    await _hubContext.Clients.All.SendAsync("NewWhatsAppMessage", incomingChatMsg);

                    // Se a mensagem for nossa (fromMe == true), já salvamos e não acionamos o bot
                    if (fromMe) return Ok();

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem de {customerName}: {textMessage}");

                    var currentStep = await _botState.GetUserStepAsync(remoteJid);

                    // Se recebemos um carrinho nativo, processamos diretamente independente da etapa
                    if (isOrderMessage)
                    {

                        // Garante que o usuário existe
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
                         
                         await SendBotResponseAsync(remoteJid, phoneNum, $"✅ *Recebemos o seu pedido!* (Total: {totalOrderAmount.ToString("C")})\n\nUm de nossos atendentes já vai confirmar os sabores, o valor do frete e o endereço de entrega com você por aqui mesmo.");
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
                             await SendBotResponseAsync(remoteJid, phoneNum, saudacao);
                             await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoComando);
                             break;

                         case OrderStep.AguardandoComando:
                             if (textMessage == "1")
                             {
                                 await SendBotResponseAsync(remoteJid, phoneNum, "Você pode montar seu pedido rapidamente e ver fotos no nosso site:\n👉 https://pizzariamia.com.br/cardapio");
                                 await SendBotResponseAsync(remoteJid, phoneNum, "Mas se preferir, é só mandar seu pedido escrito aqui mesmo!\nEx: _\"Quero uma pizza G metade calabresa metade mussarela, para a Rua das Flores, 123\"_");
                                 await _botState.SetUserStepAsync(remoteJid, OrderStep.DigitandoPedidoLivre);
                             }
                             else if (textMessage == "2")
                             {
                                 await SendBotResponseAsync(remoteJid, phoneNum, "Você pode conferir todos os nossos produtos acessando nosso cardápio digital completo com fotos e preços:\n👉 https://pizzariamia.com.br/cardapio\n\nOu se preferir, envie sua dúvida por aqui!");
                             }
                             else if (textMessage == "3")
                             {
                                 await SendBotResponseAsync(remoteJid, phoneNum, "Vou te transferir para um de nossos atendentes! 👨‍🍳\nO tempo médio de resposta no momento é de *5 minutos*. Por favor, já pode ir enviando sua dúvida.");
                                 await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                             }
                             else
                             {
                                 await SendBotResponseAsync(remoteJid, phoneNum, "Desculpe, não entendi! 😅\nPor favor, digite apenas *1*, *2* ou *3*.");
                             }
                             break;

                         case OrderStep.DigitandoPedidoLivre:
                             await SendBotResponseAsync(remoteJid, phoneNum, "✅ Anotei seu pedido! \nUm de nossos atendentes vai ler sua mensagem em instantes para confirmar o valor total e o tempo de entrega com você.");
                             await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                             break;

                         case OrderStep.AtendimentoHumano:
                             // Não fazemos nada, o bot fica mudo para o humano conversar.
                             break;

                         default:
                             // Se o usuário ficou preso em um estado que não existe mais
                             await _botState.ClearUserStepAsync(remoteJid);
                             await SendBotResponseAsync(remoteJid, phoneNum, "Sistema atualizado. Por favor, envie um 'Oi' novamente para recomeçar o atendimento.");
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

         private async Task SendBotResponseAsync(string remoteJid, string phoneNum, string text)
         {
             try
             {
                 await _evolutionApi.SendTextAsync(remoteJid, text);

                 var botMsg = new PizzariaMia.Models.WhatsAppMessage
                 {
                     RemoteJid = remoteJid,
                     SenderPhone = phoneNum,
                     SenderName = "Pizzaria Mia (Bot)",
                     Text = text,
                     FromMe = true,
                     MessageType = "text",
                     Timestamp = DateTime.UtcNow,
                     CreatedAt = DateTime.UtcNow
                 };
                 _context.WhatsAppMessages.Add(botMsg);
                 await _context.SaveChangesAsync();

                 await _hubContext.Clients.All.SendAsync("NewWhatsAppMessage", botMsg);
             }
             catch (Exception ex)
             {
                 _logger.LogWarning($"Falha ao persistir ou transmitir resposta do bot: {ex.Message}");
             }
         }
     }
 }
