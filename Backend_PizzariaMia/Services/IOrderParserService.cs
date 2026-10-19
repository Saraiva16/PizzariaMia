using PizzariaMia.Models;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.Services
{
    public record ParsedItemResult(
        string Description,
        int Quantity,
        decimal UnitPrice,
        decimal SubTotal,
        CrustType Crust = CrustType.None,
        string? Notes = null,
        int? PizzaId = null
    );

    public record ParsedOrderResult(
        decimal TotalAmount,
        string FormattedDescription,
        bool HasRecognizedItems,
        IReadOnlyList<ParsedItemResult> Items
    );

    public interface IOrderParserService
    {
        ParsedOrderResult ParseOrder(string rawText, IEnumerable<Pizza> availablePizzas);
    }
}
