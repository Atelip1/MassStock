using MassStock.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MassStock.Api.Data;

// Este DbContext NO usa migraciones de EF: las tablas ya existen en
// Supabase (creadas por schema.sql). Aquí solo se mapean los nombres
// de tabla/columna en snake_case a las clases en PascalCase de C#.
public class MassStockContext : DbContext
{
    public MassStockContext(DbContextOptions<MassStockContext> options) : base(options) { }

    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<MovimientoStock> MovimientosStock => Set<MovimientoStock>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Producto>(e =>
        {
            e.ToTable("productos");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.Sku).HasColumnName("sku");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.Categoria).HasColumnName("categoria");
            e.Property(p => p.Unidad).HasColumnName("unidad");
            e.Property(p => p.StockActual).HasColumnName("stock_actual");
            e.Property(p => p.StockMinimo).HasColumnName("stock_minimo");
            e.Property(p => p.ProveedorId).HasColumnName("proveedor_id");
            e.Property(p => p.CreatedAt).HasColumnName("created_at");
            e.Property(p => p.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Proveedor>(e =>
        {
            e.ToTable("proveedores");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.Nombre).HasColumnName("nombre");
            e.Property(p => p.Contacto).HasColumnName("contacto");
            e.Property(p => p.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<MovimientoStock>(e =>
        {
            e.ToTable("movimientos_stock");
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).HasColumnName("id");
            e.Property(m => m.ProductoId).HasColumnName("producto_id");
            e.Property(m => m.Tipo).HasColumnName("tipo");
            e.Property(m => m.Cantidad).HasColumnName("cantidad");
            e.Property(m => m.GuiaRemision).HasColumnName("guia_remision");
            e.Property(m => m.Usuario).HasColumnName("usuario");
            e.Property(m => m.Nota).HasColumnName("nota");
            e.Property(m => m.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("usuarios");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id");
            e.Property(u => u.Nombre).HasColumnName("nombre");
            e.Property(u => u.Email).HasColumnName("email");
            e.Property(u => u.PasswordHash).HasColumnName("password_hash");
            e.Property(u => u.Rol).HasColumnName("rol");
            e.Property(u => u.Activo).HasColumnName("activo");
            e.Property(u => u.CreatedAt).HasColumnName("created_at");
        });
    }
}