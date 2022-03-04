const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

function createTablesInDatabase() {
    connection.query('CREATE TABLE IF NOT EXISTS users(' + 
    'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'name VARCHAR(255) UNIQUE NOT NULL,' +
    'email VARCHAR(255) UNIQUE NOT NULL,' +
    'password VARCHAR(255) NOT NULL,' +
    'role VARCHAR(255)' +
    ')', (err) => {
        if (err) {
            throw err;
        } else {
            console.log("table 'users' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS elections(' + 
    'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'start DATETIME,' +
    'stop DATETIME' +
    ')', (err) => {
        if (err) {
            throw err;
        } else {
            console.log("table 'elections' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS candidates(' + 
    'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'nr_election INT(255),' +
    'candidate VARCHAR(255)' +
    ')', (err) => {
        if (err) {
            throw err;
        } else {
            console.log("table 'candidates' created in the database");
        }
    });

    connection.query('CREATE TABLE IF NOT EXISTS votes(' + 
    'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'voter VARCHAR(255),' +
    'elected VARCHAR(255),' +
    'vote_date DATETIME' +
    ')', (err) => {
        if (err) {
            throw err;
        } else {
            console.log("table 'votes' created in the database");
        }
    });
}

module.exports = {createTablesInDatabase};