using KCStoreCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure OpenAPI documentation.
builder.Services.AddOpenApi();

// Retrieve the SQL Server connection string.
var connectionString = builder.Configuration.GetConnectionString(
    "DefaultConnection"
);

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "The database connection string 'DefaultConnection' was not found."
    );
}

// Register Entity Framework Core with SQL Server.
builder.Services.AddDbContext<KCStoreCoreDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();