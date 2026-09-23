using Microsoft.AspNetCore.SignalR;

namespace MassStock.Api.Hubs;

// Los clientes (Angular) solo escuchan el evento "stockActualizado";
// no necesitan invocar métodos en este hub.
public class StockHub : Hub
{
}
