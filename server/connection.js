const sql = require('mssql')
const {
    SERVER,
    DATABASE,
    USER,
    PASSWORD
} = process.env

const timeout = 120_000_000;

const connection =new sql.ConnectionPool({
    server: SERVER,
    database: DATABASE,
    user: USER, 
    password:PASSWORD,  
    options: {
        encrypt: false,
        enableArithAbort: true
    },
    requestTimeout:timeout,
    pool:{
        idleTimeoutMillis: timeout,
        acquireTimeoutMillis: timeout,
        createTimeoutMillis: timeout,
        destroyTimeoutMillis: timeout,
        reapIntervalMillis: timeout,
        createRetryIntervalMillis: timeout
    }
})

module.exports = connection