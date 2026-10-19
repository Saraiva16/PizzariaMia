using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using PizzariaMia.Models;
using PizzariaMia.Models.Enums;

namespace PizzariaMia.Services
{
    public class OrderParserService : IOrderParserService
    {
        private static readonly IReadOnlyDictionary<CrustType, (string Name, decimal Price)> CrustInfo =
            new Dictionary<CrustType, (string Name, decimal Price)>
            {
                { CrustType.None, ("Sem Borda", 0.00m) },
                { CrustType.Catupiry, ("Borda de Catupiry", 8.00m) },
                { CrustType.Cheddar, ("Borda de Cheddar", 8.00m) },
                { CrustType.Chocolate, ("Borda de Chocolate", 10.00m) }
            };

        private static readonly IReadOnlyDictionary<string, (string Name, decimal Price)> BeverageCatalog =
            new Dictionary<string, (string Name, decimal Price)>(StringComparer.OrdinalIgnoreCase)
            {
                { "coca", ("Coca-Cola 2L", 15.00m) },
                { "coca cola", ("Coca-Cola 2L", 15.00m) },
                { "coca-cola", ("Coca-Cola 2L", 15.00m) },
                { "guarana", ("Guaraná Antarctica 2L", 13.00m) },
                { "guarana antarctica", ("Guaraná Antarctica 2L", 13.00m) },
                { "fanta", ("Fanta Laranja 2L", 13.00m) },
                { "fanta laranja", ("Fanta Laranja 2L", 13.00m) },
                { "agua", ("Água Mineral 500ml", 5.00m) },
                { "agua mineral", ("Água Mineral 500ml", 5.00m) },
                { "cerveja", ("Cerveja Heineken Long Neck", 12.00m) },
                { "heineken", ("Cerveja Heineken Long Neck", 12.00m) }
            };

        public ParsedOrderResult ParseOrder(string rawText, IEnumerable<Pizza> availablePizzas)
        {
            if (string.IsNullOrWhiteSpace(rawText))
            {
                return new ParsedOrderResult(0, string.Empty, false, Array.Empty<ParsedItemResult>());
            }

            var validPizzas = availablePizzas
                .Where(p => !string.IsNullOrWhiteSpace(p.Name) && !p.Name.Equals("Pedido via WhatsApp", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var segments = SplitIntoOrderSegments(rawText);
            var recognizedItems = new List<ParsedItemResult>();

            foreach (var segment in segments)
            {
                if (string.IsNullOrWhiteSpace(segment)) continue;

                var parsedItem = ParseSingleSegment(segment, validPizzas);
                if (parsedItem != null)
                {
                    recognizedItems.Add(parsedItem);
                }
            }

            if (recognizedItems.Count > 0)
            {
                decimal total = recognizedItems.Sum(i => i.SubTotal);
                string formatted = string.Join("\n", recognizedItems.Select(i => i.Description));

                return new ParsedOrderResult(
                    TotalAmount: total,
                    FormattedDescription: formatted,
                    HasRecognizedItems: true,
                    Items: recognizedItems
                );
            }

            // Fallback caso não reconheça nada do cardápio
            return new ParsedOrderResult(
                TotalAmount: 0,
                FormattedDescription: rawText.Trim(),
                HasRecognizedItems: false,
                Items: Array.Empty<ParsedItemResult>()
            );
        }

        private static List<string> SplitIntoOrderSegments(string text)
        {
            // Divide por quebras de linha, vírgulas, ponto e vírgula, sinal de mais (+)
            // ou conjunção "e" seguida de quantificador ou novo item ("e uma", "e 1", "e duas", etc.)
            var pattern = @"(?:[\r\n,;+]+|\s+e\s+(?=(?:uma?|duas|dois|tres|tr[êe]s|quatro|\d+|meio|metade|outra|mais)\b))";
            var parts = Regex.Split(text, pattern, RegexOptions.IgnoreCase);

            var result = new List<string>();
            foreach (var part in parts)
            {
                var trimmed = part.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed))
                {
                    result.Add(trimmed);
                }
            }

            return result;
        }

