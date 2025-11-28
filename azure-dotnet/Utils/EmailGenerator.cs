using System.Text;
using System.Text.RegularExpressions;
using System.Globalization;

namespace CVToolFunctions.Utils;

public static class EmailGenerator
{
    public static string GenerateEmailFromName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name) || name == "Unknown")
        {
            return $"temp_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}@cvtool.local";
        }

        // Split name into parts and remove empty strings
        var nameParts = name.Trim()
            .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(part => part.Length > 0)
            .ToArray();

        if (nameParts.Length == 0)
        {
            return $"temp_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}@cvtool.local";
        }

        // Take first and last name
        var firstName = nameParts[0].ToLowerInvariant();
        var lastName = nameParts.Length > 1 ? nameParts[^1].ToLowerInvariant() : "";

        // Remove special characters and accents
        var cleanFirst = RemoveAccentsAndSpecialChars(firstName);
        var cleanLast = RemoveAccentsAndSpecialChars(lastName);

        if (!string.IsNullOrEmpty(cleanLast))
        {
            return $"{cleanFirst}.{cleanLast}@rmdy.be";
        }
        
        return $"{cleanFirst}@rmdy.be";
    }

    private static string RemoveAccentsAndSpecialChars(string text)
    {
        // Normalize to decomposed form
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

        var result = stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        
        // Remove non-alphanumeric characters
        return Regex.Replace(result, @"[^a-z0-9]", "");
    }
}


