using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Porta padrão do Vite
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure DbContext with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Dependency Injection for Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPizzaRepository, PizzaRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

// Configurar o Redis Cache (Que já está rodando no Docker da Evolution!)
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
    options.InstanceName = "PizzariaMia_";
});

// Serviços da Aplicação
builder.Services.AddHttpClient<PizzariaMia.Services.IEvolutionApiService, PizzariaMia.Services.EvolutionApiService>();
builder.Services.AddScoped<PizzariaMia.Services.IBotStateService, PizzariaMia.Services.BotStateService>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key is missing in configuration.");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddControllers();
builder.Services.AddSignalR(); // <--- Adicionado SignalR



// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Habilitar pasta estática wwwroot para leitura das imagens
app.UseStaticFiles();

// Habilitar CORS antes do Authorization
app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<PizzariaMia.Hubs.OrderTrackingHub>("/orderTrackingHub"); // <--- Mapeamento do Hub

// Seed Employee and Admin Users for Testing
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Seed Funcionário (Employee)
    var employeePhone = "(11) 98888-8888";
    var existingEmployee = context.Users.FirstOrDefault(u => u.Phone == employeePhone || u.Email == "funcionario@pizzariamia.com");
    if (existingEmployee == null)
    {
        context.Users.Add(new PizzariaMia.Models.User
        {
            Name = "Funcionário Mia",
            Email = "funcionario@pizzariamia.com",
            Phone = employeePhone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("funcionario123"),
            Role = "Employee"
        });
    }
    else
    {
        existingEmployee.Phone = employeePhone;
        existingEmployee.Role = "Employee";
        existingEmployee.PasswordHash = BCrypt.Net.BCrypt.HashPassword("funcionario123");
    }

    // Seed Admin
    var adminPhone = "(11) 99999-9999";
    var existingAdmin = context.Users.FirstOrDefault(u => u.Phone == adminPhone || u.Email == "admin@admin.com");
    if (existingAdmin == null)
    {
        context.Users.Add(new PizzariaMia.Models.User
        {
            Name = "Administrador Mia",
            Email = "admin@admin.com",
            Phone = adminPhone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = "Admin"
        });
    }
    else
    {
        existingAdmin.Phone = adminPhone;
        existingAdmin.Role = "Admin";
        existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
    }

    context.SaveChanges();

    // Garante que a tabela WhatsAppMessages exista no PostgreSQL
    context.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""WhatsAppMessages"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""RemoteJid"" TEXT NOT NULL,
            ""SenderPhone"" TEXT NOT NULL,
            ""SenderName"" TEXT NOT NULL,
            ""Text"" TEXT NOT NULL,
            ""FromMe"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""MessageType"" TEXT NOT NULL DEFAULT 'text',
            ""Timestamp"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    ");
}

app.Run();
