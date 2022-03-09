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
    console.log("##### se intra in loginUser()");
    return new Promise(async resolve => {
        await connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, (err, res) => {
            //??? Intrebare1: in loc de err != null pot sa pun res[0] == undefined, conteaza pe care o pun, adica sugestiv?
            if (err != null) { 
                resolve(false);
            } else {
                resolve(res[0]);
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
        connection.query(`SELECT * FROM elections WHERE (CURRENT_TIMESTAMP BETWEEN start AND stop) ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                console.log("db/checkIfRunningElection err 1 (NU SE INTRA AICI NICI CAND NU SUNT ALEGERI CURENTE)");
                throw err;
            } else {
                console.log("avem electie?:");
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
                console.log("db/checkIfCurrentCandidate err 1 (NU SE INTRA AICI NICI CAND NU ARE PE CINE ALEGE, ADICA NU CANDIDEAZA)");
                throw err;
            } else {
                console.log("este candidat?:");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function saveCandidate(currentRunningElection, loggedInUserName) {
    console.log("##### se intra in saveCandidate()");
    return new Promise(async resolve => {
        connection.query("INSERT INTO candidates(nr_election, candidate)" +
        "VALUES ('"+ currentRunningElection.id +"', '"+ loggedInUserName +"')", (err) => {
            if (err) {
                throw err;
            } else {
                resolve(true);
            }
        });
    });
}

function selectCandidates(runningElection) {
    console.log("selectCandidates ->");
    return new Promise(async resolve => {
        connection.query(`SELECT candidate FROM candidates WHERE nr_election = ${runningElection.id}`, function(err, res) {
            if (err) {
                console.log("db/selectCandidates err1 (NU SE INTRA AICI NICI CAND NU SUNT CANDIDATI (adica nimeni n-a dat run for president))")
                throw err;
            } else {
                console.log("avem candidati curenti?");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function selectElectedsAndCountVotes(lastElectionStart, lastElectionStop) {
    console.log("##### se intra in selectElectedsAndCountVotes()");
    return new Promise(async resolve => {
         connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE (vote_date BETWEEN '${lastElectionStart}' AND '${lastElectionStop}') GROUP BY elected`, function (err, res) {
            if (err) {
                console.log("db/selectElectedsAndCountVotes err 1 (NU SE INTRA AICI NICI CAND NU SUNT VOTURI)")
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
                console.log("db/hisLastVote if err 1 (NU SE INTRA AICI NICI DACA NU A VOTAT PE NIMENI)");
                throw err;
            } else {
                console.log("ultimul lui vot:");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function saveVote(userNameVoter, userNameElected) {
    console.log("##### se intra in vote()");
    return new Promise(async resolve => {
        connection.query("INSERT INTO votes (voter, elected, vote_date)" +
        "VALUES ('"+  userNameVoter +"', '"+ userNameElected +"', CURRENT_TIMESTAMP)", (err) => {
            if (err) {
                throw err;
            } else {
                resolve(true);
            }
        });
    });
}

function allHisVotes(userNameVoter) {
    console.log("##### se intra in allHisVotes()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM votes WHERE voter = '${userNameVoter}'`, function(err, res) {
            if (err) {
                console.log("db/allHisVotes err 1 (nu se intra aici nici cand nu a votat pe nimeni)")
                throw err;
            } else {
                console.log("ressssssssssss:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function selectAllElections() {
    console.log("##### se intra in selectAllElections()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM elections`, function(err, res) {
            if (err) {
                console.log("db/selectAllElections if err 1 (NU MI SE INTRA AICI NICI DACA NU AM NICI MACAR O ELECTII)");
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