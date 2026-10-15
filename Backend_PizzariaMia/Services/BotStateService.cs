using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace PizzariaMia.Services
{
    public enum OrderStep
    {
        BemVindo = 0,
        AguardandoComando = 1,
        DigitandoPedidoLivre = 2,
        AtendimentoHumano = 3
    }

    public interface IBotStateService
    {
        Task<OrderStep> GetUserStepAsync(string remoteJid);
        Task SetUserStepAsync(string remoteJid, OrderStep step);
        Task ClearUserStepAsync(string remoteJid);
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

            return Enum.Parse<OrderStep>(stepString);
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
        }
    }
}
