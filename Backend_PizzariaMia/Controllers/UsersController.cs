using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.DTOs;
using PizzariaMia.Models;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Employee")] // Atendentes e Admins podem buscar clientes
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/users/search?query=99999999
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<object>>> SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "O parâmetro de busca é obrigatório." });
            }

            var cleanDigits = new string(query.Where(char.IsDigit).ToArray());
            var trimmedQuery = query.Trim().ToLower();

            var users = await _context.Users
                .Include(u => u.Addresses)
                .Where(u => u.Role == "Customer" &&
                            (u.Phone.Contains(query) ||
                             (cleanDigits.Length > 0 && u.Phone.Contains(cleanDigits)) ||
                             u.Name.ToLower().Contains(trimmedQuery) ||
                             u.Email.ToLower().Contains(trimmedQuery)))
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Phone,
                    u.Email,
                    u.Role,
                    Addresses = u.Addresses.Select(a => new
                    {
                        a.Id,
                        a.Label,
                        a.StreetAndNumber,
                        a.IsMain
                    })
                })
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/users/quick-register
        [HttpPost("quick-register")]
        public async Task<IActionResult> QuickRegisterCustomer([FromBody] QuickRegisterCustomerDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var cleanDigits = new string(model.Phone.Where(char.IsDigit).ToArray());
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Phone == model.Phone || (cleanDigits.Length > 0 && u.Phone == cleanDigits));

            if (existingUser != null)
            {
                return BadRequest(new { error = "Já existe um cliente cadastrado com este telefone." });
            }

            var user = new User
            {
                Name = model.Name.Trim(),
                Phone = model.Phone.Trim(),
                Role = "Customer",
                CreatedAt = DateTime.UtcNow,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                Email = string.Empty
            };

            if (!string.IsNullOrWhiteSpace(model.Address))
            {
                user.Addresses.Add(new Address
                {
                    Label = "Principal",
                    StreetAndNumber = model.Address.Trim(),
                    IsMain = true
                });
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Phone,
                user.Email,
                user.Role,
                Addresses = user.Addresses.Select(a => new
                {
                    a.Id,
                    a.Label,
                    a.StreetAndNumber,
                    a.IsMain
                })
            });
        }
    }
}
