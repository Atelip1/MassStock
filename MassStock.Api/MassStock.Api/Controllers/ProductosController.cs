using MassStock.Api.Data;
using MassStock.Api.Dtos;
using MassStock.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/productos")]
[Authorize]
public class ProductosController : ControllerBase
{
    private readonly MassStockContext _db;

    public ProductosController(MassStockContext db)
    {
        _db = db;
    }

    // GET /api/productos  → HU01: stock actual de todos los productos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductoDto>>> GetProductos()
    {
        var productos = await _db.Productos
            .OrderBy(p => p.Nombre)
            .Select(p => new ProductoDto(p.Id, p.Sku, p.Nombre, p.Categoria, p.StockActual, p.StockMinimo))
            .ToListAsync();

        return Ok(productos);
    }

    // GET /api/productos/opciones → lista liviana para el <select> de ingreso
    [HttpGet("opciones")]
    public async Task<ActionResult<IEnumerable<ProductoOpcionDto>>> GetOpciones()
    {
        var productos = await _db.Productos
            .OrderBy(p => p.Nombre)
            .Select(p => new ProductoOpcionDto(p.Id, p.Sku, p.Nombre))
            .ToListAsync();

        return Ok(productos);
    }

    // GET /api/productos/alertas → HU03: productos en quiebre o por debajo del mínimo
    [HttpGet("alertas")]
    public async Task<ActionResult<IEnumerable<ProductoAlertaDto>>> GetAlertas()
    {
        var alertas = await _db.Productos
            .Where(p => p.StockActual <= p.StockMinimo)
            .OrderByDescending(p => p.StockMinimo - p.StockActual)
            .Select(p => new ProductoAlertaDto(
                p.Id, p.Sku, p.Nombre, p.Categoria, p.StockActual, p.StockMinimo,
                p.StockMinimo - p.StockActual))
            .ToListAsync();

        return Ok(alertas);
    }

    // POST /api/productos → dar de alta un producto nuevo en el catálogo.
    // Solo administrador. El stock inicial se guarda directo (es un conteo
    // de alta, no pasa por movimientos_stock).
    [HttpPost]
    [Authorize(Roles = "administrador")]
    public async Task<ActionResult<ProductoDto>> CrearProducto(CrearProductoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Sku) || string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { error = "SKU y nombre son obligatorios." });

        if (await _db.Productos.AnyAsync(p => p.Sku == dto.Sku))
            return Conflict(new { error = "Ya existe un producto con ese SKU." });

        var producto = new Producto
        {
            Id = Guid.NewGuid(),
            Sku = dto.Sku.Trim(),
            Nombre = dto.Nombre.Trim(),
            Categoria = dto.Categoria,
            Unidad = string.IsNullOrWhiteSpace(dto.Unidad) ? "unidad" : dto.Unidad,
            StockMinimo = dto.StockMinimo,
            StockActual = dto.StockInicial,
            ProveedorId = dto.ProveedorId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();

        return Ok(new ProductoDto(producto.Id, producto.Sku, producto.Nombre, producto.Categoria, producto.StockActual, producto.StockMinimo));
    }

    // PUT /api/productos/{id} → editar datos de un producto (no toca stock_actual;
    // eso solo cambia por movimientos_stock, vía ingreso/reposición).
    [HttpPut("{id}")]
    [Authorize(Roles = "administrador")]
    public async Task<IActionResult> ActualizarProducto(Guid id, ActualizarProductoDto dto)
    {
        var producto = await _db.Productos.FindAsync(id);
        if (producto is null) return NotFound(new { error = "Producto no encontrado." });

        producto.Nombre = dto.Nombre.Trim();
        producto.Categoria = dto.Categoria;
        producto.Unidad = string.IsNullOrWhiteSpace(dto.Unidad) ? "unidad" : dto.Unidad;
        producto.StockMinimo = dto.StockMinimo;
        producto.ProveedorId = dto.ProveedorId;
        producto.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}