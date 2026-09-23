using System.ComponentModel.DataAnnotations;

namespace PizzariaMia.DTOs
{
    public class RegisterUsuarioInternoDto
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O email é obrigatório.")]
        [EmailAddress(ErrorMessage = "Formato de email inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "A senha é obrigatória.")]
        [MinLength(6, ErrorMessage = "A senha deve ter no mínimo 6 caracteres.")]
        public string Senha { get; set; } = string.Empty;

        [Required(ErrorMessage = "O papel (role) é obrigatório.")]
        public string Role { get; set; } = "Atendente"; // e.g. "Admin", "Atendente"
    }
}
