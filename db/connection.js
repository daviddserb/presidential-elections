console.log("____ db/connection.js");
const mysql = require('mysql');
//const sync_sql = require('sync-sql');

var connection, appRunOn;
function createConnection() {
    console.log("____ createConnection()");
    if (process.env.JAWSDB_URL) {
        //Create connection to JawsDB
        connection = mysql.createConnection(process.env.JAWSDB_URL);
        appRunOn = "heroku";
    } else {
        //Create connection to MySQL
        //connection = sync_sql.mysql({
        connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "password",
            database: "presidential_elections_db",
            port: "3306"
        });
        appRunOn = "localhost";
    }
    return [connection, appRunOn];
}

function connectToDatabase() {
    console.log("____ connectToDatabase()");
    connection.connect((err) => {
        if (err) {
            throw err;
        } else {
            console.log("connected to the database (localhost)");
        }
    });    
}

module.exports = {
    createConnection,
    connectToDatabase
};