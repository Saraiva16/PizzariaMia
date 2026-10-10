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

        [HttpPost("seed")]
        public async Task<IActionResult> SeedPizzas()
        {
            var currentPizzas = await _pizzaRepository.GetAllAsync();
            if (currentPizzas.Any())
                return Ok("Database already seeded");

            // Inserting pizzas explicitly ignoring auto increment issues might be tricky if we enforce Id. Let's not set Id explicitly so EF Core handles it.
            var pizzas = new List<Pizza>
            {
                new Pizza
                {
                    Name = "Calabresa Especial",
                    Description = "Molho pelati italiano, calabresa fatiada crocante, cebola roxa marinada e azeitonas pretas chilenas.",
                    Price = 54.90m,
                    ImageUrl = "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80",
                    Badge = "Mais Pedida",
                    StandarSize = "8 fatias"
                },
                new Pizza
                {
                    Name = "Quatro Queijos Premium",
                    Description = "Base de muçarela artesanal, queijo gorgonzola curado, provolone defumado e catupiry legítimo.",
                    Price = 62.90m,
                    ImageUrl = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
                    Badge = "Favorita do Chefe",
                    StandarSize = "8 fatias"
                },
                new Pizza
                {
                    Name = "Marguerita D'Itália",
                    Description = "Muçarela de búfala fresca, fatias de tomate cereja confitados, azeite extravirgem e manjericão fresco.",
                    Price = 58.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80",
                    Badge = "Vegetariana",
                    StandarSize = "8 fatias"
                },
                new Pizza
                {
                    Name = "Frango Desfiado Catupiry",
                    Description = "Peito de frango temperado e desfiado, coberto com autêntico requeijão Catupiry e milho verde fresco.",
                    Price = 56.90m,
                    ImageUrl = "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
                    Badge = "",
                    StandarSize = "8 fatias"
                }
            };

            foreach (var p in pizzas)
            {
                await _pizzaRepository.AddAsync(p);
            }

            return Ok("Pizzas inseridas com sucesso.");
        }
    }
}
