const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];

function registerUser(name, email, password) {
    /* Promise is an object who represents the eventual completion (or failure) of an 
    asynchronous operation and its resulting value */
    return new Promise((resolve, reject) => {
        connection.query("INSERT INTO users(name, email, password)" +
        " VALUES('"+ name +"', '"+ email +"', '"+ password +"')", function (error, result, fields) {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function loginUser(email, password) {
    console.log("loginUser()");
    //BEFORE:
    // return new Promise(async resolve => {
    //     await connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, (err, res) => {
    //         console.log("err:", err);
    //         console.log("res:", res);
    //         if (res.length === 0) { 
    //             console.log("Contul nu exista.");
    //             resolve(false);
    //         } else {
    //             console.log("Contul exista.");
    //             resolve(res[0]);
    //         }
    //     });
    // });
    // AFTER:
    return new Promise((resolve, reject) => {
        // connection.query returns a Promise
        connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, (error, result) => {
            if (result.length === 0) {
                console.log("error:", error);
                console.log("Contul nu exista.");
                reject("User not found.");
            } else {
                console.log("result:", result);
                console.log("Contul exista.");
                let user = result[0];
                resolve(user);
            }
        });
    });
}

//Admin
function startElections(startPresidency, stopPresidency) {
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

function checkIfRunningElection() {
    return new Promise(async resolve => {
        //connection.query(`SELECT * FROM elections WHERE (CURRENT_TIMESTAMP BETWEEN start AND stop) ORDER BY id DESC LIMIT 1`, function(err, res) {
        connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("avem electie curenta?");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function checkIfCurrentCandidate(loggedInUserInfo, currentRunningElection) {
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM candidates WHERE (candidate = '${loggedInUserInfo.name}' AND nr_election = ${currentRunningElection.id})`, function(err, res) {
            if (err) {
                throw err;
            } else {
                console.log("este curent candidat?");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function saveCandidate(currentRunningElection, loggedInUserName) {
    return new Promise(async resolve => {
        connection.query("INSERT INTO candidates(nr_election, candidate)" +
        "VALUES ('"+ currentRunningElection.id +"', '"+ loggedInUserName +"')", (err) => {
            if (err) {
                throw err;
            } else {
                console.log("candidat salvat");
                resolve(true);
            }
        });
    });
}

function selectCandidates(runningElection) {
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