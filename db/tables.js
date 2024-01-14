const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

// ??? TODO:
// replace FK that are strings with int
// replace role ENUM from users with int (1 for admin, 2 for user, etc...)

function createTablesInDatabase() {
    const createUsersTableQuery = 
    `CREATE TABLE IF NOT EXISTS users(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', '')
    )`;
    connection.query(createUsersTableQuery, (err) => {
        if (err) {
            console.error("Errors while creating 'users' table:", err);
        } else {
            console.log("Successfully created 'users' table");
        }
    });

    const createElectionsTableQuery = 
    `CREATE TABLE IF NOT EXISTS elections(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        start DATETIME,
        stop DATETIME
    )`;
    connection.query(createElectionsTableQuery, (err) => {
        if (err) {
            console.error("Errors while creating 'elections' table:", err);
            throw err;
        } else {
            console.log("Successfully created 'elections' table");
        }
    });

    const createCandidatesTableQuery = 
    `CREATE TABLE IF NOT EXISTS candidates(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        candidate VARCHAR(100),
        FOREIGN KEY (nr_election) REFERENCES elections(id),
        FOREIGN KEY (candidate) REFERENCES users(name)
    )`;
    connection.query(createCandidatesTableQuery, (err) => {
        if (err) {
            console.error("Errors while creating 'candidates' table:", err);
            throw err;
        } else {
            console.log("Successfully created 'candidates' table");
        }
    });

    const createVotesTableQuery = 
    `CREATE TABLE IF NOT EXISTS votes(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nr_election INT UNSIGNED,
        voter VARCHAR(100),
        elected VARCHAR(100),
        vote_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nr_election) REFERENCES elections(id),
        FOREIGN KEY (voter) REFERENCES users(name),
        FOREIGN KEY (elected) REFERENCES users(name)
    )`;
    connection.query(createVotesTableQuery, (err) => {
        if (err) {
            console.error("Errors while creating 'votes' table:", err);
            throw err;
        } else {
            console.log("Successfully created 'votes' table");
        }
    });
}

module.exports = {createTablesInDatabase};