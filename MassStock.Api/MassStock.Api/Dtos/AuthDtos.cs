namespace MassStock.Api.Dtos;

public class LoginDto
{
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
}

public record UsuarioDto(Guid Id, string Nombre, string Email, string Rol);

public record LoginResponseDto(string Token, UsuarioDto Usuario);

public class CambiarPasswordDto
{
    public string PasswordActual { get; set; } = default!;
    public string PasswordNueva { get; set; } = default!;
}

// ---- Gestión de usuarios (solo administrador) -----------------------

public record UsuarioAdminDto(Guid Id, string Nombre, string Email, string Rol, bool Activo, DateTimeOffset CreatedAt);

public class CrearUsuarioDto
{
    public string Nombre { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string Rol { get; set; } = default!;
}

public class ActualizarUsuarioDto
{
    public string Nombre { get; set; } = default!;
    public string Rol { get; set; } = default!;
    public bool Activo { get; set; } = true;
    // Si viene con valor, el admin está reseteando la contraseña del usuario.
    public string? NuevaPassword { get; set; }
}