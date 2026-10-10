using System.ComponentModel.DataAnnotations;

namespace PizzariaMia.DTOs
{
    public class AddressDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "O rótulo é obrigatório (ex: Casa, Trabalho).")]
        [MaxLength(50)]
        public string Label { get; set; } = string.Empty;

        [Required(ErrorMessage = "O endereço é obrigatório.")]
        [MaxLength(255)]
        public string StreetAndNumber { get; set; } = string.Empty;

        public bool IsMain { get; set; }
    }
}
