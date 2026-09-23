using MassStock.Api.Data;
using MassStock.Api.Dtos;
using MassStock.Api.Models;
using MassStock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "administrador")]
public class UsuariosController : ControllerBase
{
    private static readonly string[] RolesValidos = { "administrador", "encargado", "reponedor" };

    private readonly MassStockContext _db;

    public UsuariosController(MassStockContext db)
    {
        _db = db;
    }

    // GET /api/usuarios
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UsuarioAdminDto>>> GetUsuarios()
    {
        var usuarios = await _db.Usuarios
            .OrderBy(u => u.Nombre)
            .Select(u => new UsuarioAdminDto(u.Id, u.Nombre, u.Email, u.Rol, u.Activo, u.CreatedAt))
            .ToListAsync();

        return Ok(usuarios);
    }

    // POST /api/usuarios
    [HttpPost]
    public async Task<ActionResult<UsuarioAdminDto>> CrearUsuario(CrearUsuarioDto dto)
    {
        var email = dto.Email.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { error = "Nombre y correo son obligatorios." });

        if (!RolesValidos.Contains(dto.Rol))
            return BadRequest(new { error = "Rol inválido." });

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres." });

        if (await _db.Usuarios.AnyAsync(u => u.Email == email))
            return Conflict(new { error = "Ya existe un usuario con ese correo." });

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = dto.Nombre.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.Hash(dto.Password),
            Rol = dto.Rol,
            Activo = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return Ok(new UsuarioAdminDto(usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol, usuario.Activo, usuario.CreatedAt));
    }

    // PUT /api/usuarios/{id} → editar nombre/rol/activo, y opcionalmente
    // resetear la contraseña (el admin no necesita saber la actual).
    [HttpPut("{id}")]
    public async Task<IActionResult> ActualizarUsuario(Guid id, ActualizarUsuarioDto dto)
    {
        if (!RolesValidos.Contains(dto.Rol))
            return BadRequest(new { error = "Rol inválido." });

        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario is null) return NotFound(new { error = "Usuario no encontrado." });

        usuario.Nombre = dto.Nombre.Trim();
        usuario.Rol = dto.Rol;
        usuario.Activo = dto.Activo;

        if (!string.IsNullOrWhiteSpace(dto.NuevaPassword))
        {
            if (dto.NuevaPassword.Length < 6)
                return BadRequest(new { error = "La nueva contraseña debe tener al menos 6 caracteres." });
            usuario.PasswordHash = PasswordHasher.Hash(dto.NuevaPassword);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
