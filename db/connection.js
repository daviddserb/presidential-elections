const mysql = require('mysql');

let connection;

function createConnection() {
    if (process.env.JAWSDB_URL) {
        // Create connection to JawsDB (for when deployed on Heroku)
        connection = mysql.createConnection(process.env.JAWSDB_URL);
    } else {
        // Create connection to localhost
        connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "password",
            database: "presidential_elections_db",
            port: "3306"
        });
    }
    return [connection];
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