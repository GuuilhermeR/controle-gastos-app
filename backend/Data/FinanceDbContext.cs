using ControleGastos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ControleGastos.Api.Data;

public sealed class FinanceDbContext(DbContextOptions<FinanceDbContext> options) : DbContext(options)
{
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.ToTable("transactions");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Description).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Category).HasMaxLength(80).IsRequired();
            entity.Property(item => item.PaymentMethod).HasMaxLength(80).IsRequired();
            entity.Property(item => item.Notes).HasMaxLength(500);
            entity.Property(item => item.Amount).HasColumnType("decimal(12,2)");
            entity.Property(item => item.Type).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(item => item.Date);
            entity.HasIndex(item => item.Category);
            entity.HasIndex(item => item.Type);
        });
    }
}
