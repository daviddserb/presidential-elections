const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

// Register User
function createUser(name, email, password) {
    // Object to store predefined emails and their corresponding roles
    const predefineAdmindEmails = {
        "daviddserb@yahoo.com": 'admin',
        "admin@yahoo.com": 'admin',
        "admin2@gmail.com": 'admin',
    };

    // Get the role based on the user's provided email (if it's not an admin, it will be NULL save on the role)
    const role = predefineAdmindEmails[email];

    /* Promise = object who represents the completion or failure of an async operation and its resulting value. */
    return new Promise(async (resolve, reject) => {
        connection.query(
            `INSERT INTO users(name, email, password, role)
            VALUES(?, ?, ?, ?)`,
            [name, email, password, role],
            function (error, result) {
                if (error) {
                    if (error.code === "ER_DUP_ENTRY") {
                        reject("The name and/or the email is already taken!");
                    }
                } else {
                    resolve("Account successfully created.");
                }
            }
        );
    });
}

// Login User
function loginUser(email, password) {
    return new Promise((resolve, reject) => {
        // Prevent SQL Injection with Parameterized Queries
        connection.query(
            `SELECT *
            FROM users
            WHERE email = ? AND password = ?`,
            [email, password],
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    if (result.length === 0) {
                        reject("User not found!");
                    } else {
                        resolve(result[0]);
                    }
                }
            }
        );
    });
}

// Check if there is a current running election right at this time
function checkIfRunningElection() {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT *
            FROM elections
            WHERE NOW() BETWEEN start AND stop`,
            function(error, result) {
                if (error) {
                    throw error;
                } else {
                    if (result.length === 0) {
                        reject("No election running right now!");
                    } else {
                        // An existing election is already running right now
                        resolve(result[0]);
                    }
                }
            }
        );
    });
}

// Check if an election is already scheduled for the future (and haven't already started)
function checkIfFutureElectionScheduled() {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT *
            FROM elections
            WHERE start > NOW()`,
            function(err, res) {
                if (err) {
                    throw err;
                } else {
                    if (res.length === 0) {
                        reject(false)
                    } else {
                        resolve(res[0]);
                    }
                }
            }
        );
    });
}

function checkIfCurrentCandidate(loggedInUserData, currentRunningElection) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM candidates
            WHERE (candidate = '${loggedInUserData.name}' AND nr_election = ${currentRunningElection.id})`,
            function(err, res) {
                if (err) {
                    throw err;
                } else {
                    if (res.length === 0) {
                        reject("Logged-in user is not a candidate in the running election");
                    } else {
                        resolve(res);
                    }
                }
            }
        );
    });
}

function saveCandidate(currentRunningElection, loggedInUserData) {
    return new Promise(async (resolve, reject) => {
        connection.query(
            "INSERT INTO candidates(nr_election, candidate)" +
            "VALUES ('"+ currentRunningElection.id +"', '"+ loggedInUserData.name +"')",
            (err, res) => {
                if (err) {
                    throw err;
                } else {
                    resolve("Successfully running for presidency!");
                }
            }
        );
    });
}

// Get all candidates with their votes from current running election
function getCandidatesWithVotes(runningElection) {
    return new Promise(async resolve => {
        connection.query(
            `SELECT c.id AS candidate_id, c.candidate, COUNT(v.id) AS votes
            FROM candidates c
            LEFT JOIN votes v ON c.candidate = v.elected AND c.nr_election = v.nr_election
            WHERE c.nr_election = ${runningElection.id}
            GROUP BY c.id, c.candidate`,
            function (err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(res);
                }
            }
        );
    });
}

function getVoterLastVoteDate(voterName) {
    return new Promise(async resolve => {
        connection.query(
            `SELECT vote_date
            FROM votes
            WHERE voter = '${voterName}'
            ORDER BY id DESC
            LIMIT 1`,
            function(err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(res[0]);
                }
            }
        );
    });
}

function saveVote(electionId, voter, elected) {
    return new Promise(async resolve => {
        connection.query(
            "INSERT INTO votes (nr_election, voter, elected)" +
            "VALUES ('"+  electionId +"', '"+  voter.name +"', '"+ elected +"')",
            (err) => {
                if (err) {
                    throw err;
                } else {
                    resolve(true);
                }
            }
        );
    });
}

// Get all the votes from the elections where the specific user participated in (where he voted)
function getUserVoteHistory(loggedInUserData) {
    return new Promise(async resolve => {
        connection.query(
            `SELECT v.voter, e.id AS election_id, e.start AS election_start, e.stop AS election_stop, v.vote_date, v.elected
            FROM votes v
            JOIN elections e ON v.nr_election = e.id
            WHERE v.voter = '${loggedInUserData.name}'
            ORDER BY e.start`,
            function(err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(res);
                }
            }
        );
    });
}

// Get the electeds with their votes from all elections
// The first elected from each election (in the result of the query) is the president (the winner of that election), because it is sorted by the total votes
function getElectedsWithVotesFromAllElections() {
    return new Promise(async resolve => {
        connection.query(
            `SELECT nr_election, elected, COUNT(*) AS total_votes
            FROM votes
            GROUP BY elected
            ORDER BY nr_election, total_votes DESC`,
            function(err, res) {
                if (err) {
                    throw err;
                } else {
                    resolve(res);
                }
            }
        );
    });
}

// For Admin only
function createElection(startPresidency, stopPresidency) {
    return new Promise(async resolve => {
        connection.query(
            `INSERT INTO elections (start, stop)
            VALUES (?, ?)`,
            [startPresidency, stopPresidency],
            (err) => {
                if (err) {
                    throw err;
                } else {
                    resolve(true);
                }
            }
        );
    });
}

module.exports = {
    createUser,
    loginUser,
    createElection,
    checkIfRunningElection,
    checkIfFutureElectionScheduled,
    checkIfCurrentCandidate,
    saveCandidate,
    getCandidatesWithVotes,
    getVoterLastVoteDate,
    saveVote,
    getUserVoteHistory,
    getElectedsWithVotesFromAllElections,
    getAllElections
};