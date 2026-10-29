using KCStoreCore.Application.Interfaces;
using KCStoreCore.Infrastructure.Persistence;
using KCStoreCore.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register API controllers.
builder.Services.AddControllers();

// Register OpenAPI documentation.
builder.Services.AddOpenApi();

// Register the SQL Server database context.
builder.Services.AddDbContext<KCStoreCoreDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// Register category management services.
builder.Services.AddScoped<ICategoryService, CategoryService>();

var app = builder.Build();

// Enable OpenAPI documentation in development.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();