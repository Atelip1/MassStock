using System.Text;
using MassStock.Api.Data;
using MassStock.Api.Hubs;
using MassStock.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddScoped<JwtService>();

// --- Base de datos Supabase ---
// En Vercel no existe appsettings.json (está en .gitignore): configurar las
// variables de entorno ConnectionStrings__Supabase y Jwt__Key / Jwt__Issuer.
var connectionString = builder.Configuration.GetConnectionString("Supabase");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Falta la variable de entorno ConnectionStrings__Supabase.");

// El pooler de Supabase en modo transacción (puerto 6543) se cuelga con el
// DISCARD ALL que Npgsql envía al reutilizar conexiones (~30 s por consulta).
connectionString = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
{
    NoResetOnClose = true
}.ConnectionString;

builder.Services.AddDbContext<MassStockContext>(options =>
    options.UseNpgsql(
        connectionString,
        npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null
            );
        }
    ));

// --- Autenticación JWT ---
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Falta la variable de entorno Jwt__Key.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Issuer"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey)
                ),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// --- CORS ---
const string AngularDevPolicy = "AngularDev";

builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularDevPolicy, policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
                origin == "https://mass-stock.vercel.app" ||
                origin == "http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// --- Middleware ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(AngularDevPolicy);

app.UseAuthentication();
app.UseAuthorization();

// --- Controladores ---
app.MapControllers();

// --- SignalR ---
app.MapHub<StockHub>("/hubs/stock");

app.Run();