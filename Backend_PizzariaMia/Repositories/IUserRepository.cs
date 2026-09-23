using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public interface IUserRepository : IRepository<Usuario>
    {
        Task<Usuario?> GetByEmailAsync(string email);
    }
}
