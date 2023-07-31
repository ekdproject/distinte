const sql = require('mssql')
const {
    SERVER,
    DATABASE,
    USER,
    PASSWORD
} = process.env

const connection =new sql.ConnectionPool({
    server: SERVER,
    database: DATABASE,
    user: USER,
    password:PASSWORD,  
    options: {
        encrypt: false,
        enableArithAbort: true
    }
})

module.exports = connection