const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

function registerUser(name, email, password) {
    console.log("registerUser()");
    /* Promise = object who represents the completion or failure of an async operation and its resulting value. */
    return new Promise(async (resolve, reject) => {
        await connection.query(
            "INSERT INTO users(name, email, password) VALUES(?, ?, ?)",
            [name, email, password],
            function (error, result) {
            if (error) {
                console.log("error:", error);
                if (error.code === "ER_DUP_ENTRY") {
                    console.log("Name si/sau Email sunt deja in DB");
                    reject("The name and/or the email is already taken, please change it!");
                } else {
                    console.log("??? Erori pe server");
                    reject("An error occurred while creating the account!");
                }
            } else {
                console.log("S-a creat contul");
                console.log("result:", result);
                resolve("Account successfully created!");
            }
        });
    });
}

function loginUser(email, password) {
    console.log("loginUser()");
    return new Promise(async (resolve, reject) => {
        // BEFORE:
        // `SELECT * FROM users WHERE email = '${email}' && password = '${password}'`
        // AFTER (Prevent SQL Injection with Parameterized Queries):
        await connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (error, result) => {
            if (result.length === 0) {
                console.log("error:", error);
                console.log("Contul nu exista");
                reject("User not found!");
            } else {
                console.log("result:", result);
                console.log("Contul exista");
                let user = result[0];
                resolve(user);
            }
        });
    });
}

function checkIfRunningElection() {
    console.log("checkIfRunningElection()");
    return new Promise(async (resolve, reject) => {
        await connection.query(`SELECT * FROM elections WHERE NOW() BETWEEN start AND stop`, function(error, result) {
            if (error) {
                console.log("error: ", error)
                throw error;
            } else {
                console.log("result:", result);
                if (result.length === 0) {
                    console.log("no election running");
                    reject("No election running right now!");
                } else {
                    console.log("election running");
                    resolve(result[0]);
                }
            }
        });
    });
}

function checkIfCurrentCandidate(loggedInUserInfo, currentRunningElection) {
    console.log("checkIfCurrentCandidate()");
    return new Promise(async (resolve, reject) => {
        await connection.query(`SELECT * FROM candidates WHERE (candidate = '${loggedInUserInfo.name}' AND nr_election = ${currentRunningElection.id})`, function(err, res) {
            if (err) {
                console.log("error: ", err)
                throw err;
            } else {
                console.log("res:", res);
                if (res.length === 0) {
                    console.log("logged-in user nu este candidat la curenta electie");
                    reject("Logged-in user is not a candidate in the running election");
                } else {
                    console.log("logged-in user este candidat la curenta electie");
                    resolve(res);
                }
            }
        });
    });
}

function saveCandidate(currentRunningElection, loggedInUserName) {
    console.log("saveCandidate()");
    return new Promise(async (resolve, reject) => {
        connection.query("INSERT INTO candidates(nr_election, candidate)" +
        "VALUES ('"+ currentRunningElection.id +"', '"+ loggedInUserName +"')", (err, res) => {
            if (err) {
                console.log("err:", err);
                throw err;
            } else {
                console.log("res:", res);
                console.log("candidat salvat in DB");
                resolve("Successfully running for presidency!");
            }
        });
    });
}

function selectCandidates(runningElection) {
    console.log("selectCandidates()");
    return new Promise(async resolve => {
        connection.query(`SELECT candidate FROM candidates WHERE nr_election = ${runningElection.id}`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("candidati in electia curenta:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function selectElectedsAndCountVotes(lastElectionStart, lastElectionStop) {
    console.log("selectElectedsAndCountVotes()");
    return new Promise(async resolve => {
         connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE (vote_date BETWEEN '${lastElectionStart}' AND '${lastElectionStop}') GROUP BY elected`, function (err, res) {
            if (err) {
                throw err;
            } else {
                console.log("avem voturi?");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function hisLastVote(userNameVoter) {
    console.log("hisLastVote()");
    return new Promise(async resolve => {
        connection.query(`SELECT vote_date FROM votes WHERE voter = '${userNameVoter}' ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("ultimul vot al user-ului:");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function saveVote(userNameVoter, userNameElected) {
    console.log("saveVote()");
    return new Promise(async resolve => {
        connection.query("INSERT INTO votes (voter, elected, vote_date)" +
        "VALUES ('"+  userNameVoter +"', '"+ userNameElected +"', CURRENT_TIMESTAMP)", (err) => {
            if (err) {
                throw err;
            } else {
                console.log("vot salvat")
                resolve(true);
            }
        });
    });
}

function allHisVotes(userNameVoter) {
    console.log("allHisVotes()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM votes WHERE voter = '${userNameVoter}'`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("user votes:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function selectAllElections() {
    console.log("selectAllElections()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM elections`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("toate electiile:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

//For Admin only
function startElections(startPresidency, stopPresidency) {
    console.log("startElections()");
    return new Promise(async resolve => {
        connection.query("INSERT INTO elections (start, stop)" +
        "VALUES ('"+  startPresidency +"', '"+ stopPresidency +"')", (err) => {
            if (err) {
                throw err;
            } else {
                resolve(true);
            }
        });
    });
}


module.exports = {
    registerUser,
    loginUser,
    startElections,
    checkIfRunningElection,
    checkIfCurrentCandidate,
    saveCandidate,
    selectCandidates,
    selectElectedsAndCountVotes,
    hisLastVote,
    saveVote,
    allHisVotes,
    selectAllElections
};