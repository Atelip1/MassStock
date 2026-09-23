using MassStock.Api.Data;
using MassStock.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/reportes")]
[Authorize(Roles = "administrador,encargado")]
public class ReportesController : ControllerBase
{
    private readonly MassStockContext _db;

    public ReportesController(MassStockContext db)
    {
        _db = db;
    }

    // GET /api/reportes/rotacion?dias=30 → HU04: actividad de movimientos
    // por producto en el rango de días indicado (ingresos vs reposiciones),
    // como proxy de rotación para decidir qué reponer con más frecuencia.
    [HttpGet("rotacion")]
    public async Task<ActionResult<IEnumerable<RotacionProductoDto>>> GetRotacion([FromQuery] int dias = 30)
    {
        if (dias <= 0) dias = 30;
        var desde = DateTimeOffset.UtcNow.AddDays(-dias);

        // Paso 1: traer a memoria solo las columnas planas que necesitamos.
        // Esta consulta es simple (Join + Where + Select de escalares) y
        // SIEMPRE se traduce bien a SQL.
        var filas = await _db.MovimientosStock
            .Where(m => m.CreatedAt >= desde)
            .Join(_db.Productos, m => m.ProductoId, p => p.Id, (m, p) => new
            {
                p.Id,
                p.Sku,
                p.Nombre,
                p.Categoria,
                m.Tipo,
                m.Cantidad,
            })
            .ToListAsync();

        // Paso 2: agrupar y sumar en memoria (LINQ to Objects). Evita el
        // error de EF Core al intentar traducir GroupBy + sumas
        // condicionales + OrderBy sobre un record ya proyectado.
        var resultado = filas
            .GroupBy(x => new { x.Id, x.Sku, x.Nombre, x.Categoria })
            .Select(g => new RotacionProductoDto(
                g.Key.Id,
                g.Key.Sku,
                g.Key.Nombre,
                g.Key.Categoria,
                g.Where(x => x.Tipo == "ingreso").Sum(x => x.Cantidad),
                g.Where(x => x.Tipo == "reposicion").Sum(x => x.Cantidad),
                g.Where(x => x.Tipo == "venta" || x.Tipo == "ajuste").Sum(x => x.Cantidad),
                g.Count()
            ))
            .OrderByDescending(r => r.TotalIngresado + r.TotalRepuesto + r.TotalSalida)
            .ToList();

        return Ok(resultado);
    }

    // GET /api/reportes/tendencia?dias=7 → actividad total (unidades
    // movidas) por día, para dibujar sparklines en el dashboard de inicio.
    [HttpGet("tendencia")]
    public async Task<ActionResult<IEnumerable<TendenciaDiaDto>>> GetTendencia([FromQuery] int dias = 7)
    {
        if (dias <= 0 || dias > 60) dias = 7;

        // Límite del rango en UTC explícito (evita corrimientos si el
        // servidor corre en otra zona horaria).
        var hoyUtc = DateTimeOffset.UtcNow;
        var desde = new DateTimeOffset(hoyUtc.Year, hoyUtc.Month, hoyUtc.Day, 0, 0, 0, TimeSpan.Zero)
            .AddDays(-(dias - 1));

        var filas = await _db.MovimientosStock
            .Where(m => m.CreatedAt >= desde)
            .Select(m => new { m.CreatedAt, m.Cantidad })
            .ToListAsync();

        var porDia = filas
            .GroupBy(m => m.CreatedAt.UtcDateTime.Date)
            .ToDictionary(g => g.Key, g => g.Sum(m => m.Cantidad));

        var resultado = Enumerable.Range(0, dias)
            .Select(i => desde.AddDays(i))
            .Select(fecha => new TendenciaDiaDto(
                fecha.ToString("yyyy-MM-dd"),
                porDia.TryGetValue(fecha.UtcDateTime.Date, out var total) ? total : 0
            ))
            .ToList();

        return Ok(resultado);
    }
}
