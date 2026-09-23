namespace MassStock.Api.Models;

public class MovimientoStock
{
    public Guid Id { get; set; }
    public Guid ProductoId { get; set; }

    // 'ingreso' | 'reposicion' | 'venta' | 'ajuste'
    public string Tipo { get; set; } = default!;

    public int Cantidad { get; set; }
    public string? GuiaRemision { get; set; }
    public string? Usuario { get; set; }
    public string? Nota { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