        private ParsedItemResult? ParseSingleSegment(string segmentText, List<Pizza> pizzas)
        {
            string workText = NormalizeText(segmentText);

            // 1. Extração de Quantidade
            int quantity = 1;
            var qtyMatch = Regex.Match(workText, @"^(?:quero\s+)?(\d+|uma?|duas|dois|tres|tr[êe]s|quatro)\s*(?:x\s*|pizzas?\s*(?:de\s*)?)?", RegexOptions.IgnoreCase);
            if (qtyMatch.Success)
            {
                string rawQty = qtyMatch.Groups[1].Value.ToLower();
                quantity = rawQty switch
                {
                    "um" or "uma" => 1,
                    "dois" or "duas" => 2,
                    "tres" or "três" => 3,
                    "quatro" => 4,
                    _ => int.TryParse(rawQty, out int n) ? Math.Max(1, n) : 1
                };
                workText = workText.Substring(qtyMatch.Length).Trim();
            }

            // Remove prefixos residuais comuns como "de ", "pizza de ", "pizzas de "
            workText = Regex.Replace(workText, @"^(?:pizzas?\s+(?:de\s+)?|de\s+)", "", RegexOptions.IgnoreCase).Trim();

            // 2. Extração de Borda Recheada (Crust)
            var (crustType, crustPrice, textWithoutCrust) = ExtractCrust(workText);
            workText = textWithoutCrust;

            // 3. Extração de Observações / Notas (Notes)
            var (notes, textWithoutNotes) = ExtractNotes(workText);
            workText = textWithoutNotes;

            // 4. Detecção de Meio a Meio (ex: "meio calabresa meio mussarela")
            var halfMatch = Regex.Match(workText, @"^(?:1\/2|meio|metade)\s+(?:de\s+)?([a-z0-9\s]+?)\s+(?:e\s+|com\s+|\/\s*)?(?:1\/2|meio|metade)\s+(?:de\s+)?([a-z0-9\s]+?)$", RegexOptions.IgnoreCase);
            if (halfMatch.Success)
            {
                string half1 = halfMatch.Groups[1].Value.Trim();
                string half2 = halfMatch.Groups[2].Value.Trim();

                var p1 = MatchPizza(half1, pizzas);
                var p2 = MatchPizza(half2, pizzas);

                if (p1 != null && p2 != null)
                {
                    decimal basePrice = Math.Max(p1.Price, p2.Price);
                    decimal unitTotal = basePrice + crustPrice;
                    decimal subTotal = unitTotal * quantity;

                    string crustSuffix = crustType != CrustType.None ? $" - {CrustInfo[crustType].Name}" : "";
                    string notesSuffix = !string.IsNullOrWhiteSpace(notes) ? $" (Obs: {notes})" : "";

                    string desc = $"• {quantity}x Pizza Meio {p1.Name} / Meio {p2.Name}{crustSuffix}{notesSuffix} ({subTotal:C})";

                    return new ParsedItemResult(desc, quantity, unitTotal, subTotal, crustType, notes, p1.Id);
                }
            }

            // 5. Detecção de Bebida
            var matchedBeverage = MatchBeverage(workText);
            if (matchedBeverage != null)
            {
                decimal bevSubTotal = matchedBeverage.Value.Price * quantity;
                string desc = $"• {quantity}x {matchedBeverage.Value.Name} ({bevSubTotal:C})";
                return new ParsedItemResult(desc, quantity, matchedBeverage.Value.Price, bevSubTotal, CrustType.None, notes);
            }

            // 6. Detecção de Pizza Inteira
            var matchedPizza = MatchPizza(workText, pizzas);
            if (matchedPizza != null)
            {
                decimal unitTotal = matchedPizza.Price + crustPrice;
                decimal subTotal = unitTotal * quantity;

                string crustSuffix = crustType != CrustType.None ? $" - {CrustInfo[crustType].Name}" : "";
                string notesSuffix = !string.IsNullOrWhiteSpace(notes) ? $" (Obs: {notes})" : "";

                string desc = $"• {quantity}x Pizza {matchedPizza.Name}{crustSuffix}{notesSuffix} ({subTotal:C})";

                return new ParsedItemResult(desc, quantity, unitTotal, subTotal, crustType, notes, matchedPizza.Id);
            }

            return null;
        }

