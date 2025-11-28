using UglyToad.PdfPig;
using System.Text;

namespace CVToolFunctions.Utils;

public static class TextExtractor
{
    public static string ExtractText(byte[] fileContent, string mimeType)
    {
        if (mimeType == "application/pdf")
        {
            return ExtractTextFromPdf(fileContent);
        }
        
        return Encoding.UTF8.GetString(fileContent);
    }

    private static string ExtractTextFromPdf(byte[] pdfContent)
    {
        var text = new StringBuilder();
        
        using (var document = PdfDocument.Open(pdfContent))
        {
            foreach (var page in document.GetPages())
            {
                text.AppendLine(page.Text);
            }
        }
        
        return text.ToString();
    }

    public static string TruncateText(string text, int maxChars = 20000)
    {
        if (text.Length <= maxChars)
        {
            return text;
        }
        
        return text.Substring(0, maxChars);
    }
}


