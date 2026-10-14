using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public class PizzaRepository : Repository<Pizza>, IPizzaRepository
    {
        public PizzaRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Pizza>> GetActivePizzasAsync()
        {
            return await _dbSet.Include(p => p.Ingredients).Where(p => p.Active).ToListAsync();
        }
    }
}
