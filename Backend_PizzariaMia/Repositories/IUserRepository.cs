using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByEmailAsync(string email);
    }
}
