using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using PizzariaMia.Data;
using PizzariaMia.DTOs;
using PizzariaMia.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            // Procura o usuário pelo Email ou Telefone (assumindo que possam digitar telefone no lugar do email para simplificar)
            // No momento, o modelo User tem apenas Email, mas vamos considerar que o Email guarde o telefone ou o email real.
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == loginDto.PhoneOrEmail);

            if (user == null || !VerifyPassword(loginDto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Credenciais inválidas" });
            }

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token = token,
                user = new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = user.Role
                }
            });
        }

        private bool VerifyPassword(string inputPassword, string storedHash)
        {
            // TODO: Na implementação final, deve-se usar BCrypt ou similar para validar o hash.
            // Para simplificar a POC e integração, vamos assumir que o hash é apenas a string limpa se ainda não houver hashing.
            // Num sistema real: return BCrypt.Net.BCrypt.Verify(inputPassword, storedHash);
            return inputPassword == storedHash;
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key is missing");
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role), // Importante para o frontend saber se é Customer ou Admin
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
