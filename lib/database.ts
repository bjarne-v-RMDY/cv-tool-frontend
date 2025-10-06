import sql from 'mssql'

// Database configuration
const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER!,
  database: process.env.AZURE_SQL_DATABASE!,
  user: process.env.AZURE_SQL_USER!,
  password: process.env.AZURE_SQL_PASSWORD!,
  options: {
    encrypt: true, // Use encryption for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = await sql.connect(config)
      console.log('Connected to Azure SQL Database')
    } catch (error) {
      console.error('Database connection error:', error)
      throw error
    }
  }
  return pool
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    console.log('Database connection closed')
  }
}

// Helper function to execute queries
export async function executeQuery<T = any>(
  query: string,
  params?: Record<string, any>
): Promise<T[]> {
  const connection = await getConnection()
  
  const request = connection.request()
  
  // Add parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
  }
  
  const result = await request.query(query)
  return result.recordset
}

// Helper function to execute a single query (for inserts/updates)
export async function executeNonQuery(
  query: string,
  params?: Record<string, any>
): Promise<number> {
  const connection = await getConnection()
  
  const request = connection.request()
  
  // Add parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
  }
  
  const result = await request.query(query)
  return result.rowsAffected[0]
}
