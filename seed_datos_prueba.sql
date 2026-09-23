-- =========================================================
-- Datos de PRUEBA para desarrollo/demo del prototipo.
-- Ejecutar SOLO después de schema.sql.
-- Estos NO son los datos del Pre-Test/Post-Test del capítulo
-- 7.7 — esos deben salir de la medición real en tienda.
-- =========================================================

insert into proveedores (nombre, contacto) values
  ('Distribuidora Central SAC', 'ventas@distribuidoracentral.pe'),
  ('Alicorp', 'pedidos@alicorp.com.pe'),
  ('Backus', 'canal.tradicional@backus.pe')
on conflict do nothing;

insert into productos (sku, nombre, categoria, unidad, stock_actual, stock_minimo, proveedor_id)
select v.sku, v.nombre, v.categoria, v.unidad, v.stock_actual, v.stock_minimo, p.id
from (values
  ('7751271001234', 'Arroz Costeño 5kg', 'Abarrotes', 'unidad', 18, 10, 'Distribuidora Central SAC'),
  ('7751271005678', 'Aceite Primor 1L',  'Abarrotes', 'unidad', 6,  12, 'Alicorp'),
  ('7750181009911', 'Cerveza Pilsen 620ml', 'Bebidas', 'unidad', 40, 20, 'Backus'),
  ('7751271002222', 'Fideos Don Vittorio 500g', 'Abarrotes', 'unidad', 3, 15, 'Alicorp'),
  ('7750181003333', 'Agua San Luis 625ml', 'Bebidas', 'unidad', 25, 20, 'Backus')
) as v(sku, nombre, categoria, unidad, stock_actual, stock_minimo, proveedor_nombre)
join proveedores p on p.nombre = v.proveedor_nombre
on conflict (sku) do nothing;
