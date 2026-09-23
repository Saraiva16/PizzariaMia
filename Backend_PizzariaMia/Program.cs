using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using PizzariaMia.Data;
using PizzariaMia.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Porta padrão do Vite
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure DbContext with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure ASP.NET Core Identity
builder.Services.AddIdentity<PizzariaMia.Models.Usuario, Microsoft.AspNetCore.Identity.IdentityRole<int>>()
    .AddRoles<Microsoft.AspNetCore.Identity.IdentityRole<int>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// Dependency Injection for Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPizzaRepository, PizzaRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

builder.Services.AddControllers();
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

app.UseAuthorization();

app.MapControllers();

app.Run();
