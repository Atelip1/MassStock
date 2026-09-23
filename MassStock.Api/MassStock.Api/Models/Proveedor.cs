namespace MassStock.Api.Models;

public class Proveedor
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = default!;
    public string? Contacto { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
