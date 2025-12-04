using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using CVToolFunctions.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration((context, config) =>
    {
        // Add environment variables to configuration
        config.AddEnvironmentVariables();
    })
    .ConfigureServices(services =>
    {
        services.AddSingleton<DatabaseService>();
        services.AddSingleton<OpenAIService>();
        services.AddSingleton<SearchService>();
        services.AddSingleton<BlobService>();
        services.AddSingleton<QueueService>();
        services.AddSingleton<ActivityLogService>();
    })
    .Build();

host.Run();


