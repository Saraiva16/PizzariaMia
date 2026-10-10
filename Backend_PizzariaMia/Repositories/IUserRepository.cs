using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByPhoneAsync(string phone);
    }
}
