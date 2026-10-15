using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Hubs;
using PizzariaMia.Models;
using PizzariaMia.Services;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Employee,Admin")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEvolutionApiService _evolutionApi;
        private readonly IHubContext<OrderTrackingHub> _hubContext;
        private readonly PizzariaMia.Services.IBotStateService _botState;

        public ChatController(
            AppDbContext context,
            IEvolutionApiService evolutionApi,
            IHubContext<OrderTrackingHub> hubContext,
            PizzariaMia.Services.IBotStateService botState)
        {
            _context = context;
            _evolutionApi = evolutionApi;
            _hubContext = hubContext;
            _botState = botState;
        }

        public class SendMessageDto
        {
            public string Phone { get; set; } = string.Empty;
            public string Text { get; set; } = string.Empty;
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            // Agrupa as mensagens por telefone do remetente
            var messages = await _context.WhatsAppMessages
                .OrderByDescending(m => m.Timestamp)
                .ToListAsync();

            var conversations = messages
                .GroupBy(m => m.SenderPhone)
                .Select(g =>
                {
                    var latest = g.First();
                    // Localiza se há usuário cadastrado com esse telefone
                    var user = _context.Users.FirstOrDefault(u => u.Phone == g.Key);
                    var customerName = !string.IsNullOrWhiteSpace(latest.SenderName) && latest.SenderName != "Cliente"
                        ? latest.SenderName
                        : (user?.Name ?? g.Key);

                    // Verifica se há algum pedido em andamento para este cliente
                    var latestOrder = _context.Orders
                        .Where(o => o.CustomerPhone == g.Key || (user != null && o.UserId == user.Id))
                        .OrderByDescending(o => o.CreatedAt)
                        .FirstOrDefault();

                    return new
                    {
                        remoteJid = latest.RemoteJid,
                        phone = g.Key,
                        name = customerName,
                        lastMessage = latest.Text,
                        lastMessageTime = latest.Timestamp,
                        lastMessageFromMe = latest.FromMe,
                        unread = false,
                        activeOrderId = latestOrder?.Id,
                        activeOrderStatus = latestOrder?.Status.ToString(),
                        activeOrderTotal = latestOrder?.TotalAmount
                    };
                })
                .OrderByDescending(c => c.lastMessageTime)
                .ToList();

            return Ok(conversations);
        }

        [HttpGet("messages")]
        public async Task<IActionResult> GetMessages([FromQuery] string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return BadRequest("Telefone é obrigatório.");

            string cleanPhone = phone.Replace("+", "").Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Trim();

            var messages = await _context.WhatsAppMessages
                .Where(m => m.SenderPhone == cleanPhone || m.RemoteJid.StartsWith(cleanPhone))
                .OrderBy(m => m.Timestamp)
                .Select(m => new
                {
                    id = m.Id,
                    remoteJid = m.RemoteJid,
                    senderPhone = m.SenderPhone,
                    senderName = m.SenderName,
                    text = m.Text,
                    fromMe = m.FromMe,
                    messageType = m.MessageType,
                    timestamp = m.Timestamp
                })
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest("Telefone e texto da mensagem são obrigatórios.");

            string cleanPhone = dto.Phone.Replace("+", "").Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "").Trim();
            string remoteJid = cleanPhone.Contains("@") ? cleanPhone : $"{cleanPhone}@s.whatsapp.net";

            // Localiza nome do cliente
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == cleanPhone);
            string clientName = user?.Name ?? "Cliente";

            // Envia mensagem via Evolution API
            bool sent = await _evolutionApi.SendTextAsync(remoteJid, dto.Text.Trim());

            // Persiste no histórico como enviada pelo atendente
            var message = new WhatsAppMessage
            {
                RemoteJid = remoteJid,
                SenderPhone = cleanPhone,
                SenderName = clientName,
                Text = dto.Text.Trim(),
                FromMe = true,
                MessageType = "text",
                Timestamp = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.WhatsAppMessages.Add(message);
            await _context.SaveChangesAsync();

            // Notifica os clientes SignalR conectados
            await _hubContext.Clients.All.SendAsync("NewWhatsAppMessage", new
            {
                id = message.Id,
                remoteJid = message.RemoteJid,
                senderPhone = message.SenderPhone,
                senderName = message.SenderName,
                text = message.Text,
                fromMe = message.FromMe,
                messageType = message.MessageType,
                timestamp = message.Timestamp
            });

            return Ok(new
            {
                success = sent,
                message = "Mensagem enviada com sucesso.",
                data = message
            });
        }
    }
}
