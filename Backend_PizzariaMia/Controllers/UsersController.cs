using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Models;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")] // Apenas atendentes podem buscar clientes
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
                return BadRequest("Query is required.");
            }

            var users = await _context.Users
                .Where(u => u.Role == "Customer" && 
                            (u.Name.ToLower().Contains(query.ToLower()) || u.Email.Contains(query)))
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email, // Usado como telefone provisoriamente
                    u.Role
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
