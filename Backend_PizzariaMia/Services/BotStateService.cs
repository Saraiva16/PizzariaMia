using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace PizzariaMia.Services
{
    public enum OrderStep
    {
        BemVindo = 0,
        AguardandoComando = 1,
        DigitandoPedidoLivre = 2,
        AguardandoEndereco = 3,
        AguardandoPagamento = 4,
        AguardandoConfirmacao = 5,
        AguardandoMenuAlteracao = 6,
        AtendimentoHumano = 7
    }

    public class WhatsAppOrderDraft
    {
        public string ItemsDescription { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; } = 0;
        public bool IsDelivery { get; set; } = false;
        public string AddressText { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public interface IBotStateService
    {
        Task<OrderStep> GetUserStepAsync(string remoteJid);
        Task SetUserStepAsync(string remoteJid, OrderStep step);
        Task ClearUserStepAsync(string remoteJid);
        Task<WhatsAppOrderDraft?> GetOrderDraftAsync(string remoteJid);
        Task SetOrderDraftAsync(string remoteJid, WhatsAppOrderDraft draft);
        Task ClearOrderDraftAsync(string remoteJid);
    }

    public class BotStateService : IBotStateService
    {
        private readonly IDistributedCache _cache;

        public BotStateService(IDistributedCache cache)
        {
            _cache = cache;
        }

        public async Task<OrderStep> GetUserStepAsync(string remoteJid)
        {
            var cacheKey = $"BotState_{remoteJid}";
            var stepString = await _cache.GetStringAsync(cacheKey);

            if (string.IsNullOrEmpty(stepString))
            {
                return OrderStep.BemVindo; // Estado inicial padrão
            }

            if (Enum.TryParse<OrderStep>(stepString, out var step))
            {
                return step;
            }

            return OrderStep.BemVindo;
        }

        public async Task SetUserStepAsync(string remoteJid, OrderStep step)
        {
            var cacheKey = $"BotState_{remoteJid}";
            
            // Define o tempo máximo de inatividade (45 minutos absolutos)
            var options = new DistributedCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(45));

            await _cache.SetStringAsync(cacheKey, step.ToString(), options);
        }

        public async Task ClearUserStepAsync(string remoteJid)
        {
            var cacheKey = $"BotState_{remoteJid}";
            await _cache.RemoveAsync(cacheKey);
            await ClearOrderDraftAsync(remoteJid);
        }

        public async Task<WhatsAppOrderDraft?> GetOrderDraftAsync(string remoteJid)
        {
            var cacheKey = $"BotDraft_{remoteJid}";
            var json = await _cache.GetStringAsync(cacheKey);
            if (string.IsNullOrEmpty(json)) return null;

            try
            {
                return JsonSerializer.Deserialize<WhatsAppOrderDraft>(json);
            }
            catch
            {
                return null;
            }
        }

        public async Task SetOrderDraftAsync(string remoteJid, WhatsAppOrderDraft draft)
        {
            var cacheKey = $"BotDraft_{remoteJid}";
            var json = JsonSerializer.Serialize(draft);

            var options = new DistributedCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(45));

            await _cache.SetStringAsync(cacheKey, json, options);
        }

        public async Task ClearOrderDraftAsync(string remoteJid)
        {
            var cacheKey = $"BotDraft_{remoteJid}";
            await _cache.RemoveAsync(cacheKey);
        }
    }
}
