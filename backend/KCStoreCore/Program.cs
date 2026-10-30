using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using KCStoreCore.Application.Configuration;
using KCStoreCore.Application.Interfaces;
using KCStoreCore.Application.Security;
using KCStoreCore.Infrastructure.Identity;
using KCStoreCore.Infrastructure.Persistence;
using KCStoreCore.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// =====================================================
// API CONTROLLERS AND OPENAPI
// =====================================================

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// =====================================================
// SQL SERVER DATABASE CONTEXT
// =====================================================

builder.Services.AddDbContext<KCStoreCoreDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// =====================================================
// DATA PROTECTION
// =====================================================

builder.Services.AddDataProtection();

// =====================================================
// ASP.NET CORE IDENTITY
// =====================================================

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;

        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 12;

        options.Lockout.DefaultLockoutTimeSpan =
            TimeSpan.FromMinutes(15);

        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<KCStoreCoreDbContext>()
    .AddDefaultTokenProviders();

// =====================================================
// JWT CONFIGURATION
// =====================================================

builder.Services
    .AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection(JwtSettings.SectionName))
    .Validate(settings =>
    {
        if (string.IsNullOrWhiteSpace(settings.Issuer) ||
            string.IsNullOrWhiteSpace(settings.Audience) ||
            string.IsNullOrWhiteSpace(settings.SigningKey))
        {
            return false;
        }

        if (settings.AccessTokenExpirationMinutes <= 0)
        {
            return false;
        }

        try
        {
            return Convert.FromBase64String(settings.SigningKey).Length >= 32;
        }
        catch (FormatException)
        {
            return false;
        }
    }, "JWT configuration is missing or invalid.")
    .ValidateOnStart();

var jwtSettings = builder.Configuration
    .GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>()
    ?? throw new InvalidOperationException(
        "JWT configuration is missing.");

if (string.IsNullOrWhiteSpace(jwtSettings.Issuer) ||
    string.IsNullOrWhiteSpace(jwtSettings.Audience) ||
    string.IsNullOrWhiteSpace(jwtSettings.SigningKey) ||
    jwtSettings.AccessTokenExpirationMinutes <= 0)
{
    throw new InvalidOperationException(
        "JWT configuration is incomplete.");
}

byte[] signingKeyBytes;

try
{
    signingKeyBytes =
        Convert.FromBase64String(jwtSettings.SigningKey);
}
catch (FormatException exception)
{
    throw new InvalidOperationException(
        "JWT signing key must be Base64 encoded.",
        exception);
}

if (signingKeyBytes.Length < 32)
{
    throw new InvalidOperationException(
        "JWT signing key must contain at least 256 bits.");
}

// =====================================================
// JWT BEARER AUTHENTICATION
// =====================================================

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,

                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey =
                    new SymmetricSecurityKey(signingKeyBytes),

                RequireSignedTokens = true,
                RequireExpirationTime = true,
                ValidateLifetime = true,

                ClockSkew = TimeSpan.Zero,

                NameClaimType = "name",
                RoleClaimType = "role"
            };

        // =====================================================
        // VALIDATE CURRENT USER AND ROLES
        // =====================================================

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;

                if (principal is null)
                {
                    context.Fail("Invalid authentication token.");
                    return;
                }

                // Read the user ID from the validated JWT.
                var userIdValue = principal.FindFirstValue(
                    JwtRegisteredClaimNames.Sub);

                if (!Guid.TryParse(userIdValue, out var userId) ||
                    userId == Guid.Empty)
                {
                    context.Fail("Invalid user identifier.");
                    return;
                }

                // Resolve the existing ASP.NET Identity user manager.
                var userManager = context.HttpContext
                    .RequestServices
                    .GetRequiredService<UserManager<ApplicationUser>>();

                // Check that the account still exists.
                var user = await userManager.FindByIdAsync(
                    userId.ToString());

                if (user is null)
                {
                    context.Fail("User account no longer exists.");
                    return;
                }

                // Reject previously issued tokens for inactive users.
                if (!user.IsActive)
                {
                    context.Fail("User account is inactive.");
                    return;
                }

                // Read the current roles from SQL Server.
                var currentRoles = await userManager.GetRolesAsync(user);

                // Read the roles contained in the JWT.
                var tokenRoles = principal
                    .FindAll("role")
                    .Select(claim => claim.Value)
                    .ToArray();

                // Compare the role sets without depending on order.
                var rolesMatch =
                    currentRoles.Count == tokenRoles.Length &&
                    currentRoles
                        .OrderBy(role => role, StringComparer.Ordinal)
                        .SequenceEqual(
                            tokenRoles.OrderBy(
                                role => role,
                                StringComparer.Ordinal),
                            StringComparer.Ordinal);

                if (!rolesMatch)
                {
                    context.Fail(
                        "User roles have changed. Please log in again.");
                    return;
                }

                // The JWT is valid and the account remains active
                // with the same assigned roles.
            }
        };
    });

// =====================================================
// ROLE-BASED AUTHORIZATION POLICIES
// =====================================================

builder.Services.AddAuthorization(options =>
{
    // Only Administrators can access these operations.
    options.AddPolicy(
        AuthorizationPolicies.AdministratorOnly,
        policy => policy
            .RequireAuthenticatedUser()
            .RequireRole(ApplicationRoles.Administrator));

    // Administrators and Managers can access these operations.
    options.AddPolicy(
        AuthorizationPolicies.ManagementAccess,
        policy => policy
            .RequireAuthenticatedUser()
            .RequireRole(
                ApplicationRoles.Administrator,
                ApplicationRoles.Manager));

    // Administrators, Managers and Staff can access these operations.
    options.AddPolicy(
        AuthorizationPolicies.InventoryAccess,
        policy => policy
            .RequireAuthenticatedUser()
            .RequireRole(
                ApplicationRoles.Administrator,
                ApplicationRoles.Manager,
                ApplicationRoles.Staff));
});

// =====================================================
// EXISTING BUSINESS SERVICES
// =====================================================

// Category management
builder.Services.AddScoped<ICategoryService, CategoryService>();

// Product management
builder.Services.AddScoped<IProductService, ProductService>();

// Store management
builder.Services.AddScoped<IStoreService, StoreService>();

// Supplier management
builder.Services.AddScoped<ISupplierService, SupplierService>();

// Inventory management
builder.Services.AddScoped<IInventoryService, InventoryService>();

// Purchase order management
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();

// Stock receiving
builder.Services.AddScoped<IStockReceiptService, StockReceiptService>();

// Reporting and dashboard analytics
builder.Services.AddScoped<IReportService, ReportService>();

// =====================================================
// AUTHENTICATION SERVICE
// =====================================================

builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();

// =====================================================
// USER MANAGEMENT SERVICE
// =====================================================

builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// =====================================================
// APPLICATION PIPELINE
// =====================================================

var app = builder.Build();

// =====================================================
// INITIALIZE IDENTITY ROLES AND ADMINISTRATOR
// =====================================================

await IdentityRoleInitializer.InitializeAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    await IdentityAdminInitializer.InitializeAsync(
        app.Services,
        app.Configuration);

    // Initialize optional Manager and Staff test accounts.
    // This initializer must only run in Development.
    await IdentityDevelopmentTestUserInitializer.InitializeAsync(
        app.Services,
        app.Configuration);

    app.MapOpenApi();
}

// =====================================================
// HTTP MIDDLEWARE
// =====================================================

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();