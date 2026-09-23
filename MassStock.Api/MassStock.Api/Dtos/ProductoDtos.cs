namespace MassStock.Api.Dtos;

public record ProductoDto(
    Guid Id,
    string Sku,
    string Nombre,
    string? Categoria,
    int StockActual,
    int StockMinimo
);

public record ProductoOpcionDto(
    Guid Id,
    string Sku,
    string Nombre
);

public class RegistrarIngresoDto
{
    public Guid ProductoId { get; set; }
    public int Cantidad { get; set; }
    public string? GuiaRemision { get; set; }
    public string? Usuario { get; set; }
}

// HU02: registrar reposición de percha (no tiene guía de remisión,
// porque el producto ya está en tienda; opcionalmente indica dónde).
public class RegistrarReposicionDto
{
    public Guid ProductoId { get; set; }
    public int Cantidad { get; set; }
    public string? Usuario { get; set; }
    public string? Nota { get; set; }
}

// Registrar salida de stock: venta, merma, vencimiento o corrección de
// conteo cíclico. 'Tipo' debe ser 'venta' o 'ajuste' (los únicos que el
// trigger SQL resta de stock_actual).
public class RegistrarSalidaDto
{
    public Guid ProductoId { get; set; }
    public int Cantidad { get; set; }
    public string Tipo { get; set; } = "ajuste"; // 'venta' | 'ajuste'
    public string? Motivo { get; set; }
    public string? Usuario { get; set; }
}

// HU03: producto en quiebre o por debajo de su stock mínimo.
public record ProductoAlertaDto(
    Guid Id,
    string Sku,
    string Nombre,
    string? Categoria,
    int StockActual,
    int StockMinimo,
    int Faltante
);

// HU04: actividad de movimientos por producto en un rango de días,
// usado como indicador de rotación (qué tanto se mueve cada producto).
public record RotacionProductoDto(
    Guid ProductoId,
    string Sku,
    string Nombre,
    string? Categoria,
    int TotalIngresado,
    int TotalRepuesto,
    int TotalSalida,
    int Movimientos
);

// Actividad total (unidades movidas) de un día, para sparklines.
public record TendenciaDiaDto(string Fecha, int TotalUnidades);

// ---- Catálogo (gestión de productos, solo administrador) ----------

public class CrearProductoDto
{
    public string Sku { get; set; } = default!;
    public string Nombre { get; set; } = default!;
    public string? Categoria { get; set; }
    public string Unidad { get; set; } = "unidad";
    public int StockMinimo { get; set; }
    public int StockInicial { get; set; } = 0;
    public Guid? ProveedorId { get; set; }
}

public class ActualizarProductoDto
{
    public string Nombre { get; set; } = default!;
    public string? Categoria { get; set; }
    public string Unidad { get; set; } = "unidad";
    public int StockMinimo { get; set; }
    public Guid? ProveedorId { get; set; }
}

// ---- Proveedores ----------------------------------------------------

public record ProveedorDto(Guid Id, string Nombre, string? Contacto);

public class CrearProveedorDto
{
    public string Nombre { get; set; } = default!;
    public string? Contacto { get; set; }
}

// ---- Historial de movimientos (auditoría) ----------------------------

public record MovimientoHistorialDto(
    Guid Id,
    string ProductoNombre,
    string ProductoSku,
    string Tipo,
    int Cantidad,
    string? GuiaRemision,
    string? Nota,
    string? Usuario,
    DateTimeOffset CreatedAt
);
