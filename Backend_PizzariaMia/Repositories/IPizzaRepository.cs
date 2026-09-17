using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public interface IPizzaRepository : IRepository<Pizza>
    {
        Task<IEnumerable<Pizza>> GetActivePizzasAsync();
    }
}
