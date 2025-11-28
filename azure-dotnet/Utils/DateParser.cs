namespace CVToolFunctions.Utils;

public static class DateParser
{
    /// <summary>
    /// Parses a date string to a DateTime? for SQL Server.
    /// Handles various date formats and returns null for invalid/empty dates.
    /// </summary>
    public static DateTime? ParseDate(string? dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString))
        {
            return null;
        }

        // Try common date formats
        var formats = new[]
        {
            "yyyy-MM-dd",
            "yyyy/MM/dd",
            "MM/dd/yyyy",
            "dd/MM/yyyy",
            "yyyy-MM",
            "yyyy",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mm:ssZ"
        };

        // Try parsing with each format
        foreach (var format in formats)
        {
            if (DateTime.TryParseExact(dateString, format, null, System.Globalization.DateTimeStyles.None, out var result))
            {
                return result;
            }
        }

        // Fallback to standard DateTime parsing
        if (DateTime.TryParse(dateString, out var parsedDate))
        {
            return parsedDate;
        }

        // If all parsing fails, return null (will be stored as NULL in database)
        return null;
    }

    /// <summary>
    /// Converts a DateTime? to a SQL Server compatible value (DateTime or DBNull).
    /// </summary>
    public static object ToSqlValue(DateTime? date)
    {
        return date.HasValue ? (object)date.Value : DBNull.Value;
    }
}

