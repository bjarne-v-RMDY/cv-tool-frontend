using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CVToolFunctions.Services;

public class SearchService
{
    private readonly SearchClient _searchClient;
    private readonly ILogger<SearchService> _logger;

    public SearchService(IConfiguration configuration, ILogger<SearchService> logger)
    {
        var endpoint = configuration["azure_search_endpoint"];
        var key = configuration["azure_search_key"];
        var indexName = "cv-candidates";

        _searchClient = new SearchClient(new Uri(endpoint!), indexName, new AzureKeyCredential(key!));
        _logger = logger;
    }

    public async Task<List<SearchResult<T>>> VectorSearchAsync<T>(float[] queryVector, int topK = 20)
    {
        try
        {
            var searchOptions = new SearchOptions
            {
                VectorSearch = new()
                {
                    Queries = { new VectorizedQuery(queryVector) { KNearestNeighborsCount = topK, Fields = { "contentVector" } } }
                },
                Size = topK
            };

            searchOptions.Select.Add("userId");
            searchOptions.Select.Add("name");
            searchOptions.Select.Add("email");
            searchOptions.Select.Add("summary");
            searchOptions.Select.Add("skills");
            searchOptions.Select.Add("yearsOfExperience");
            searchOptions.Select.Add("seniority");
            searchOptions.Select.Add("projects");
            searchOptions.Select.Add("certifications");
            searchOptions.Select.Add("preferredRoles");
            searchOptions.Select.Add("location");
            searchOptions.Select.Add("tools");
            searchOptions.Select.Add("languagesSpoken");

            var results = await _searchClient.SearchAsync<T>("*", searchOptions);
            
            var resultList = new List<SearchResult<T>>();
            await foreach (var result in results.Value.GetResultsAsync())
            {
                resultList.Add(result);
            }

            return resultList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing vector search");
            throw;
        }
    }

    public async Task IndexDocumentAsync<T>(T document)
    {
        try
        {
            var batch = IndexDocumentsBatch.Upload(new[] { document });
            await _searchClient.IndexDocumentsAsync(batch);
            _logger.LogInformation("Document indexed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error indexing document");
            throw;
        }
    }
}


