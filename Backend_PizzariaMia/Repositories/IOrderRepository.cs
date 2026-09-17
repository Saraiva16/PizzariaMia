using PizzariaMia.Models;

namespace PizzariaMia.Repositories
{
    public interface IOrderRepository : IRepository<Order>
    {
        Task<IEnumerable<Order>> GetOrdersByUserIdAsync(int userId);
        Task<Order?> GetOrderWithItemsAsync(int orderId);
    }
}
