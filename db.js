const sql = require("mssql/msnodesqlv8");

const dbConfig = {
    connectionString: "DSN=LoanManagementDSN;",
    server: "localhost\\SQLEXPRESS",
    database: "LoanManagementSystemDB",
    driver: "msnodesqlv8",
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000, // 30 seconds connection timeout
        requestTimeout: 30000, // 30 seconds request timeout
        pool: {
            max: 10, // maximum pool size
            min: 0, // minimum pool size
            idleTimeoutMillis: 30000 // idle connections timeout
        }
    }
};

let connectionPool;

async function connectToDB() {
    // Return existing pool if available
    if (connectionPool) return connectionPool;

    try {
        console.log('Attempting to connect to database...');
        connectionPool = await sql.connect(dbConfig);
        console.log('Database connection established successfully!');
        
        // Handle connection errors
        connectionPool.on('error', err => {
            console.error('Connection pool error:', err);
            connectionPool = null; // Force new connection on next attempt
        });

        return connectionPool;
    } catch (err) {
        console.error('Initial connection failed:', err);
        throw err;
    }
}

// Automatic reconnection with retry logic
async function getConnection() {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const pool = await connectToDB();
            return pool;
        } catch (err) {
            retryCount++;
            if (retryCount >= maxRetries) {
                console.error(`Max retries (${maxRetries}) reached. Giving up.`);
                throw err;
            }
            
            console.log(`Retrying connection (attempt ${retryCount})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
        }
    }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
    if (connectionPool) {
        try {
            await connectionPool.close();
            console.log('Database connection pool closed gracefully');
        } catch (err) {
            console.error('Error closing connection pool:', err);
        }
    }
    process.exit(0);
});

module.exports = {
    connectToDB,
    getConnection,
    sql // Export sql for direct use if needed
};