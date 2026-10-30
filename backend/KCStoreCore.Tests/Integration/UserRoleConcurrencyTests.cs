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
public sealed class UserRoleConcurrencyTests
{
    [Fact]
    public async Task UpdateRoleAsync_TwoConcurrentRequests_PreservesOneValidRole()
    {
        // Read local configuration without exposing credentials.
        var configurationPath = Path.GetFullPath(
            Path.Combine(
                AppContext.BaseDirectory,
                "..", "..", "..", "..",
                "KCStoreCore",
                "appsettings.Development.json"));

        Assert.True(
            File.Exists(configurationPath),
            "Development configuration file was not found.");

        using var configurationDocument = JsonDocument.Parse(
            await File.ReadAllTextAsync(configurationPath));

        var developmentConnectionString = configurationDocument.RootElement
            .GetProperty("ConnectionStrings")
            .GetProperty("DefaultConnection")
            .GetString();

        Assert.False(
            string.IsNullOrWhiteSpace(developmentConnectionString));

        var connectionBuilder = new SqlConnectionStringBuilder(
            developmentConnectionString)
        {
            InitialCatalog = "KCStoreCore_Test"
        };

        Assert.Equal(
            "KCStoreCore_Test",
            connectionBuilder.InitialCatalog);

        var services = new ServiceCollection();

        services.AddLogging();

        services.AddDbContext<KCStoreCoreDbContext>(options =>
            options.UseSqlServer(connectionBuilder.ConnectionString));

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
        var testEmail = $"concurrency-{testUserId:N}@example.test";

        // Confirm the isolated database is accessible and migrated.
        using (var scope = provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<KCStoreCoreDbContext>();

            Assert.Equal(
                "KCStoreCore_Test",
                dbContext.Database.GetDbConnection().Database);

            Assert.True(
                await dbContext.Database.CanConnectAsync());

            Assert.Empty(
                await dbContext.Database.GetPendingMigrationsAsync());
        }

        // Ensure both Identity roles exist.
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
                    var result = await roleManager.CreateAsync(
                        new IdentityRole<Guid>(roleName));

                    Assert.True(
                        result.Succeeded,
                        string.Join(
                            "; ",
                            result.Errors.Select(
                                error => error.Description)));
                }
            }
        }

        try
        {
            // ARRANGE: Create one Staff user.
            using (var scope = provider.CreateScope())
            {
                var userManager = scope.ServiceProvider
                    .GetRequiredService<UserManager<ApplicationUser>>();

                var user = new ApplicationUser
                {
                    Id = testUserId,
                    UserName = testEmail,
                    Email = testEmail,
                    FirstName = "Concurrency",
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

            // Each operation creates its own DI scope and DbContext.
            async Task<UserRoleUpdateResult> UpdateRoleInSeparateScopeAsync()
            {
                using var scope = provider.CreateScope();

                var service = scope.ServiceProvider
                    .GetRequiredService<UserManagementService>();

                return await service.UpdateRoleAsync(
                    testUserId,
                    new UpdateUserRoleRequest
                    {
                        Role = ApplicationRoles.Manager
                    });
            }

            // ACT: Start two independent updates together.
            var firstRequest = UpdateRoleInSeparateScopeAsync();
            var secondRequest = UpdateRoleInSeparateScopeAsync();

            var results = await Task.WhenAll(
                firstRequest,
                secondRequest);

            // Both requests must complete without unhandled errors.
            Assert.Equal(2, results.Length);

            // At least one request should complete successfully.
            Assert.Contains(
                results,
                result => result.Succeeded);

            // ASSERT: Read the final database state in a fresh scope.
            using (var scope = provider.CreateScope())
            {
                var userManager = scope.ServiceProvider
                    .GetRequiredService<UserManager<ApplicationUser>>();

                var user = await userManager.FindByIdAsync(
                    testUserId.ToString());

                Assert.NotNull(user);

                var roles = await userManager.GetRolesAsync(user);

                Assert.Single(roles);

                Assert.Equal(
                    ApplicationRoles.Manager,
                    roles[0]);
            }
        }
        finally
        {
            // Remove the test user regardless of the outcome.
            using var scope = provider.CreateScope();

            var userManager = scope.ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>();

            var user = await userManager.FindByIdAsync(
                testUserId.ToString());

            if (user is not null)
            {
                var deleteResult = await userManager.DeleteAsync(user);

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