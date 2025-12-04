using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using OpenAI.Embeddings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.ClientModel;
using System.Linq;

namespace CVToolFunctions.Services;

public class OpenAIService
{
    private readonly AzureOpenAIClient _client;
    private readonly string _chatDeployment;
    private readonly string _embeddingDeployment;
    private readonly ILogger<OpenAIService> _logger;

    public OpenAIService(IConfiguration configuration, ILogger<OpenAIService> logger)
    {
        _logger = logger;
        
        // Try multiple ways to get the configuration value
        // Azure Functions can use different naming conventions
        var apiKey = configuration["azure_openai_key"] 
                  ?? configuration["AzureOpenAIKey"]
                  ?? Environment.GetEnvironmentVariable("azure_openai_key")
                  ?? Environment.GetEnvironmentVariable("AzureOpenAIKey");
        
        var resource = configuration["azure_openai_resource"]
                     ?? configuration["AzureOpenAIResource"]
                     ?? Environment.GetEnvironmentVariable("azure_openai_resource")
                     ?? Environment.GetEnvironmentVariable("AzureOpenAIResource");
        
        // Log available configuration keys for debugging (first 20 keys only)
        var configKeys = configuration.AsEnumerable().Take(20).Select(kvp => kvp.Key).ToList();
        _logger.LogInformation($"Available config keys (first 20): {string.Join(", ", configKeys)}");
        _logger.LogInformation($"azure_openai_key found: {!string.IsNullOrWhiteSpace(apiKey)}");
        _logger.LogInformation($"azure_openai_resource found: {!string.IsNullOrWhiteSpace(resource)}");
        
        // Validate required configuration
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogError("azure_openai_key is not configured. Checked: azure_openai_key, AzureOpenAIKey, and environment variables.");
            throw new InvalidOperationException("azure_openai_key is not configured. Please set it in Azure Function App Application Settings.");
        }
        
        if (string.IsNullOrWhiteSpace(resource))
        {
            _logger.LogError("azure_openai_resource is not configured. Checked: azure_openai_resource, AzureOpenAIResource, and environment variables.");
            throw new InvalidOperationException("azure_openai_resource is not configured. Please set it in Azure Function App Application Settings.");
        }
        
        // Parse resource URL to get endpoint
        var endpoint = ExtractEndpoint(resource);
        
        _client = new AzureOpenAIClient(new Uri(endpoint), new ApiKeyCredential(apiKey));
        _chatDeployment = configuration["azure_openai_deployment"] 
                       ?? configuration["AzureOpenAIDeployment"]
                       ?? Environment.GetEnvironmentVariable("azure_openai_deployment")
                       ?? "gpt-4o";
        _embeddingDeployment = configuration["azure_openai_embedding_deployment"]
                            ?? configuration["AzureOpenAIEmbeddingDeployment"]
                            ?? Environment.GetEnvironmentVariable("azure_openai_embedding_deployment")
                            ?? "text-embedding-ada-002";
    }

    private string ExtractEndpoint(string resource)
    {
        if (string.IsNullOrWhiteSpace(resource))
        {
            throw new ArgumentException("Azure OpenAI resource cannot be null or empty", nameof(resource));
        }
        
        // If it's a full URL, extract just the base endpoint
        var match = Regex.Match(resource, @"(https://[^/]+\.openai\.azure\.com)");
        if (match.Success)
        {
            return match.Groups[1].Value;
        }
        
        // If it's just the resource name, construct the endpoint
        return $"https://{resource}.openai.azure.com";
    }

    public async Task<T?> GenerateStructuredResponseAsync<T>(string prompt, float temperature = 0.2f) where T : class
    {
        try
        {
            var chatClient = _client.GetChatClient(_chatDeployment);
            
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage("You are a helpful assistant that returns only valid JSON."),
                new UserChatMessage(prompt)
            };
            
            var completionOptions = new ChatCompletionOptions
            {
                Temperature = temperature,
                MaxOutputTokenCount = 4000
            };
            
            var completion = await chatClient.CompleteChatAsync(messages, completionOptions);
            
            var responseText = completion.Value.Content[0].Text;
            _logger.LogInformation($"OpenAI Response: {responseText.Substring(0, Math.Min(500, responseText.Length))}");

            // Clean up markdown code blocks if present
            var cleanedText = CleanJsonResponse(responseText);
            
            return JsonSerializer.Deserialize<T>(cleanedText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured response from OpenAI");
            throw;
        }
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text)
    {
        try
        {
            var embeddingClient = _client.GetEmbeddingClient(_embeddingDeployment);
            
            var embedding = await embeddingClient.GenerateEmbeddingAsync(text);
            
            return embedding.Value.ToFloats().ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding");
            throw;
        }
    }

    private string CleanJsonResponse(string text)
    {
        var cleaned = text.Trim();
        
        // Remove markdown code blocks
        if (cleaned.StartsWith("```json"))
        {
            cleaned = cleaned.Substring(7);
        }
        else if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned.Substring(3);
        }
        
        if (cleaned.EndsWith("```"))
        {
            cleaned = cleaned.Substring(0, cleaned.Length - 3);
        }
        
        return cleaned.Trim();
    }
}


