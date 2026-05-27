namespace ControleGastos.Api.Models;

public sealed record TransactionRequest(
    string Description,
    string Category,
    decimal Amount,
    DateOnly Date,
    TransactionType Type,
    string PaymentMethod,
    string? Notes);

public sealed record MonthlySummary(
    string Month,
    decimal Income,
    decimal Expenses,
    decimal Balance);

public sealed record CategorySummary(
    string Category,
    decimal Amount);

public sealed record TrendInsight(
    string Title,
    string Description,
    string Severity);

public sealed record DashboardResponse(
    decimal Income,
    decimal Expenses,
    decimal Balance,
    decimal SavingsRate,
    int TransactionCount,
    IReadOnlyList<MonthlySummary> Monthly,
    IReadOnlyList<CategorySummary> ByCategory,
    IReadOnlyList<CategorySummary> PaymentMethods,
    IReadOnlyList<TrendInsight> Insights);
