import { app, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';

// Database connection configuration
const dbConfig: sql.config = {
    server: process.env.azure_sql_server || '',
    database: process.env.azure_sql_database || '',
    user: process.env.azure_sql_user || '',
    password: process.env.azure_sql_password || '',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Function to add activity log entry
async function addActivityLog(type: string, title: string, description: string, status: string = 'processing', metadata: any = {}): Promise<void> {
    try {
        const pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('type', sql.VarChar(50), type)
            .input('title', sql.NVarChar(200), title)
            .input('description', sql.NVarChar(500), description)
            .input('status', sql.VarChar(20), status)
            .input('metadata', sql.NVarChar(4000), JSON.stringify(metadata))
            .query(`
                INSERT INTO ActivityLog (Type, Title, Description, Status, Metadata)
                VALUES (@type, @title, @description, @status, @metadata)
            `);
        
        await pool.close();
        console.log(`Activity log added: ${type} - ${title}`);
    } catch (error) {
        console.error('Error adding activity log:', error);
    }
}

// Queue trigger function using v4 programming model
app.storageQueue('cvProcessing', {
    queueName: 'cv-processing-queue',
    connection: 'AzureWebJobsStorage',
    handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
        context.log('CV Processing function triggered');
        context.log('Queue item:', queueItem);

        try {
            // Log processing started
            await addActivityLog(
                'processing', 
                'CV Processing Started', 
                'Processing CV file from queue', 
                'processing',
                {
                    queueItem: queueItem,
                    timestamp: new Date().toISOString()
                }
            );

            // TODO: Add actual CV processing logic here
            // For now, just simulate some processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Log processing finished
            await addActivityLog(
                'completed', 
                'CV Processing Completed', 
                'CV file processed successfully', 
                'completed',
                {
                    queueItem: queueItem,
                    timestamp: new Date().toISOString()
                }
            );

            context.log('CV processing completed successfully');

        } catch (error) {
            context.error('Error processing CV:', error);
            
            // Log processing error
            await addActivityLog(
                'error', 
                'CV Processing Failed', 
                'Error occurred during CV processing', 
                'failed',
                {
                    queueItem: queueItem,
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString()
                }
            );

            throw error;
        }
    }
});
