using Microsoft.AspNetCore.Mvc;
using PizzariaMia.Models;
using PizzariaMia.Repositories;

namespace PizzariaMia.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PizzasController : ControllerBase
    {
        private readonly IPizzaRepository _pizzaRepository;

        public PizzasController(IPizzaRepository pizzaRepository)
        {
            _pizzaRepository = pizzaRepository;
        }

        // GET: api/Pizzas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Pizza>>> GetPizzas()
        {
            var pizzas = await _pizzaRepository.GetAllAsync();
            return Ok(pizzas);
        }

        // GET: api/Pizzas/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Pizza>>> GetActivePizzas()
        {
            var pizzas = await _pizzaRepository.GetActivePizzasAsync();
            return Ok(pizzas);
        }

        // GET: api/Pizzas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Pizza>> GetPizza(int id)
        {
            var pizza = await _pizzaRepository.GetByIdAsync(id);

            if (pizza == null)
            {
                return NotFound();
            }

            return Ok(pizza);
        }

        // POST: api/Pizzas
        [HttpPost]
        public async Task<ActionResult<Pizza>> PostPizza([FromForm] PizzariaMia.DTOs.PizzaCreateDto dto)
        {
            if (dto.Image == null || dto.Image.Length == 0)
            {
                return BadRequest("A imagem é obrigatória.");
            }

            var imagesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images");
            if (!Directory.Exists(imagesFolder))
            {
                Directory.CreateDirectory(imagesFolder);
            }

            // Gerar um nome único para o arquivo
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(dto.Image.FileName);
            var filePath = Path.Combine(imagesFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.Image.CopyToAsync(stream);
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
            var imageUrl = $"{baseUrl}/images/{fileName}";

            var pizza = new Pizza
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                Badge = dto.Badge,
                StandarSize = dto.StandarSize,
                Active = dto.Active,
                ImageUrl = imageUrl
            };

            await _pizzaRepository.AddAsync(pizza);
            
            return CreatedAtAction(nameof(GetPizza), new { id = pizza.Id }, pizza);
        }
    }
}
