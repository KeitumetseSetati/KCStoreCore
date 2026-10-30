
using System.Text.Json;
using KCStoreCore.Application.DTOs.UserManagement;
using KCStoreCore.Application.Security;
using KCStoreCore.Infrastructure.Identity;
using KCStoreCore.Infrastructure.Persistence;
using KCStoreCore.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KCStoreCore.Tests.Integration;

[Collection("SQL Server Integration")]
public sealed class UserRolePersistenceTests
{
    [Fact]
    public async Task UpdateRoleAsync_StaffToManager_PersistsRoleInSqlServer()
    {
        // Locate the existing development configuration.
        var configurationPath = Path.GetFullPath(
            Path.Combine(
                AppContext.BaseDirectory,
                "..", "..", "..", "..",
                "KCStoreCore",
                "appsettings.Development.json"));

        Assert.True(
            File.Exists(configurationPath),
            "Development configuration file was not found.");

        // Read the connection string without requiring
        // additional configuration packages.
        using var configurationDocument = JsonDocument.Parse(
            await File.ReadAllTextAsync(configurationPath));

        var developmentConnectionString = configurationDocument.RootElement
            .GetProperty("ConnectionStrings")
            .GetProperty("DefaultConnection")
            .GetString();

        Assert.False(
            string.IsNullOrWhiteSpace(developmentConnectionString));

        // Construct a connection string for the test database.
        var connectionBuilder = new SqlConnectionStringBuilder(
            developmentConnectionString);

        connectionBuilder.InitialCatalog = "KCStoreCore_Test";

        // Safety: refuse to run against any other database.
        Assert.Equal(
            "KCStoreCore_Test",
            connectionBuilder.InitialCatalog);

        var services = new ServiceCollection();

        services.AddLogging();

        services.AddDbContext<KCStoreCoreDbContext>(options =>
            options.UseSqlServer(connectionBuilder.ConnectionString));

        // Register the Identity services required for this test.
        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;

                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequiredLength = 12;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<KCStoreCoreDbContext>();

        services.AddScoped<UserManagementService>();

        using var provider = services.BuildServiceProvider(
            validateScopes: true);

        var testUserId = Guid.NewGuid();
        var testEmail = $"integration-{testUserId:N}@example.test";

        // Confirm that the database is accessible and
        // that the existing migrations have been applied.
        using (var scope = provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<KCStoreCoreDbContext>();

            var actualDatabase = dbContext.Database
                .GetDbConnection()
                .Database;

            Assert.Equal(
                "KCStoreCore_Test",
                actualDatabase);

            Assert.True(
                await dbContext.Database.CanConnectAsync(),
                "Cannot connect to the integration test database.");

            var pendingMigrations =
                await dbContext.Database.GetPendingMigrationsAsync();

            Assert.Empty(pendingMigrations);
        }

        // Ensure the required Identity roles exist.
        using (var scope = provider.CreateScope())
        {
            var roleManager = scope.ServiceProvider
                .GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            foreach (var roleName in new[]
                     {
                         ApplicationRoles.Staff,
                         ApplicationRoles.Manager
                     })
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    var roleResult = await roleManager.CreateAsync(
                        new IdentityRole<Guid>(roleName));

                    Assert.True(
                        roleResult.Succeeded,
                        string.Join(
                            "; ",
                            roleResult.Errors.Select(
                                error => error.Description)));
                }
            }
        }

        try
        {
            // ARRANGE: Create a unique Staff test user.
            using (var scope = provider.CreateScope())
            {
                var userManager = scope.ServiceProvider
                    .GetRequiredService<UserManager<ApplicationUser>>();

                var user = new ApplicationUser
                {
                    Id = testUserId,
                    UserName = testEmail,
                    Email = testEmail,
                    FirstName = "Integration",
                    LastName = "Test",
                    IsActive = true,
                    CreatedAtUtc = DateTime.UtcNow
                };

                var createResult = await userManager.CreateAsync(user);

                Assert.True(
                    createResult.Succeeded,
                    string.Join(
                        "; ",
                        createResult.Errors.Select(
                            error => error.Description)));

                var roleResult = await userManager.AddToRoleAsync(
                    user,
                    ApplicationRoles.Staff);

                Assert.True(
                    roleResult.Succeeded,
                    string.Join(
                        "; ",
                        roleResult.Errors.Select(
                            error => error.Description)));
            }

            // ACT: Change Staff to Manager using the real service.
            using (var scope = provider.CreateScope())
            {
                var service = scope.ServiceProvider
                    .GetRequiredService<UserManagementService>();

                var result = await service.UpdateRoleAsync(
                    testUserId,
                    new UpdateUserRoleRequest
                    {
                        Role = ApplicationRoles.Manager
                    });

                Assert.True(
                    result.Succeeded,
                    string.Join("; ", result.Errors));
            }

            // ASSERT: Verify the role using a fresh scope.
            using (var scope = provider.CreateScope())
            {
                var userManager = scope.ServiceProvider
                    .GetRequiredService<UserManager<ApplicationUser>>();

                var persistedUser = await userManager.FindByIdAsync(
                    testUserId.ToString());

                Assert.NotNull(persistedUser);

                var persistedRoles = await userManager.GetRolesAsync(
                    persistedUser);

                Assert.Single(persistedRoles);

                Assert.Equal(
                    ApplicationRoles.Manager,
                    persistedRoles[0]);
            }
        }
        finally
        {
            // Remove the test user even if an assertion fails.
            using var cleanupScope = provider.CreateScope();

            var userManager = cleanupScope.ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>();

            var testUser = await userManager.FindByIdAsync(
                testUserId.ToString());

            if (testUser is not null)
            {
                var deleteResult = await userManager.DeleteAsync(
                    testUser);

                Assert.True(
                    deleteResult.Succeeded,
                    string.Join(
                        "; ",
                        deleteResult.Errors.Select(
                            error => error.Description)));
            }
        }
    }
}
