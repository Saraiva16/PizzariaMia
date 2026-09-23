namespace PizzariaMia.Models
{
    public class Cliente : Usuario
    {
        public string Telefone { get; set; } = string.Empty;
        public string Endereco { get; set; } = string.Empty;
        public string? Cep { get; set; }
        public string Numero { get; set; } = string.Empty;
        public string Complemento { get; set; } = string.Empty;
        public string? Cpf { get; set; }
    }
}
