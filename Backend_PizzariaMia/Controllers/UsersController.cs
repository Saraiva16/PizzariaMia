using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
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
    }
}
