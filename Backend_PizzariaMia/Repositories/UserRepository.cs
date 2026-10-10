using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public class UserRepository : Repository<User>, IUserRepository
    {
        public UserRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByPhoneAsync(string phone)
        {
            return await _dbSet.FirstOrDefaultAsync(u => u.Phone == phone);
        }
    }
}
