using System.Text;
using System.Text.Json;

namespace PizzariaMia.Services
{
    public interface IEvolutionApiService
    {
        Task<bool> SendTextAsync(string remoteJid, string text);
    }

    public class EvolutionApiService : IEvolutionApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey = "PizzariaMiaSecretKey123!";
        private readonly string _baseUrl = "http://localhost:8080";
        private readonly string _instanceName = "PizzariaBot";

        public EvolutionApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<bool> SendTextAsync(string remoteJid, string text)
        {
            var url = $"{_baseUrl}/message/sendText/{_instanceName}";

            // Payload atualizado para a versão 2 da Evolution API
            var payload = new
            {
                number = remoteJid,
                text = text,
                delay = 1200 // Segundos de atraso simulando digitação
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            // Adiciona a chave de segurança da nossa API
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("apikey", _apiKey);

            var response = await _httpClient.PostAsync(url, content);

            return response.IsSuccessStatusCode;
        }
    }
}
