using ControleGastos.Api.Data;
using ControleGastos.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<FinanceDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
                "http://localhost:3000",
                "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "Controle de Gastos API" }));

app.MapGet("/api/transactions", async (
    FinanceDbContext db,
    DateOnly? from,
    DateOnly? to,
    TransactionType? type,
    string? category) =>
{
    var query = db.Transactions.AsNoTracking().AsQueryable();

    if (from is not null)
    {
        query = query.Where(item => item.Date >= from);
    }

    if (to is not null)
    {
        query = query.Where(item => item.Date <= to);
    }

    if (type is not null)
    {
        query = query.Where(item => item.Type == type);
    }

    if (!string.IsNullOrWhiteSpace(category))
    {
        query = query.Where(item => item.Category == category);
    }

    var transactions = await query
        .OrderByDescending(item => item.Date)
        .ThenByDescending(item => item.Id)
        .ToListAsync();

    return Results.Ok(transactions);
});

app.MapPost("/api/transactions", async (FinanceDbContext db, TransactionRequest request) =>
{
    var validation = ValidateTransaction(request);
    if (validation is not null)
    {
        return validation;
    }

    var transaction = new Transaction
    {
        Description = request.Description.Trim(),
        Category = request.Category.Trim(),
        Amount = decimal.Round(request.Amount, 2),
        Date = request.Date,
        Type = request.Type,
        PaymentMethod = request.PaymentMethod.Trim(),
        Notes = request.Notes?.Trim()
    };

    db.Transactions.Add(transaction);
    await db.SaveChangesAsync();

    return Results.Created($"/api/transactions/{transaction.Id}", transaction);
});

app.MapPut("/api/transactions/{id:int}", async (FinanceDbContext db, int id, TransactionRequest request) =>
{
    var transaction = await db.Transactions.FindAsync(id);
    if (transaction is null)
    {
        return Results.NotFound();
    }

    var validation = ValidateTransaction(request);
    if (validation is not null)
    {
        return validation;
    }

    transaction.Description = request.Description.Trim();
    transaction.Category = request.Category.Trim();
    transaction.Amount = decimal.Round(request.Amount, 2);
    transaction.Date = request.Date;
    transaction.Type = request.Type;
    transaction.PaymentMethod = request.PaymentMethod.Trim();
    transaction.Notes = request.Notes?.Trim();

    await db.SaveChangesAsync();

    return Results.Ok(transaction);
});

app.MapDelete("/api/transactions/{id:int}", async (FinanceDbContext db, int id) =>
{
    var transaction = await db.Transactions.FindAsync(id);
    if (transaction is null)
    {
        return Results.NotFound();
    }

    db.Transactions.Remove(transaction);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.MapGet("/api/dashboard", async (FinanceDbContext db, DateOnly? from, DateOnly? to) =>
{
    var query = db.Transactions.AsNoTracking().AsQueryable();

    if (from is not null)
    {
        query = query.Where(item => item.Date >= from);
    }

    if (to is not null)
    {
        query = query.Where(item => item.Date <= to);
    }

    var transactions = await query.OrderBy(item => item.Date).ToListAsync();
    var income = transactions.Where(item => item.Type == TransactionType.Income).Sum(item => item.Amount);
    var expenses = transactions.Where(item => item.Type == TransactionType.Expense).Sum(item => item.Amount);
    var balance = income - expenses;
    var savingsRate = income == 0 ? 0 : decimal.Round(balance / income * 100, 1);

    var monthly = transactions
        .GroupBy(item => new { item.Date.Year, item.Date.Month })
        .OrderBy(group => group.Key.Year)
        .ThenBy(group => group.Key.Month)
        .Select(group =>
        {
            var monthIncome = group.Where(item => item.Type == TransactionType.Income).Sum(item => item.Amount);
            var monthExpenses = group.Where(item => item.Type == TransactionType.Expense).Sum(item => item.Amount);
            return new MonthlySummary(
                $"{group.Key.Year}-{group.Key.Month:00}",
                monthIncome,
                monthExpenses,
                monthIncome - monthExpenses);
        })
        .ToList();

    var byCategory = transactions
        .Where(item => item.Type == TransactionType.Expense)
        .GroupBy(item => item.Category)
        .Select(group => new CategorySummary(group.Key, group.Sum(item => item.Amount)))
        .OrderByDescending(item => item.Amount)
        .ToList();

    var paymentMethods = transactions
        .Where(item => item.Type == TransactionType.Expense)
        .GroupBy(item => item.PaymentMethod)
        .Select(group => new CategorySummary(group.Key, group.Sum(item => item.Amount)))
        .OrderByDescending(item => item.Amount)
        .ToList();

    return Results.Ok(new DashboardResponse(
        income,
        expenses,
        balance,
        savingsRate,
        transactions.Count,
        monthly,
        byCategory,
        paymentMethods,
        BuildTrendInsights(monthly, byCategory, income, expenses)));
});

app.Run();

static IResult? ValidateTransaction(TransactionRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(new { message = "Informe uma descrição." });
    }

    if (string.IsNullOrWhiteSpace(request.Category))
    {
        return Results.BadRequest(new { message = "Informe uma categoria." });
    }

    if (string.IsNullOrWhiteSpace(request.PaymentMethod))
    {
        return Results.BadRequest(new { message = "Informe uma forma de pagamento." });
    }

    if (request.Amount <= 0)
    {
        return Results.BadRequest(new { message = "O valor precisa ser maior que zero." });
    }

    return null;
}

static IReadOnlyList<TrendInsight> BuildTrendInsights(
    IReadOnlyList<MonthlySummary> monthly,
    IReadOnlyList<CategorySummary> byCategory,
    decimal income,
    decimal expenses)
{
    var insights = new List<TrendInsight>();

    if (monthly.Count >= 2)
    {
        var previous = monthly[^2];
        var current = monthly[^1];
        var delta = current.Expenses - previous.Expenses;
        var percent = previous.Expenses == 0 ? 0 : decimal.Round(delta / previous.Expenses * 100, 1);
        var severity = delta > 0 ? "warning" : "success";
        var direction = delta > 0 ? "subiram" : "caíram";

        insights.Add(new TrendInsight(
            "Comparativo mensal",
            $"As despesas {direction} {Math.Abs(percent)}% em relação ao mês anterior.",
            severity));
    }

    if (byCategory.Count > 0 && expenses > 0)
    {
        var leader = byCategory[0];
        var share = decimal.Round(leader.Amount / expenses * 100, 1);
        insights.Add(new TrendInsight(
            "Categoria dominante",
            $"{leader.Category} concentra {share}% das despesas do período.",
            share >= 35 ? "warning" : "info"));
    }

    if (income > 0)
    {
        var committed = decimal.Round(expenses / income * 100, 1);
        insights.Add(new TrendInsight(
            "Comprometimento da renda",
            $"{committed}% das entradas foram consumidas por despesas.",
            committed >= 85 ? "danger" : committed >= 65 ? "warning" : "success"));
    }

    if (monthly.Count >= 3)
    {
        var lastThree = monthly.TakeLast(3).ToList();
        var average = decimal.Round(lastThree.Average(item => item.Expenses), 2);
        insights.Add(new TrendInsight(
            "Média móvel",
            $"A média de despesas dos últimos 3 meses está em {average:C}.",
            "info"));
    }

    return insights;
}