        private static (CrustType Crust, decimal Price, string RemainingText) ExtractCrust(string text)
        {
            var pattern = @"\b(?:com\s+)?borda\s+(?:de\s+|recheada\s+(?:de|com)\s+)?(catupiry|cheddar|chocolate)\b";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);

            if (match.Success)
            {
                string crustName = match.Groups[1].Value.ToLower();
                CrustType type = crustName switch
                {
                    "catupiry" => CrustType.Catupiry,
                    "cheddar" => CrustType.Cheddar,
                    "chocolate" => CrustType.Chocolate,
                    _ => CrustType.None
                };

                decimal price = CrustInfo.TryGetValue(type, out var info) ? info.Price : 0;
                string cleanText = text.Remove(match.Index, match.Length).Trim();
                cleanText = Regex.Replace(cleanText, @"\s+", " ");
                return (type, price, cleanText);
            }

            return (CrustType.None, 0, text);
        }

        private static (string? Notes, string RemainingText) ExtractNotes(string text)
        {
            // Extrai observações como "com queijo", "sem cebola", "sem azeitona", "bem passada", "massa fina"
            var pattern = @"\b(sem\s+[a-z0-9\s]+?|com\s+queijo|com\s+alho|bem\s+passad[ao]|massa\s+fina|massa\s+grossa|caprichad[ao])(?=$|\s*,\s*|\s+e\s+)";
            var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase);

            if (match.Success)
            {
                string note = match.Groups[1].Value.Trim();
                string cleanText = text.Remove(match.Index, match.Length).Trim();
                cleanText = Regex.Replace(cleanText, @"\s+", " ");
                return (note, cleanText);
            }

            return (null, text);
        }

        private static (string Name, decimal Price)? MatchBeverage(string text)
        {
            string clean = Regex.Replace(text, @"^(?:refrigerante|bebida|refri)\s+(?:de\s+)?", "").Trim();
            foreach (var bev in BeverageCatalog)
            {
                if (clean == bev.Key || clean.StartsWith(bev.Key + " ") || clean.EndsWith(" " + bev.Key))
                {
                    return bev.Value;
                }
            }
            return null;
        }

        private static Pizza? MatchPizza(string text, List<Pizza> pizzas)
        {
            string clean = text.Trim();
            if (string.IsNullOrWhiteSpace(clean)) return null;

            // 1. Match exato ou contenção direta no nome completo normalizado
            foreach (var pizza in pizzas)
            {
                string norm = NormalizeText(pizza.Name);
                if (norm == clean || clean == norm) return pizza;
            }

            // 2. Conter o nome da pizza ou vice-versa
            foreach (var pizza in pizzas)
            {
                string norm = NormalizeText(pizza.Name);
                if (clean.Contains(norm) || norm.Contains(clean)) return pizza;
            }

            // 3. Match por radicais/palavras-chave representativas do sabor
            var aliases = new Dictionary<string, string[]>
            {
                { "calabresa", new[] { "calabresa" } },
                { "mussarela", new[] { "mussarela", "mucarela", "queijo mussarela" } },
                { "quatro queijos", new[] { "quatro queijos", "4 queijos", "quatroqueijos" } },
                { "marguerita", new[] { "marguerita", "margherita" } },
                { "frango", new[] { "frango", "frango catupiry", "frango com catupiry" } },
                { "portuguesa", new[] { "portuguesa" } },
                { "bacon", new[] { "bacon" } },
                { "napolitana", new[] { "napolitana" } }
            };

            foreach (var pizza in pizzas)
            {
                string norm = NormalizeText(pizza.Name);
                foreach (var aliasEntry in aliases)
                {
                    if (norm.Contains(aliasEntry.Key))
                    {
                        if (aliasEntry.Value.Any(a => clean.Contains(a)))
                        {
                            return pizza;
                        }
                    }
                }
            }

            return null;
        }

        private static string NormalizeText(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();
            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC).ToLower().Trim();
        }
    }
}
