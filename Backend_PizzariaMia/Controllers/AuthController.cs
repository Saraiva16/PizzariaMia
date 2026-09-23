using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PizzariaMia.DTOs;
using PizzariaMia.Models;
using PizzariaMia.Utils;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<Usuario> _userManager;
        private readonly RoleManager<IdentityRole<int>> _roleManager;

        public AuthController(UserManager<Usuario> userManager, RoleManager<IdentityRole<int>> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
        }

        [HttpPost("register-internal")]
        public async Task<IActionResult> RegisterInternal([FromBody] RegisterUsuarioInternoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userExists = await _userManager.FindByEmailAsync(dto.Email);
            if (userExists != null)
                return BadRequest(new { message = "Email já cadastrado." });

            var usuario = new UsuarioInterno
            {
                UserName = dto.Email,
                Email = dto.Email,
                Name = dto.Nome
            };

            var result = await _userManager.CreateAsync(usuario, dto.Senha);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            // Create role if it doesn't exist
            if (!await _roleManager.RoleExistsAsync(dto.Role))
                await _roleManager.CreateAsync(new IdentityRole<int>(dto.Role));

            await _userManager.AddToRoleAsync(usuario, dto.Role);

            return Ok(new { message = "Usuário interno criado com sucesso." });
        }

        [HttpPost("register-client")]
        public async Task<IActionResult> RegisterClient([FromBody] RegisterClienteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!string.IsNullOrWhiteSpace(dto.Cpf) && !CpfValidator.IsValid(dto.Cpf))
                return BadRequest(new { message = "CPF inválido." });

            var userExists = await _userManager.FindByEmailAsync(dto.Email);
            if (userExists != null)
                return BadRequest(new { message = "Email já cadastrado." });

            var cliente = new Cliente
            {
                UserName = dto.Email,
                Email = dto.Email,
                Name = dto.Nome,
                Telefone = dto.Telefone,
                Endereco = dto.Endereco,
                Cep = dto.Cep,
                Numero = dto.Numero,
                Complemento = dto.Complemento,
                Cpf = dto.Cpf
            };

            var result = await _userManager.CreateAsync(cliente, dto.Senha);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            // Create Client role
            if (!await _roleManager.RoleExistsAsync("Cliente"))
                await _roleManager.CreateAsync(new IdentityRole<int>("Cliente"));

            await _userManager.AddToRoleAsync(cliente, "Cliente");

            return Ok(new { message = "Cliente criado com sucesso." });
        }
    }
}
