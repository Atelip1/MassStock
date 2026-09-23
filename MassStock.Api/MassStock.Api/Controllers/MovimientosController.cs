using MassStock.Api.Data;
using MassStock.Api.Dtos;
using MassStock.Api.Hubs;
using MassStock.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/movimientos")]
[Authorize]
public class MovimientosController : ControllerBase
{
    private readonly MassStockContext _db;
    private readonly IHubContext<StockHub> _hub;

    public MovimientosController(MassStockContext db, IHubContext<StockHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // POST /api/movimientos/ingreso → HU05: registrar ingreso de mercadería
    // de proveedor. Administrador o encargado. El trigger SQL en Supabase suma
    // la cantidad a productos.stock_actual; aquí insertamos el movimiento
    // y avisamos por SignalR a los clientes conectados.
    [HttpPost("ingreso")]
    [Authorize(Roles = "administrador,encargado")]
    public async Task<IActionResult> RegistrarIngreso(RegistrarIngresoDto dto)
    {
        if (dto.Cantidad <= 0)
            return BadRequest(new { error = "La cantidad debe ser mayor a 0." });

        var existeProducto = await _db.Productos.AnyAsync(p => p.Id == dto.ProductoId);
        if (!existeProducto)
            return NotFound(new { error = "Producto no encontrado." });

        var movimiento = new MovimientoStock
        {
            Id = Guid.NewGuid(),
            ProductoId = dto.ProductoId,
            Tipo = "ingreso",
            Cantidad = dto.Cantidad,
            GuiaRemision = dto.GuiaRemision,
            Usuario = dto.Usuario,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.MovimientosStock.Add(movimiento);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("stockActualizado");

        return Ok(new { movimiento.Id });
    }

    // POST /api/movimientos/reposicion → HU02: registrar reposición de
    // percha. Administrador, encargado o reponedor. Usa el mismo trigger SQL (suma a
    // stock_actual) porque 'reposicion' ya está permitido en el check de
    // movimientos_stock.tipo.
    [HttpPost("reposicion")]
    [Authorize(Roles = "administrador,encargado,reponedor")]
    public async Task<IActionResult> RegistrarReposicion(RegistrarReposicionDto dto)
    {
        if (dto.Cantidad <= 0)
            return BadRequest(new { error = "La cantidad debe ser mayor a 0." });

        var existeProducto = await _db.Productos.AnyAsync(p => p.Id == dto.ProductoId);
        if (!existeProducto)
            return NotFound(new { error = "Producto no encontrado." });

        var movimiento = new MovimientoStock
        {
            Id = Guid.NewGuid(),
            ProductoId = dto.ProductoId,
            Tipo = "reposicion",
            Cantidad = dto.Cantidad,
            Usuario = dto.Usuario,
            Nota = dto.Nota,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.MovimientosStock.Add(movimiento);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("stockActualizado");

        return Ok(new { movimiento.Id });
    }

    // POST /api/movimientos/salida → venta, merma, vencimiento o ajuste
    // de conteo cíclico. Administrador o encargado. El trigger SQL resta
    // la cantidad de stock_actual porque 'venta'/'ajuste' ya están
    // contemplados en el check de movimientos_stock.tipo.
    [HttpPost("salida")]
    [Authorize(Roles = "administrador,encargado")]
    public async Task<IActionResult> RegistrarSalida(RegistrarSalidaDto dto)
    {
        if (dto.Cantidad <= 0)
            return BadRequest(new { error = "La cantidad debe ser mayor a 0." });

        if (dto.Tipo != "venta" && dto.Tipo != "ajuste")
            return BadRequest(new { error = "Tipo de salida inválido." });

        var producto = await _db.Productos.FindAsync(dto.ProductoId);
        if (producto is null)
            return NotFound(new { error = "Producto no encontrado." });

        if (producto.StockActual < dto.Cantidad)
            return BadRequest(new { error = $"No hay suficiente stock. Disponible: {producto.StockActual}." });

        var movimiento = new MovimientoStock
        {
            Id = Guid.NewGuid(),
            ProductoId = dto.ProductoId,
            Tipo = dto.Tipo,
            Cantidad = dto.Cantidad,
            Nota = dto.Motivo,
            Usuario = dto.Usuario,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.MovimientosStock.Add(movimiento);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("stockActualizado");

        return Ok(new { movimiento.Id });
    }
    // GET /api/movimientos/historial → auditoría: últimos movimientos con
    // el nombre del producto ya resuelto. Sirve como evidencia de uso real
    // del sistema para el capítulo 7.6 (seguimiento y evidencias).
    [HttpGet("historial")]
    [Authorize(Roles = "administrador,encargado,reponedor")] // reponedor: solo para calcular el flujo de reposición
    public async Task<ActionResult<IEnumerable<MovimientoHistorialDto>>> GetHistorial([FromQuery] int limite = 100)
    {
        if (limite <= 0 || limite > 500) limite = 100;

        var historial = await _db.MovimientosStock
            .OrderByDescending(m => m.CreatedAt)
            .Take(limite)
            .Join(_db.Productos, m => m.ProductoId, p => p.Id, (m, p) => new MovimientoHistorialDto(
                m.Id, p.Nombre, p.Sku, m.Tipo, m.Cantidad, m.GuiaRemision, m.Nota, m.Usuario, m.CreatedAt))
            .ToListAsync();

        return Ok(historial);
    }
}
