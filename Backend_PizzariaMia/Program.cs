using Microsoft.EntityFrameworkCore;
using PizzariaMia.Data;
using PizzariaMia.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Configurar CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
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

// Configurar o Redis Cache
var redisConn = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
var redisInstance = builder.Configuration["Redis:InstanceName"] ?? "PizzariaMia_";

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConn;
    options.InstanceName = redisInstance;
});

// Serviços da Aplicação
builder.Services.AddHttpClient<PizzariaMia.Services.IEvolutionApiService, PizzariaMia.Services.EvolutionApiService>();
builder.Services.AddScoped<PizzariaMia.Services.IBotStateService, PizzariaMia.Services.BotStateService>();
builder.Services.AddScoped<PizzariaMia.Services.IOrderParserService, PizzariaMia.Services.OrderParserService>();

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
else
{
    // Em produção, captura exceções não tratadas e devolve JSON padronizado
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde."
            });
        });
    });
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

// Aplicar migrations pendentes e seed inicial
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Aplica automaticamente as migrations do EF Core no banco
    context.Database.Migrate();

    // Seed Funcionário (Employee) inicial se não existir
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

    // Seed Admin inicial se não existir
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

    context.SaveChanges();
}

app.Run();
