using KCStoreCore.Application.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KCStoreCore.Infrastructure.Identity;

public static class IdentityAdminInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);
        ArgumentNullException.ThrowIfNull(configuration);

        var email = configuration["InitialAdmin:Email"]?.Trim();
        var firstName = configuration["InitialAdmin:FirstName"]?.Trim();
        var lastName = configuration["InitialAdmin:LastName"]?.Trim();
        var password = configuration["InitialAdmin:Password"];

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(firstName) ||
            string.IsNullOrWhiteSpace(lastName) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Initial Administrator configuration is incomplete.");
        }

        using var scope = serviceProvider.CreateScope();

        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var roleManager = scope.ServiceProvider
            .GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        // The Administrator role must exist before assigning it.
        if (!await roleManager.RoleExistsAsync(
            ApplicationRoles.Administrator))
        {
            throw new InvalidOperationException(
                "Administrator role does not exist. Initialize roles first.");
        }

        // Never create duplicate Administrator accounts.
        var existingUser = await userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            // Do not reset the existing account's password or roles.
            return;
        }

        var administrator = new ApplicationUser
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

        // Identity securely hashes the password before storing it.
        var createResult = await userManager.CreateAsync(
            administrator,
            password);

        if (!createResult.Succeeded)
        {
            var errors = string.Join(
                "; ",
                createResult.Errors.Select(error => error.Description));

            throw new InvalidOperationException(
                $"Failed to create the initial Administrator: {errors}");
        }

        // Assign the Administrator role.
        var roleResult = await userManager.AddToRoleAsync(
            administrator,
            ApplicationRoles.Administrator);

        if (!roleResult.Succeeded)
        {
            var errors = string.Join(
                "; ",
                roleResult.Errors.Select(error => error.Description));

            throw new InvalidOperationException(
                $"Administrator created, but role assignment failed: {errors}");
        }
    }
}