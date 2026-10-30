using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KCStoreCore.Infrastructure.Identity;

public static class IdentityDevelopmentTestUserInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);
        ArgumentNullException.ThrowIfNull(configuration);

        using var scope = serviceProvider.CreateScope();

        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var roleManager = scope.ServiceProvider
            .GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        await CreateTestUserAsync(
            userManager,
            roleManager,
            configuration,
            "DevelopmentTestUsers:Manager",
            ApplicationRoles.Manager);

        await CreateTestUserAsync(
            userManager,
            roleManager,
            configuration,
            "DevelopmentTestUsers:Staff",
            ApplicationRoles.Staff);
    }

    private static async Task CreateTestUserAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration configuration,
        string configurationSection,
        string roleName)
    {
        var email = configuration[$"{configurationSection}:Email"]?.Trim();
        var firstName = configuration[$"{configurationSection}:FirstName"]?.Trim();
        var lastName = configuration[$"{configurationSection}:LastName"]?.Trim();
        var password = configuration[$"{configurationSection}:Password"];

        // Development test accounts are optional.
        // Skip accounts with no configuration supplied.
        if (string.IsNullOrWhiteSpace(email) &&
            string.IsNullOrWhiteSpace(firstName) &&
            string.IsNullOrWhiteSpace(lastName) &&
            string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        // Reject partially configured test accounts.
        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(firstName) ||
            string.IsNullOrWhiteSpace(lastName) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                $"Development test-user configuration is incomplete for role '{roleName}'.");
        }

        if (!await roleManager.RoleExistsAsync(roleName))
        {
            throw new InvalidOperationException(
                $"Role '{roleName}' does not exist. Initialize roles first.");
        }

        // Check whether the configured test account exists.
        var existingUser = await userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            // Existing development test accounts may have had
            // their roles changed through user-management tests.
            //
            // Never overwrite an existing account, reset its
            // password, or automatically restore its original role.
            //
            // Reject an existing Administrator account to avoid
            // silently accepting a privileged account as a
            // Manager or Staff development test user.
            var existingRoles = await userManager.GetRolesAsync(
                existingUser);

            if (existingRoles.Contains(ApplicationRoles.Administrator))
            {
                throw new InvalidOperationException(
                    $"The configured development test account for role '{roleName}' " +
                    "belongs to an Administrator. " +
                    "Configure a separate non-administrator test account.");
            }

            // Only allow existing development accounts with
            // exactly one supported non-administrator role.
            if (existingRoles.Count != 1 ||
                (existingRoles[0] != ApplicationRoles.Manager &&
                 existingRoles[0] != ApplicationRoles.Staff))
            {
                throw new InvalidOperationException(
                    $"The configured development test account for role '{roleName}' " +
                    "has an invalid role configuration.");
            }

            // The account already exists with a valid role.
            // Preserve it exactly as it is.
            return;
        }

        var testUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            EmailConfirmed = true,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            LockoutEnabled = true
        };

        // ASP.NET Identity validates and hashes the password.
        var createResult = await userManager.CreateAsync(
            testUser,
            password);

        if (!createResult.Succeeded)
        {
            var errors = string.Join(
                "; ",
                createResult.Errors.Select(
                    error => error.Description));

            throw new InvalidOperationException(
                $"Failed to create development test user for role '{roleName}': {errors}");
        }

        // Assign the configured initial role.
        var roleResult = await userManager.AddToRoleAsync(
            testUser,
            roleName);

        if (!roleResult.Succeeded)
        {
            var errors = string.Join(
                "; ",
                roleResult.Errors.Select(
                    error => error.Description));

            // Attempt to remove the incomplete account.
            var deleteResult = await userManager.DeleteAsync(
                testUser);

            if (!deleteResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Role assignment failed for development test user '{roleName}', " +
                    "and the incomplete account could not be removed. " +
                    $"Original errors: {errors}");
            }

            throw new InvalidOperationException(
                $"Failed to assign role '{roleName}' to development test user: {errors}");
        }
    }
}