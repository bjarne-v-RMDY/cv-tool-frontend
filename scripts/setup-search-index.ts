import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents';

const endpoint = process.env.azure_search_endpoint || '';
const apiKey = process.env.azure_search_key || '';
const indexName = 'cv-candidates';

async function createSearchIndex() {
    const client = new SearchIndexClient(endpoint, new AzureKeyCredential(apiKey));

    const index = {
        name: indexName,
        fields: [
            {
                name: 'userId',
                type: 'Edm.String',
                key: true,
                filterable: true,
                sortable: true,
            },
            {
                name: 'name',
                type: 'Edm.String',
                searchable: true,
                filterable: true,
                sortable: true,
            },
            {
                name: 'email',
                type: 'Edm.String',
                filterable: true,
            },
            {
                name: 'summary',
                type: 'Edm.String',
                searchable: true,
            },
            {
                name: 'skills',
                type: 'Collection(Edm.String)',
                searchable: true,
                filterable: true,
                facetable: true,
            },
            {
                name: 'yearsOfExperience',
                type: 'Edm.Int32',
                filterable: true,
                sortable: true,
                facetable: true,
            },
            {
                name: 'seniority',
                type: 'Edm.String',
                filterable: true,
                sortable: true,
                facetable: true,
            },
            {
                name: 'projects',
                type: 'Edm.String',
                searchable: true,
            },
            {
                name: 'certifications',
                type: 'Collection(Edm.String)',
                searchable: true,
                filterable: true,
            },
            {
                name: 'preferredRoles',
                type: 'Collection(Edm.String)',
                searchable: true,
                filterable: true,
                facetable: true,
            },
            {
                name: 'location',
                type: 'Edm.String',
                searchable: true,
                filterable: true,
                facetable: true,
            },
            {
                name: 'tools',
                type: 'Collection(Edm.String)',
                searchable: true,
                filterable: true,
                facetable: true,
            },
            {
                name: 'languagesSpoken',
                type: 'Collection(Edm.String)',
                searchable: true,
                filterable: true,
            },
            {
                name: 'content',
                type: 'Edm.String',
                searchable: true,
            },
            {
                name: 'contentVector',
                type: 'Collection(Edm.Single)',
                searchable: true,
                vectorSearchDimensions: 1536,
                vectorSearchProfileName: 'vector-profile',
            },
            {
                name: 'lastUpdated',
                type: 'Edm.DateTimeOffset',
                filterable: true,
                sortable: true,
            },
        ],
        vectorSearch: {
            algorithms: [
                {
                    name: 'vector-config',
                    kind: 'hnsw',
                },
            ],
            profiles: [
                {
                    name: 'vector-profile',
                    algorithmConfigurationName: 'vector-config',
                },
            ],
        },
    };

    try {
        // Try to delete existing index if it exists
        try {
            await client.deleteIndex(indexName);
            console.log(`Deleted existing index: ${indexName}`);
        } catch {
            // Index doesn't exist, that's fine
        }

        // Create the new index
        await client.createIndex(index as any);
        console.log(`Successfully created index: ${indexName}`);
        console.log('Index is ready for indexing documents.');
    } catch (error) {
        console.error('Error creating search index:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    createSearchIndex()
        .then(() => {
            console.log('Setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

export { createSearchIndex };

