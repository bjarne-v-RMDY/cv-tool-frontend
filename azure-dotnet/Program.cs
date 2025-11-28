using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using CVToolFunctions.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
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


