const mysql = require('mysql');

var connection, appRunOn;

function createConnection() {
    // Check if app is running (hosted) on Heroku
    if (process.env.JAWSDB_URL) {
        // Create connection to JawsDB
        connection = mysql.createConnection(process.env.JAWSDB_URL);

        appRunOn = "heroku";
    } else {
        // Create connection to MySQL
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
    connection.connect((err) => {
        if (err) {
            console.error("Errors while connection to the database:", err);
            throw err;
        } else {
            console.log("Successfully connected to the database");
        }
    });    
}

module.exports = {
    createConnection,
    connectToDatabase
};