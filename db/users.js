console.log("##### se intra in db/users.js");
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

//E bine cu 2 functii separate sau cate e nevoie astfel incat fiecare functie sa faca un singur lucru din punct de vedere logic.
// la id sa nu fac comparatia cu '' ci fara ''
// sa folosesc limbajul standard, adica in loc de && sa folosesc AND 

function loginUser(email, password) {
    console.log("##### se intra in loginUser()");
    return new Promise(async resolve => {
        await connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, (err, res) => {
            if (res[0] == undefined) { //sau if err == null, trebuie sa verific cum il pun pe null
                console.log("db/loginUser if");
                console.log("err:");
                console.log(err);
                resolve(false);
            } else {
                resolve(res[0]);
            }
        });
    });
}

function profile(loggedInUserInfo) {
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                console.log("db/profile err 1");
                throw err;
            } else {
                //aici mai am de facut, ca daca s-au terminat electiile, butonul sa fie valabil, sa nu fie blocat, ca daca apasa pe el, sa ii dea pop up mesaj ca n-au inceput algerile
                //connection.query(`SELECT * FROM candidates WHERE candidate = '${loggedInUserName}' AND '${res[0].start}' <= '${new Date()}' AND '${new Date()}' <= '${res[0].start}'`, function(err, res) {
                connection.query(`SELECT * FROM candidates WHERE candidate = '${loggedInUserInfo.name}' AND nr_election = ${res[0].id}`, function(err, res) {
                    if (err) {
                        console.log("db/profile err 2");
                        throw err;
                    } else {
                        console.log("res[0]:");
                        console.log(res[0]);
                        resolve(res[0]);
                    }
                });
            }
        });
    });
}

//Admin
function startElections(startPresidency, stopPresidency) {
    console.log("##### se intra in startElections()");
    return new Promise(async resolve => {
        connection.query("INSERT INTO elections (start, stop)" +
        "VALUES ('"+  startPresidency +"', '"+ stopPresidency +"')", (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function runForPresident(loggedInUserName) {
    console.log("##### se intra in runForPresident()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                console.log("err la runForPresident");
                throw err;
            } else {
                //NU AM VOIE SA FAC IF-URI 'SUPLIMENTARE' SI TREBUIE SA MODIFIC
                //new Date() trebuie schimbat cu ...? now(), current_timestamp();
                if (res[0].start <= new Date() && new Date() <= res[0].stop) {
                    connection.query("INSERT INTO candidates(nr_election, candidate)" +
                    "VALUES ('"+ res[0].id +"', '"+ loggedInUserName +"')", (err) => {
                        if (err) {
                            console.log("err2 la runForPresident");
                            throw err;
                        } else {
                            resolve(true);
                        }
                    });
                } else {
                    resolve(false);
                }
            }
        });
    });
}

//presidential list
function calculateEachVote(lastElectionStart, lastElectionStop) {
    console.log("##### se intra in calculateEachVote()");
    return new Promise(async resolve => {
         //calculate the votes
         connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE '${lastElectionStart}' <= vote_date && vote_date <= '${lastElectionStop}' GROUP BY elected`, function (err, res) {
            if (err) {
                console.log("if (err) 3 calculateEachVote")
                resolve("false");
            } else {
                console.log("@@@@@@@@@@@@@@ res:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

function selectLastVote(userNameVoter) {
    return new Promise(async resolve => {
        connection.query(`SELECT vote_date FROM votes WHERE voter = '${userNameVoter}' ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                console.log("err de la vote");
                resolve(false);
            } else {
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
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function selectAllUserVotes(userNameVoter) {
    console.log("##### se intra in selectAllUserVotes()");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM votes WHERE voter = '${userNameVoter}'`, function(err, res) {
            if (err) {
                resolve("false");
            } else {
                console.log("ressssssssssss");
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
                resolve(false);
            } else {
                resolve(res);
            }
        });
    });
}

function selectLastElection() {
    console.log("selectLastElection ->");
    return new Promise(async resolve => {
        connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, res) {
            if (err) {
                console.log("db/selectLastElection err 1")
                resolve(false);
            } else {
                console.log("db/selectLastElection res[0]:");
                console.log(res[0]);
                resolve(res[0]);
            }
        });
    });
}

function selectCurrentCandidates(lastElectionId) {
    console.log("selectCurrentCandidates ->");
    return new Promise(async resolve => {
        connection.query(`SELECT candidate FROM candidates WHERE nr_election = ${lastElectionId}`, function(err, res) {
            if (err) {
                console.log("if (err) 2 selectCurrentCandidates")
                resolve("false");
            } else {
                console.log("res:");
                console.log(res);
                resolve(res);
            }
        });
    });
}

module.exports = {
    registerUser,
    profile,
    loginUser,
    startElections,
    runForPresident,
    selectLastVote,
    calculateEachVote,
    saveVote,
    selectLastElection,
    selectCurrentCandidates,
    selectAllUserVotes,
    selectAllElections
};