using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace PizzariaMia.Services
{
    public interface IEvolutionApiService
    {
        Task<bool> SendTextAsync(string remoteJid, string text);
    }

    public class EvolutionApiService : IEvolutionApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly string _instanceName;

        public EvolutionApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["EvolutionApi:ApiKey"] ?? "PizzariaMiaSecretKey123!";
            _baseUrl = configuration["EvolutionApi:BaseUrl"] ?? "http://localhost:8080";
            _instanceName = configuration["EvolutionApi:InstanceName"] ?? "PizzariaBot";
        }

        public async Task<bool> SendTextAsync(string remoteJid, string text)
        {
            var url = $"{_baseUrl.TrimEnd('/')}/message/sendText/{_instanceName}";

            // Payload atualizado para a versão 2 da Evolution API
            var payload = new
            {
                number = remoteJid,
                text = text,
                delay = 1200 // Milissegundos de atraso simulando digitação
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            // Criar HttpRequestMessage por requisição evita race condition no HttpClient multithread
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = content
            };
            request.Headers.Add("apikey", _apiKey);

            var response = await _httpClient.SendAsync(request);

            return response.IsSuccessStatusCode;
        }
    }
}
