using Microsoft.EntityFrameworkCore;
using PizzariaMia.Models;

namespace PizzariaMia.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Pizza> Pizzas { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Ingredient> Ingredients { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Pizza>()
            .Property(p => p.Price)
            .HasColumnType("decimal(18,2)");
            
        modelBuilder.Entity<Ingredient>()
            .Property(i => i.AdditionalPrice)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<OrderItem>()
            .HasMany(oi => oi.AddedIngredients)
            .WithMany()
            .UsingEntity(j => j.ToTable("OrderItemAddedIngredients"));

        modelBuilder.Entity<OrderItem>()
            .HasMany(oi => oi.RemovedIngredients)
            .WithMany()
            .UsingEntity(j => j.ToTable("OrderItemRemovedIngredients"));
    }
}