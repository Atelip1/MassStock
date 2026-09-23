// Ajusta esta URL al puerto real en el que corre tu API de C#.
// Al ejecutar `dotnet run` en MassStock.Api, la consola te muestra
// la URL exacta (por defecto http://localhost:5215 con el
// launchSettings.json incluido).
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5215/api',
  hubUrl: 'http://localhost:5215/hubs/stock',
};
