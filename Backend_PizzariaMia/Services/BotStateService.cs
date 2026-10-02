using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace PizzariaMia.Services
{
    public enum OrderStep
    {
        BemVindo = 0,
        EscolhendoSabor = 1,
        AguardandoEndereco = 2,
        AguardandoPagamento = 3,
        PedidoFinalizado = 4
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
            
            // Define o tempo máximo que o cliente pode ficar sem responder (ex: 2 horas)
            var options = new DistributedCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromHours(2));

            await _cache.SetStringAsync(cacheKey, step.ToString(), options);
        }

        public async Task ClearUserStepAsync(string remoteJid)
        {
            var cacheKey = $"BotState_{remoteJid}";
            await _cache.RemoveAsync(cacheKey);
        }
    }
}
