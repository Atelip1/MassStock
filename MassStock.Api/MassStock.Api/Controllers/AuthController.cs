using System.Security.Claims;
using MassStock.Api.Data;
using MassStock.Api.Dtos;
using MassStock.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly MassStockContext _db;
    private readonly JwtService _jwt;

    public AuthController(MassStockContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(LoginDto dto)
    {
        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Email == dto.Email.Trim().ToLower() && u.Activo);

        if (usuario is null || !PasswordHasher.Verify(dto.Password, usuario.PasswordHash))
            return Unauthorized(new { error = "Correo o contraseña incorrectos." });

        var token = _jwt.GenerarToken(usuario);
        var usuarioDto = new UsuarioDto(usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol);

        return Ok(new LoginResponseDto(token, usuarioDto));
    }

    // POST /api/auth/cambiar-password → el propio usuario cambia su clave
    // (requiere la actual). Para reseteos sin conocer la clave actual,
    // el administrador lo hace desde Gestión de usuarios.
    [HttpPost("cambiar-password")]
    [Authorize]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (userId is null || !Guid.TryParse(userId, out var id))
            return Unauthorized();

        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario is null) return NotFound();

        if (!PasswordHasher.Verify(dto.PasswordActual, usuario.PasswordHash))
            return BadRequest(new { error = "La contraseña actual no es correcta." });

        if (string.IsNullOrWhiteSpace(dto.PasswordNueva) || dto.PasswordNueva.Length < 6)
            return BadRequest(new { error = "La nueva contraseña debe tener al menos 6 caracteres." });

        usuario.PasswordHash = PasswordHasher.Hash(dto.PasswordNueva);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
