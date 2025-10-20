import dotenv from 'dotenv';

dotenv.config();

export const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    appToken: process.env.SLACK_APP_TOKEN || '',
  },
  cvTool: {
    baseUrl: process.env.CV_TOOL_BASE_URL || 'http://localhost:3000',
  },
  azure: {
    storageConnectionString: process.env.azure_storage_connection_string || '',
  },
  database: {
    server: process.env.db_server || '',
    database: process.env.db_database || '',
    user: process.env.db_user || '',
    password: process.env.db_password || '',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  },
  service: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
};

export function validateConfig(): void {
  const required = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'azure_storage_connection_string',
    'db_server',
    'db_database',
    'db_user',
    'db_password',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

