using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public class OrderRepository : Repository<Order>, IOrderRepository
    {
        public OrderRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Order>> GetOrdersByUserIdAsync(int userId)
        {
            return await _dbSet
                .Include(o => o.Items)
                .ThenInclude(i => i.Pizza)
                .Where(o => o.UserId == userId)
                .ToListAsync();
        }

        public async Task<Order?> GetOrderWithItemsAsync(int orderId)
        {
            return await _dbSet
                .Include(o => o.Items)
                .ThenInclude(i => i.Pizza)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }
    }
}
