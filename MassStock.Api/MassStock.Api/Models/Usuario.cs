namespace MassStock.Api.Models;

public class Usuario
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;

    // 'administrador' | 'encargado' | 'reponedor'
    public string Rol { get; set; } = default!;

    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
}