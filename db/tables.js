const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

function createTablesInDatabase() {
    const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS users(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('', 'admin', 'candidate')
    )`;
    connection.query(createUserTableQuery, (err) => {
        if (err) {
            console.error("Error creating 'users' table:", err);
        } else {
            console.log("Table 'users' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS elections(' + 
    'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'start DATETIME,' +
    'stop DATETIME' +
    ')', (err) => {
        if (err) {
            console.error("Error creating 'elections' table:", err);
            throw err;
        } else {
            console.log("Table 'elections' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS candidates(' + 
    'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'nr_election INT,' +
    'candidate VARCHAR(100),' +
    'FOREIGN KEY (candidate) REFERENCES users(name)' +
    ')', (err) => {
        if (err) {
            console.error("Error creating 'candidates' table:", err);
            throw err;
        } else {
            console.log("Table 'candidates' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS votes(' + 
    'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'voter VARCHAR(100),' +
    'elected VARCHAR(100),' +
    'vote_date DATETIME,' +
    'FOREIGN KEY (voter) REFERENCES users(name),' +
    'FOREIGN KEY (elected) REFERENCES users(name)' +
    ')', (err) => {
        if (err) {
            console.error("Error creating 'votes' table:", err);
            throw err;
        } else {
            console.log("Table 'votes' created in the database");
        }
    });
}

module.exports = {createTablesInDatabase};