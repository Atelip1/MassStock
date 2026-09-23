using MassStock.Api.Data;
using MassStock.Api.Dtos;
using MassStock.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/proveedores")]
[Authorize]
public class ProveedoresController : ControllerBase
{
    private readonly MassStockContext _db;

    public ProveedoresController(MassStockContext db)
    {
        _db = db;
    }

    // GET /api/proveedores → para el <select> del formulario de productos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProveedorDto>>> GetProveedores()
    {
        var proveedores = await _db.Proveedores
            .OrderBy(p => p.Nombre)
            .Select(p => new ProveedorDto(p.Id, p.Nombre, p.Contacto))
            .ToListAsync();

        return Ok(proveedores);
    }

    // POST /api/proveedores → alta rápida de proveedor. Solo administrador.
    [HttpPost]
    [Authorize(Roles = "administrador")]
    public async Task<ActionResult<ProveedorDto>> CrearProveedor(CrearProveedorDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { error = "El nombre del proveedor es obligatorio." });

        var proveedor = new Proveedor
        {
            Id = Guid.NewGuid(),
            Nombre = dto.Nombre.Trim(),
            Contacto = dto.Contacto,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Proveedores.Add(proveedor);
        await _db.SaveChangesAsync();

        return Ok(new ProveedorDto(proveedor.Id, proveedor.Nombre, proveedor.Contacto));
    }
}
