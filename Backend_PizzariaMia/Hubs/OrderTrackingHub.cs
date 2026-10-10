using Microsoft.AspNetCore.SignalR;

namespace PizzariaMia.Hubs
{
    public class OrderTrackingHub : Hub
    {
        // O cliente envia "JoinOrderGroup" passando o ID do pedido que quer rastrear
        public async Task JoinOrderGroup(string orderId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
        }

        // O cliente sai do grupo quando sair da tela
        public async Task LeaveOrderGroup(string orderId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Order_{orderId}");
        }
    }
}
