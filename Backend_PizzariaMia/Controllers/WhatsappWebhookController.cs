using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs.EvolutionAPI;
using PizzariaMia.Services;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WhatsappWebhookController : ControllerBase
    {
        private readonly ILogger<WhatsappWebhookController> _logger;
        private readonly IEvolutionApiService _evolutionApi;
        private readonly IBotStateService _botState;
        private readonly IOrderParserService _orderParser;
        private readonly PizzariaMia.Data.AppDbContext _context;
        private readonly Microsoft.AspNetCore.SignalR.IHubContext<PizzariaMia.Hubs.OrderTrackingHub> _hubContext;

        public WhatsappWebhookController(
            ILogger<WhatsappWebhookController> logger, 
            IEvolutionApiService evolutionApi, 
            IBotStateService botState,
            IOrderParserService orderParser,
            PizzariaMia.Data.AppDbContext context,
            Microsoft.AspNetCore.SignalR.IHubContext<PizzariaMia.Hubs.OrderTrackingHub> hubContext)
        {
            _logger = logger;
            _evolutionApi = evolutionApi;
            _botState = botState;
            _orderParser = orderParser;
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
                        CreatedAt = DateTime.UtcNow,
                        IsRead = fromMe // se for mensagem do cliente, chega não lida (false)
                    };
                    _context.WhatsAppMessages.Add(incomingChatMsg);
                    await _context.SaveChangesAsync();

                    // Notifica frontends conectados via SignalR
                    await _hubContext.Clients.All.SendAsync("NewWhatsAppMessage", incomingChatMsg);

                    // Se a mensagem for nossa (fromMe == true), já salvamos e não acionamos o bot
                    if (fromMe) return Ok();

                    _logger.LogInformation($"[WHATSAPP WEBHOOK] Mensagem de {customerName}: {textMessage}");

                    var currentStep = await _botState.GetUserStepAsync(remoteJid);

                    // Se recebemos um carrinho nativo, iniciamos o fluxo de entrega/pagamento a partir dele
                    if (isOrderMessage)
                    {
                        var draft = new WhatsAppOrderDraft
                        {
                            ItemsDescription = textMessage,
                            TotalAmount = totalOrderAmount > 0 ? totalOrderAmount : 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _botState.SetOrderDraftAsync(remoteJid, draft);
                        await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoEndereco);

                        string msgEndereco = $"🛒 *Recebi seu carrinho!* (Total: {totalOrderAmount:C})\n\n" +
                                             "Como você deseja receber o pedido?\n" +
                                             "1 - Delivery: [Digite seu endereço completo com rua e número]\n" +
                                             "2 - Retirada no balcão";
                        await SendBotResponseAsync(remoteJid, phoneNum, msgEndereco);
                        return Ok(new { success = true });
                    }

                    // INTERCEPTADOR GLOBAL: Palavras-chave ou saudações após inatividade para destravar o bot
                    string txtLower = textMessage.ToLower().Trim();
                    if (txtLower == "voltar" || txtLower == "cancelar" || txtLower == "menu" || txtLower == "inicio")
                    {
                        await _botState.ClearUserStepAsync(remoteJid);
                        currentStep = OrderStep.BemVindo;
                    }
                    else if (currentStep == OrderStep.AtendimentoHumano)
                    {
                        // Se estiver em atendimento humano, verifica se o cliente mandou uma saudação para novo pedido
                        var greetings = new[] { "oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "cardapio", "cardápio", "quero pedir", "fazer pedido", "pedir pizza", "opa", "menu", "cardápio por favor", "cardapio por favor" };
                        bool isGreeting = greetings.Any(g => txtLower == g || txtLower.StartsWith(g + " ") || txtLower.StartsWith(g + ","));

                        if (isGreeting)
                        {
                            var lastMsg = await _context.WhatsAppMessages
                                .Where(m => m.RemoteJid == remoteJid || m.SenderPhone == phoneNum)
                                .OrderByDescending(m => m.Timestamp)
                                .Skip(1) // Pula a mensagem atual recém-persistida
                                .FirstOrDefaultAsync();

                            if (lastMsg == null || (DateTime.UtcNow - lastMsg.Timestamp).TotalMinutes >= 15)
                            {
                                _logger.LogInformation($"[BOT STATE] Cliente {customerName} ({phoneNum}) inativo há mais de 15 min enviou saudação. Reiniciando bot.");
                                await _botState.ClearUserStepAsync(remoteJid);
                                currentStep = OrderStep.BemVindo;
                            }
                        }
                    }

                    // INTERCEPTADOR GLOBAL: Pergunta sobre status do pedido em andamento
                    var statusKeywords = new[] { "status", "onde esta meu pedido", "onde está meu pedido", "onde ta meu pedido", "meu pedido", "vai demorar", "previsao", "previsão", "cade meu pedido", "cadê meu pedido", "como esta meu pedido", "como está meu pedido", "acompanhar", "preparo" };
                    bool isAskingStatus = statusKeywords.Any(k => txtLower == k || txtLower.Contains(k));

                    if (isAskingStatus && currentStep != OrderStep.AguardandoEndereco && currentStep != OrderStep.AguardandoPagamento && currentStep != OrderStep.AguardandoConfirmacao)
                    {
                        await CheckOrderStatusResponseAsync(remoteJid, phoneNum, customerName);
                        return Ok(new { success = true });
                    }

                    // 2. Máquina de Estados do Bot
                    switch (currentStep)
                    {
                        case OrderStep.BemVindo:
                            string saudacao = $"Olá, {customerName}! Bem-vindo à *Pizzaria Mia* 🍕✨\n\n" +
                                              $"Como posso te ajudar hoje?\n" +
                                              $"1️⃣ *Fazer um Pedido* 🛵\n" +
                                              $"2️⃣ *Ver o Cardápio* 📖\n" +
                                              $"3️⃣ *Consultar Status do Pedido* 🔍\n" +
                                              $"4️⃣ *Falar com um Atendente* 👨‍💻\n\n" +
                                              $"_(Digite *voltar* a qualquer momento para ver este menu)_";
                            await SendBotResponseAsync(remoteJid, phoneNum, saudacao);
                            await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoComando);
                            break;

                        case OrderStep.AguardandoComando:
                            if (textMessage == "1")
                            {
                                // Verifica se há último pedido concluído recente do cliente para sugerir Repetir
                                var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == phoneNum);
                                var lastCompletedOrder = await _context.Orders
                                    .Include(o => o.Items).ThenInclude(i => i.Pizza)
                                    .Include(o => o.Address)
                                    .Where(o => (o.CustomerPhone == phoneNum || (user != null && o.UserId == user.Id)) && o.Status == Models.Enums.OrderStatus.Completed)
                                    .OrderByDescending(o => o.CreatedAt)
                                    .FirstOrDefaultAsync();

                                if (lastCompletedOrder != null && lastCompletedOrder.Items.Any())
                                {
                                    string itemsSummary = string.Join("\n", lastCompletedOrder.Items.Select(i => 
                                        !string.IsNullOrWhiteSpace(i.Notes) ? $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"} ({i.Notes})" : $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"}"));

                                    string repeatMsg = $"Perfeito, {customerName}! 🍕\n\n" +
                                                       $"Encontrei seu último pedido *#{lastCompletedOrder.Id}*:\n{itemsSummary}\n" +
                                                       $"📍 Entrega: {(lastCompletedOrder.Address != null ? lastCompletedOrder.Address.StreetAndNumber : "Retirada no Balcão")}\n\n" +
                                                       $"Deseja *Repetir* este mesmo pedido?\n" +
                                                       $"• Digite *R* para repetir 🔁\n" +
                                                       $"• Ou digite os novos sabores e itens que deseja pedir 🍕";

                                    await SendBotResponseAsync(remoteJid, phoneNum, repeatMsg);
                                    await _botState.SetUserStepAsync(remoteJid, OrderStep.DigitandoPedidoLivre);
                                }
                                else
                                {
                                    await SendBotResponseAsync(remoteJid, phoneNum, "Perfeito! 🍕 Digite quais sabores de pizza e itens você deseja pedir:\nEx: *2x pizzas mussarela e 1x coca cola*");
                                    await _botState.SetUserStepAsync(remoteJid, OrderStep.DigitandoPedidoLivre);
                                }
                            }
                            else if (textMessage == "2")
                            {
                                await SendBotResponseAsync(remoteJid, phoneNum, "Você pode conferir todos os nossos produtos acessando nosso cardápio digital completo com fotos e preços:\n👉 https://pizzariamia.com.br/cardapio\n\nOu se preferir, envie sua dúvida por aqui!");
                            }
                            else if (textMessage == "3")
                            {
                                await CheckOrderStatusResponseAsync(remoteJid, phoneNum, customerName);
                            }
                            else if (textMessage == "4")
                            {
                                await SendBotResponseAsync(remoteJid, phoneNum, "Vou te transferir para um de nossos atendentes! 👨‍🍳\nO tempo médio de resposta no momento é de *5 minutos*. Por favor, já pode ir enviando sua dúvida.");
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                            }
                            else
                            {
                                await SendBotResponseAsync(remoteJid, phoneNum, "Desculpe, não entendi! 😅\nPor favor, digite apenas *1*, *2*, *3* ou *4*.");
                            }
                            break;

                        case OrderStep.DigitandoPedidoLivre:
                            string trimmedInput = textMessage.Trim();
                            string lowerInput = trimmedInput.ToLower();

                            // Se o cliente escolheu repetir o pedido anterior
                            if (lowerInput == "r" || lowerInput == "repetir")
                            {
                                var usr = await _context.Users.FirstOrDefaultAsync(u => u.Phone == phoneNum);
                                var lastCompleted = await _context.Orders
                                    .Include(o => o.Items).ThenInclude(i => i.Pizza)
                                    .Include(o => o.Address)
                                    .Where(o => (o.CustomerPhone == phoneNum || (usr != null && o.UserId == usr.Id)) && o.Status == Models.Enums.OrderStatus.Completed)
                                    .OrderByDescending(o => o.CreatedAt)
                                    .FirstOrDefaultAsync();

                                if (lastCompleted != null && lastCompleted.Items.Any())
                                {
                                    string itemsSummary = string.Join("\n", lastCompleted.Items.Select(i => 
                                        !string.IsNullOrWhiteSpace(i.Notes) ? $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"} ({i.Notes})" : $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"}"));

                                    var repeatDraft = new WhatsAppOrderDraft
                                    {
                                        ItemsDescription = itemsSummary,
                                        TotalAmount = lastCompleted.TotalAmount,
                                        IsDelivery = lastCompleted.Address != null,
                                        AddressText = lastCompleted.Address != null ? lastCompleted.Address.StreetAndNumber : "Retirada no Balcão",
                                        PaymentMethod = lastCompleted.PaymentMethod.ToString()
                                    };

                                    await _botState.SetOrderDraftAsync(remoteJid, repeatDraft);
                                    await SendOrderSummaryAsync(remoteJid, phoneNum, repeatDraft);
                                    break;
                                }
                            }

                            // Processamento com o Parser Determinístico Inteligente
                            var parsedOrder = await ParseOrderDetailsAsync(trimmedInput);
                            var existingDraft = await _botState.GetOrderDraftAsync(remoteJid) ?? new WhatsAppOrderDraft();
                            existingDraft.ItemsDescription = parsedOrder.FormattedDescription;
                            existingDraft.TotalAmount = parsedOrder.TotalAmount;

                            await _botState.SetOrderDraftAsync(remoteJid, existingDraft);

                            // Se o cliente já havia preenchido endereço e pagamento (veio de uma alteração)
                            if (!string.IsNullOrWhiteSpace(existingDraft.AddressText) && !string.IsNullOrWhiteSpace(existingDraft.PaymentMethod))
                            {
                                await SendOrderSummaryAsync(remoteJid, phoneNum, existingDraft);
                            }
                            else
                            {
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoEndereco);
                                string askEndereco = $"Ótimo! Anotei seus itens 🍕\n\n{parsedOrder.FormattedDescription}\n\n" +
                                                     "Como deseja receber seu pedido?\n" +
                                                     "1 - Delivery: [Digite seu endereço completo com rua e número]\n" +
                                                     "2 - Retirada no balcão";
                                await SendBotResponseAsync(remoteJid, phoneNum, askEndereco);
                            }
                            break;

                        case OrderStep.AguardandoEndereco:
                            var addrDraft = await _botState.GetOrderDraftAsync(remoteJid) ?? new WhatsAppOrderDraft();
                            string rawAddr = textMessage.Trim();
                            string rawAddrLow = rawAddr.ToLower();

                            // Opção 2: Retirada no balcão
                            if (rawAddr == "2" || rawAddrLow.Contains("retirada") || rawAddrLow.Contains("balcao") || rawAddrLow.Contains("balcão"))
                            {
                                addrDraft.IsDelivery = false;
                                addrDraft.AddressText = "Retirada no Balcão";
                                await _botState.SetOrderDraftAsync(remoteJid, addrDraft);

                                // Se já tinha pagamento (veio de alteração), vai direto para o resumo
                                if (!string.IsNullOrWhiteSpace(addrDraft.PaymentMethod))
                                {
                                    await SendOrderSummaryAsync(remoteJid, phoneNum, addrDraft);
                                }
                                else
                                {
                                    await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoPagamento);
                                    string askPagamentoBalcao = "Perfeito, retirada no balcão anotada! 🏪\n\n" +
                                                                "Qual será a forma de pagamento?\n" +
                                                                "1 - Pix\n" +
                                                                "2 - Cartão de Crédito / Débito (no balcão)\n" +
                                                                "3 - Dinheiro (se precisar de troco, informe o valor)";
                                    await SendBotResponseAsync(remoteJid, phoneNum, askPagamentoBalcao);
                                }
                            }
                            else
                            {
                                // Opção 1: Delivery
                                string cleanAddress = Regex.Replace(rawAddr, @"^1\s*[-–.:]?\s*", "", RegexOptions.IgnoreCase).Trim();

                                // Se digitou apenas 1 sem especificar o endereço
                                if (string.IsNullOrWhiteSpace(cleanAddress) || cleanAddress.Equals("delivery", StringComparison.OrdinalIgnoreCase))
                                {
                                    await SendBotResponseAsync(remoteJid, phoneNum, 
                                        "Você escolheu Delivery! 🛵\n" +
                                        "Por favor, digite seu endereço completo com rua, número e bairro para entrega:");
                                    return Ok(new { success = true });
                                }

                                addrDraft.IsDelivery = true;
                                addrDraft.AddressText = cleanAddress;
                                await _botState.SetOrderDraftAsync(remoteJid, addrDraft);

                                // Se já tinha pagamento (veio de alteração), vai direto para o resumo
                                if (!string.IsNullOrWhiteSpace(addrDraft.PaymentMethod))
                                {
                                    await SendOrderSummaryAsync(remoteJid, phoneNum, addrDraft);
                                }
                                else
                                {
                                    await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoPagamento);
                                    string askPagamentoDelivery = $"Endereço anotado: *{cleanAddress}* 📍\n\n" +
                                                                  "Qual será a forma de pagamento?\n" +
                                                                  "1 - Pix\n" +
                                                                  "2 - Cartão de Crédito / Débito (na maquininha)\n" +
                                                                  "3 - Dinheiro (se precisar de troco, informe o valor)";
                                    await SendBotResponseAsync(remoteJid, phoneNum, askPagamentoDelivery);
                                }
                            }
                            break;

                        case OrderStep.AguardandoPagamento:
                            var payDraft = await _botState.GetOrderDraftAsync(remoteJid) ?? new WhatsAppOrderDraft();
                            string payLow = textMessage.ToLower().Trim();

                            if (payLow == "1" || payLow.Contains("pix"))
                            {
                                payDraft.PaymentMethod = "Pix";
                            }
                            else if (payLow == "2" || payLow.Contains("cart"))
                            {
                                payDraft.PaymentMethod = "Cartão";
                            }
                            else if (payLow == "3" || payLow.Contains("dinheiro"))
                            {
                                payDraft.PaymentMethod = textMessage.Length > 2 ? textMessage.Trim() : "Dinheiro";
                            }
                            else
                            {
                                payDraft.PaymentMethod = textMessage.Trim();
                            }

                            await _botState.SetOrderDraftAsync(remoteJid, payDraft);
                            await SendOrderSummaryAsync(remoteJid, phoneNum, payDraft);
                            break;

                        case OrderStep.AguardandoConfirmacao:
                            string confLow = textMessage.ToLower().Trim();
                            if (confLow == "sim" || confLow == "confirmar" || confLow == "confirma" || confLow == "ok" || confLow == "1" || confLow == "s")
                            {
                                var finalDraft = await _botState.GetOrderDraftAsync(remoteJid);
                                if (finalDraft == null || string.IsNullOrWhiteSpace(finalDraft.ItemsDescription))
                                {
                                    await SendBotResponseAsync(remoteJid, phoneNum, "Não encontrei os dados do pedido em andamento. Por favor, envie *Oi* para iniciar um novo pedido.");
                                    await _botState.ClearUserStepAsync(remoteJid);
                                    return Ok(new { success = true });
                                }

                                // Localiza ou cria o Usuário
                                var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == phoneNum);
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
                                    await _context.SaveChangesAsync();
                                }

                                // Se for Delivery, cria Address no banco
                                int? addressId = null;
                                if (finalDraft.IsDelivery && !string.IsNullOrWhiteSpace(finalDraft.AddressText))
                                {
                                    var address = new PizzariaMia.Models.Address
                                    {
                                        UserId = user.Id,
                                        Label = "WhatsApp",
                                        StreetAndNumber = finalDraft.AddressText,
                                        IsMain = true
                                    };
                                    _context.Addresses.Add(address);
                                    await _context.SaveChangesAsync();
                                    addressId = address.Id;
                                }

                                // Localiza ou cria pizza genérica para os itens de WhatsApp
                                var genericPizza = await _context.Pizzas.FirstOrDefaultAsync(p => p.Name == "Pedido via WhatsApp");
                                if (genericPizza == null)
                                {
                                    genericPizza = new PizzariaMia.Models.Pizza
                                    {
                                        Name = "Pedido via WhatsApp",
                                        Description = "Pedido registrado pelo bot do WhatsApp",
                                        Price = 0,
                                        ImageUrl = "https://cdn-icons-png.flaticon.com/512/124/124034.png"
                                    };
                                    _context.Pizzas.Add(genericPizza);
                                    await _context.SaveChangesAsync();
                                }

                                // Mapeia PaymentMethod
                                var payMethodEnum = PizzariaMia.Models.Enums.PaymentMethod.Pix;
                                if (finalDraft.PaymentMethod.ToLower().Contains("cart"))
                                {
                                    payMethodEnum = PizzariaMia.Models.Enums.PaymentMethod.CreditCard;
                                }
                                else if (finalDraft.PaymentMethod.ToLower().Contains("dinheiro"))
                                {
                                    payMethodEnum = PizzariaMia.Models.Enums.PaymentMethod.Cash;
                                }

                                decimal finalTotal = finalDraft.TotalAmount > 0 ? finalDraft.TotalAmount : 1.00m;

                                var newOrder = new PizzariaMia.Models.Order
                                {
                                    UserId = user.Id,
                                    CustomerName = customerName,
                                    CustomerPhone = phoneNum,
                                    AddressId = addressId,
                                    PaymentMethod = payMethodEnum,
                                    Status = PizzariaMia.Models.Enums.OrderStatus.Pending,
                                    TotalAmount = finalTotal,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow,
                                    Items = new List<PizzariaMia.Models.OrderItem>
                                    {
                                        new PizzariaMia.Models.OrderItem
                                        {
                                            PizzaId = genericPizza.Id,
                                            Quantity = 1,
                                            UnitPrice = finalTotal,
                                            SubTotal = finalTotal,
                                            Notes = finalDraft.ItemsDescription
                                        }
                                    }
                                };

                                _context.Orders.Add(newOrder);
                                await _context.SaveChangesAsync();

                                // Dispara evento SignalR para atualizar o painel de pedidos dos funcionários em tempo real
                                await _hubContext.Clients.All.SendAsync("StatusChanged", "Pending");

                                string destinoFinal = finalDraft.IsDelivery 
                                    ? $"em seu endereço (*{finalDraft.AddressText}*)" 
                                    : "*no balcão da pizzaria*";

                                string confirmacaoMsg = $"✅ *Pedido #{newOrder.Id} Confirmado com Sucesso!* 🎉\n\n" +
                                                        $"Seu pedido já foi enviado para a cozinha e está em preparo.\n" +
                                                        $"📍 Entrega/Retirada: {destinoFinal}\n" +
                                                        $"💳 Pagamento: {finalDraft.PaymentMethod}\n\n" +
                                                        $"Muito obrigado pela preferência! 🍕❤️";

                                await SendBotResponseAsync(remoteJid, phoneNum, confirmacaoMsg);

                                // Limpa draft e transfere para atendimento humano para caso queira tirar dúvidas
                                await _botState.ClearUserStepAsync(remoteJid);
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AtendimentoHumano);
                            }
                            else if (confLow == "alterar" || confLow == "mudar" || confLow == "trocar" || confLow == "editar" || confLow == "2")
                            {
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoMenuAlteracao);
                                string menuAlteracao = "O que você gostaria de alterar? ✏️\n\n" +
                                                       "1️⃣ *Itens / Sabores do pedido* 🍕\n" +
                                                       "2️⃣ *Endereço ou Retirada* 📍\n" +
                                                       "3️⃣ *Forma de Pagamento* 💳\n\n" +
                                                       "_(Digite *1*, *2* ou *3*, ou digite *Voltar* para rever o resumo)_";
                                await SendBotResponseAsync(remoteJid, phoneNum, menuAlteracao);
                            }
                            else if (confLow == "cancelar" || confLow == "não" || confLow == "nao" || confLow == "voltar" || confLow == "3")
                            {
                                await _botState.ClearUserStepAsync(remoteJid);
                                await SendBotResponseAsync(remoteJid, phoneNum, "Pedido cancelado com sucesso. Quando quiser pedir novamente, basta mandar um *Oi*!");
                            }
                            else
                            {
                                await SendBotResponseAsync(remoteJid, phoneNum, "Por favor, digite *Sim* para confirmar, *Alterar* para modificar algum dado ou *Cancelar* para recomeçar.");
                            }
                            break;

                        case OrderStep.AguardandoMenuAlteracao:
                            string altLow = textMessage.ToLower().Trim();
                            var currentDraft = await _botState.GetOrderDraftAsync(remoteJid) ?? new WhatsAppOrderDraft();

                            if (altLow == "1" || altLow.Contains("item") || altLow.Contains("sabor") || altLow.Contains("pizza"))
                            {
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.DigitandoPedidoLivre);
                                await SendBotResponseAsync(remoteJid, phoneNum, "Por favor, digite os novos sabores e itens do seu pedido:\nEx: *2x pizzas mussarela e 1x coca cola*");
                            }
                            else if (altLow == "2" || altLow.Contains("endereco") || altLow.Contains("endereço") || altLow.Contains("retirada") || altLow.Contains("entrega"))
                            {
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoEndereco);
                                string askEndereco = "Como deseja receber seu pedido?\n" +
                                                     "1 - Delivery: [Digite seu endereço completo com rua e número]\n" +
                                                     "2 - Retirada no balcão";
                                await SendBotResponseAsync(remoteJid, phoneNum, askEndereco);
                            }
                            else if (altLow == "3" || altLow.Contains("pagamento") || altLow.Contains("pagar") || altLow.Contains("forma"))
                            {
                                await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoPagamento);
                                await SendBotResponseAsync(remoteJid, phoneNum, 
                                    "Qual será a nova forma de pagamento?\n" +
                                    "1 - Pix\n" +
                                    "2 - Cartão de Crédito / Débito (na maquininha)\n" +
                                    "3 - Dinheiro (se precisar de troco, informe o valor)");
                            }
                            else if (altLow == "voltar" || altLow == "resumo")
                            {
                                await SendOrderSummaryAsync(remoteJid, phoneNum, currentDraft);
                            }
                            else
                            {
                                await SendBotResponseAsync(remoteJid, phoneNum, "Desculpe, não entendi! Digite *1* para Itens, *2* para Endereço, *3* para Pagamento ou *Voltar* para ver o resumo.");
                            }
                            break;

                        case OrderStep.AtendimentoHumano:
                            // Bot em silêncio para atendimento humano
                            break;

                        default:
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

        private async Task SendOrderSummaryAsync(string remoteJid, string phoneNum, WhatsAppOrderDraft draft)
        {
            string valorExibido = draft.TotalAmount > 0 
                ? draft.TotalAmount.ToString("C") 
                : "A confirmar pelo atendente";

            string resumo = $"📋 *Resumo do seu Pedido:*\n\n" +
                            $"🍕 *Itens:*\n{draft.ItemsDescription}\n\n" +
                            $"📍 *Entrega:* {draft.AddressText}\n" +
                            $"💳 *Forma de Pagamento:* {draft.PaymentMethod}\n" +
                            $"💰 *Total da compra:* {valorExibido}\n\n" +
                            $"*Confirma?*\n" +
                            $"• Digite *Sim* para confirmar ✅\n" +
                            $"• Digite *Alterar* para modificar algo ✏️\n" +
                            $"• Digite *Cancelar* para recomeçar ❌";

            await SendBotResponseAsync(remoteJid, phoneNum, resumo);
            await _botState.SetUserStepAsync(remoteJid, OrderStep.AguardandoConfirmacao);
        }

        private async Task<decimal> EstimateOrderTotalAsync(string text)
        {
            try
            {
                var pizzas = await _context.Pizzas.ToListAsync();
                string lower = text.ToLower();
                decimal total = 0;
                int matchedCount = 0;

                foreach (var pizza in pizzas)
                {
                    if (lower.Contains(pizza.Name.ToLower()))
                    {
                        // Procura por quantidade antes do sabor (ex: 2x, 2 pizzas, 2)
                        var pattern = $@"(\d+)\s*(?:x\s*|pizzas?\s*(?:de\s*)?)?{Regex.Escape(pizza.Name.ToLower())}";
                        var match = Regex.Match(lower, pattern);
                        int qty = 1;
                        if (match.Success && int.TryParse(match.Groups[1].Value, out int parsedQty))
                        {
                            qty = Math.Max(1, parsedQty);
                        }
                        total += pizza.Price * qty;
                        matchedCount += qty;
                    }
                }

                if (matchedCount > 0)
                {
                    return total;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Falha ao estimar preço de pedido: {ex.Message}");
            }
            return 0;
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
                    CreatedAt = DateTime.UtcNow,
                    IsRead = true
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

        private static string NormalizeText(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();
            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC).ToLower().Trim();
        }

        private async Task CheckOrderStatusResponseAsync(string remoteJid, string phoneNum, string customerName)
        {
            var since24h = DateTime.UtcNow.AddHours(-24);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == phoneNum);
            var lastOrder = await _context.Orders
                .Include(o => o.Items).ThenInclude(i => i.Pizza)
                .Include(o => o.Address)
                .Where(o => (o.CustomerPhone == phoneNum || (user != null && o.UserId == user.Id)) && o.CreatedAt >= since24h)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (lastOrder == null)
            {
                await SendBotResponseAsync(remoteJid, phoneNum,
                    $"Olá, {customerName}! 🔍 Não encontrei nenhum pedido em andamento nas últimas 24h para o seu número (*{phoneNum}*).\n\n" +
                    $"Deseja fazer um novo pedido? Digite *1* para iniciar!");
                return;
            }

            int elapsedMin = Math.Max(0, (int)(DateTime.UtcNow - lastOrder.CreatedAt).TotalMinutes);
            string totalFormatado = lastOrder.TotalAmount.ToString("C");
            string itensLista = string.Join("\n", lastOrder.Items.Select(i => 
                !string.IsNullOrWhiteSpace(i.Notes) ? $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"} ({i.Notes})" : $"• {i.Quantity}x {i.Pizza?.Name ?? "Pizza"}"));

            string statusDesc = "";
            switch (lastOrder.Status)
            {
                case Models.Enums.OrderStatus.Pending:
                    statusDesc = $"⏳ *Situação:* Pendente / Aguardando Cozinha\n" +
                                 $"🕒 *Realizado há:* {elapsedMin} minutos\n\n" +
                                 $"Sua comanda já foi recebida e nossa equipe logo iniciará a produção!";
                    break;

                case Models.Enums.OrderStatus.Preparing:
                    statusDesc = $"👨‍🍳 *Situação:* No Forno / Em Preparo! 🔥\n" +
                                 $"🕒 *Tempo decorrido:* {elapsedMin} minutos\n\n" +
                                 $"Nossos pizzaiolos já estão assando suas pizzas. Assim que sair para entrega você será avisado!";
                    break;

                case Models.Enums.OrderStatus.OutForDelivery:
                    string horaSaida = lastOrder.UpdatedAt.ToLocalTime().ToString("HH:mm");
                    string destino = lastOrder.Address != null ? lastOrder.Address.StreetAndNumber : "Retirada no balcão";
                    statusDesc = $"🛵 *Situação:* A Caminho / Saiu para Entrega! 🎉\n" +
                                 $"🕒 *Despachado às:* {horaSaida}\n" +
                                 $"📍 *Destino:* {destino}\n\n" +
                                 $"Fique atento(a), o entregador está chegando!";
                    break;

                case Models.Enums.OrderStatus.Completed:
                    string horaEntrega = lastOrder.UpdatedAt.ToLocalTime().ToString("HH:mm");
                    statusDesc = $"✅ *Situação:* Entregue / Concluído às {horaEntrega}! 🍕❤️\n\n" +
                                 $"Esperamos que tenha tido uma ótima experiência! Para um novo pedido, basta digitar *1*.";
                    break;

                case Models.Enums.OrderStatus.Canceled:
                    statusDesc = $"❌ *Situação:* Pedido Cancelado.\n\n" +
                                 $"Caso precise de suporte, digite *4* para falar com um atendente.";
                    break;

                default:
                    statusDesc = $"Situação atual: *{lastOrder.Status}*";
                    break;
            }

            string resposta = $"📋 *Consulta do Pedido #{lastOrder.Id}*\n\n" +
                              $"{statusDesc}\n\n" +
                              $"🍕 *Itens:*\n{itensLista}\n\n" +
                              $"💰 *Valor Total:* {totalFormatado}";

            await SendBotResponseAsync(remoteJid, phoneNum, resposta);
        }

        private async Task<ParsedOrderResult> ParseOrderDetailsAsync(string text)
        {
            var pizzas = await _context.Pizzas.ToListAsync();
            return _orderParser.ParseOrder(text, pizzas);
        }
     }
 }
