using System.Text.Json;
using KCStoreCore.Application.DTOs.UserManagement;
using KCStoreCore.Application.Security;
using KCStoreCore.Infrastructure.Identity;
using KCStoreCore.Infrastructure.Persistence;
using KCStoreCore.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace KCStoreCore.Tests.Integration;

[Collection("SQL Server Integration")]
public sealed class UserRoleRollbackTests
{
    [Fact]
    public async Task UpdateRoleAsync_WhenRemovingOldRoleFails_RollsBackNewRole()
    {
        // Read the existing local development configuration.
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
            developmentConnectionString);

        // Never run this test against the development database.
        connectionBuilder.InitialCatalog = "KCStoreCore_Test";

        Assert.Equal(
            "KCStoreCore_Test",
            connectionBuilder.InitialCatalog);

        var interceptor = new FailStaffRoleRemovalInterceptor();

        var services = new ServiceCollection();

        services.AddLogging();

        services.AddDbContext<KCStoreCoreDbContext>(options =>
            options
                .UseSqlServer(connectionBuilder.ConnectionString)
                .AddInterceptors(interceptor));

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
        var testEmail = $"rollback-{testUserId:N}@example.test";

        // Confirm that the isolated test database is ready.
        using (var scope = provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider
                .GetRequiredService<KCStoreCoreDbContext>();

            Assert.Equal(
                "KCStoreCore_Test",
                dbContext.Database.GetDbConnection().Database);

            Assert.True(
                await dbContext.Database.CanConnectAsync(),
                "Cannot connect to the integration test database.");

            Assert.Empty(
                await dbContext.Database.GetPendingMigrationsAsync());
        }

        // Ensure the required roles exist.
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
            // ARRANGE: Create a Staff user.
            using (var scope = provider.CreateScope())
            {
                var userManager = scope.ServiceProvider
                    .GetRequiredService<UserManager<ApplicationUser>>();

                var user = new ApplicationUser
                {
                    Id = testUserId,
                    UserName = testEmail,
                    Email = testEmail,
                    FirstName = "Rollback",
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

            // Enable failure injection only for the role update.
            interceptor.Enable();

            // ACT: Attempt to change Staff to Manager.
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

                Assert.False(result.Succeeded);
                Assert.False(result.UserNotFound);
            }

            // Confirm that our controlled failure actually ran.
            Assert.True(
                interceptor.FailureTriggered,
                "The Staff role removal failure was not triggered.");

            // Disable the interceptor before verification.
            interceptor.Disable();

            // ASSERT: Query SQL Server using a fresh scope.
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
                    ApplicationRoles.Staff,
                    roles[0]);

                Assert.DoesNotContain(
                    ApplicationRoles.Manager,
                    roles);
            }
        }
        finally
        {
            interceptor.Disable();

            // Clean up the test user even if the test fails.
            using var scope = provider.CreateScope();

            var userManager = scope.ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>();

            var user = await userManager.FindByIdAsync(
                testUserId.ToString());

            if (user is not null)
            {
                var result = await userManager.DeleteAsync(user);

                Assert.True(
                    result.Succeeded,
                    string.Join(
                        "; ",
                        result.Errors.Select(
                            error => error.Description)));
            }
        }
    }

    private sealed class FailStaffRoleRemovalInterceptor
        : SaveChangesInterceptor
    {
        private bool _enabled;

        public bool FailureTriggered { get; private set; }

        public void Enable()
        {
            _enabled = true;
            FailureTriggered = false;
        }

        public void Disable()
        {
            _enabled = false;
        }

        public override ValueTask<InterceptionResult<int>>
            SavingChangesAsync(
                DbContextEventData eventData,
                InterceptionResult<int> result,
                CancellationToken cancellationToken = default)
        {
            if (!_enabled || eventData.Context is null)
            {
                return base.SavingChangesAsync(
                    eventData,
                    result,
                    cancellationToken);
            }

            // Identity marks the old user-role relationship
            // as Deleted when removing the Staff role.
            var removingStaffRole = eventData.Context.ChangeTracker
                .Entries<IdentityUserRole<Guid>>()
                .Any(entry =>
                    entry.State == EntityState.Deleted);

            if (removingStaffRole)
            {
                FailureTriggered = true;

                // Simulate a database update failure that
                // UserManagementService already handles.
                throw new DbUpdateException(
                    "Simulated role removal failure.");
            }

            return base.SavingChangesAsync(
                eventData,
                result,
                cancellationToken);
        }
    }
}