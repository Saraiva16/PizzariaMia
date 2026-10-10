using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.DTOs;
using PizzariaMia.Models;
using System.Security.Claims;

namespace PizzariaMia.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AddressesController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                throw new UnauthorizedAccessException();
            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyAddresses()
        {
            try
            {
                var userId = GetUserId();
                var addresses = await _context.Addresses
                    .Where(a => a.UserId == userId)
                    .OrderByDescending(a => a.IsMain) // Principal aparece primeiro
                    .Select(a => new AddressDto
                    {
                        Id = a.Id,
                        Label = a.Label,
                        StreetAndNumber = a.StreetAndNumber,
                        IsMain = a.IsMain
                    })
                    .ToListAsync();

                return Ok(addresses);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateAddress([FromBody] AddressDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = GetUserId();

                // Se for o primeiro endereço ou marcado como principal, desmarcar os outros
                var existingAddresses = await _context.Addresses.Where(a => a.UserId == userId).ToListAsync();
                if (!existingAddresses.Any())
                {
                    dto.IsMain = true;
                }
                else if (dto.IsMain)
                {
                    foreach (var addr in existingAddresses)
                    {
                        addr.IsMain = false;
                    }
                }

                var address = new Address
                {
                    UserId = userId,
                    Label = dto.Label,
                    StreetAndNumber = dto.StreetAndNumber,
                    IsMain = dto.IsMain
                };

                _context.Addresses.Add(address);
                await _context.SaveChangesAsync();

                dto.Id = address.Id;
                return Ok(dto);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAddress(int id, [FromBody] AddressDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = GetUserId();
                var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

                if (address == null)
                    return NotFound(new { error = "Endereço não encontrado." });

                address.Label = dto.Label;
                address.StreetAndNumber = dto.StreetAndNumber;

                if (dto.IsMain && !address.IsMain)
                {
                    var allAddresses = await _context.Addresses.Where(a => a.UserId == userId).ToListAsync();
                    foreach (var addr in allAddresses)
                    {
                        addr.IsMain = false;
                    }
                    address.IsMain = true;
                }
                else if (!dto.IsMain)
                {
                    address.IsMain = false;
                }

                await _context.SaveChangesAsync();
                return Ok(dto);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            try
            {
                var userId = GetUserId();
                var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

                if (address == null)
                    return NotFound(new { error = "Endereço não encontrado." });

                // Retira a dependência nos pedidos antes de deletar
                var ordersWithAddress = await _context.Orders.Where(o => o.AddressId == id).ToListAsync();
                if (ordersWithAddress.Any())
                {
                    foreach(var order in ordersWithAddress)
                    {
                        order.AddressId = null;
                    }
                    await _context.SaveChangesAsync();
                }

                _context.Addresses.Remove(address);
                await _context.SaveChangesAsync();

                // Se deletou o principal, promove outro
                if (address.IsMain)
                {
                    var nextMain = await _context.Addresses.FirstOrDefaultAsync(a => a.UserId == userId);
                    if (nextMain != null)
                    {
                        nextMain.IsMain = true;
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new { message = "Endereço removido com sucesso." });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Erro interno ao tentar deletar o endereço." });
            }
        }
    }
}
