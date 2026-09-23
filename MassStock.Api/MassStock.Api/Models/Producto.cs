namespace MassStock.Api.Models;

public class Producto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = default!;
    public string Nombre { get; set; } = default!;
    public string? Categoria { get; set; }
    public string Unidad { get; set; } = "unidad";
    public int StockActual { get; set; }
    public int StockMinimo { get; set; }
    public Guid? ProveedorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
