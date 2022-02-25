console.log("##### se intra in db/users.js");

const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];
const appRunOn = createConnection[1];

function registerUser(req, res, name, email, password) {
    console.log("##### se intra in registerUser()");
    connection.query("INSERT INTO users(name, email, password)" +
    "VALUES ('"+ name +"', '"+ email +"', '"+ password +"')", (err) => {
        if (err) {
            req.flash('message', 'The name or the email is already taken, please change it.');
            res.redirect('pop-up-message');
        } else {
            req.flash('message', 'Account successfully created.');
            res.redirect('pop-up-message');
        }
    });
}

function loginUser(req, res, email, password) {
    console.log("##### se intra in loginUser()");
    connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, function(err, rows) {
        if (rows[0] == undefined) {
            req.flash('message', 'This account does not exist.');
            res.redirect('pop-up-message');
        } else {
            req.session.loggedInUserInfo = rows[0]; //save the logged in user information with session

            // ?: daca o functie imi returneaza un sir de numere, cum pot sa apelez functia si sa extrag sirul de numere?
            let candidates = selectCandidates();
            console.log("candidates:");
            console.log(candidates);
            //console.log(candidates.length);
            //console.log(candidates[0]);

            // !: sa fac chestia de 'Run for president' daca sa fie blocata sau nu direct din sql, adica sa nu trimit candidatii pe ejs si sa verific daca user-ul logat apare sau nu
            
            if (req.session.loggedInUserInfo.role != "admin") {
                res.render('userAccount', {registeredUserInfo: req.session.loggedInUserInfo, candidates: selectCandidates(), popUpMessage: "userAcc"});
            } else {
                res.render('adminAccount', {registeredUserInfo: req.session.loggedInUserInfo, candidates: selectCandidates(), popUpMessage: "adminAcc"});
            }
        }
    });
}

function startElections(req, res, startPresidency, stopPresidency) {
    console.log("##### se intra in startElections()");
    connection.query("INSERT INTO elections (start, stop)" +
    "VALUES ('"+  startPresidency +"', '"+ stopPresidency +"')", (err) => {
        if (err) {
            throw err;
        } else {
            console.log("inserted into elections");
            req.flash('message', 'Presidency succesfully created.');
            res.redirect('../pop-up-message');
        }
    });
}

function runForPresident(req, res, loggedInUserName) {
    console.log("##### se intra in runForPresident()");
    connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let lastPresidency = rows[0];
            console.log(lastPresidency);

            if (lastPresidency.start <= new Date() && new Date() <= lastPresidency.stop) {
                connection.query("INSERT INTO candidates(nr_election, candidate)" +
                "VALUES ('"+ lastPresidency.id +"', '"+ loggedInUserName +"')", (err) => {
                    if (err) {
                        throw err;
                    } else {
                        if (appRunOn == "localhost") {
                            res.redirect(`http://localhost:3000/users/president/list`);
                        } else {
                            res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
                        }
                    }
                });
            } else {
                req.flash('message', 'The presidential elections have not started so you can not run for president.');
                res.redirect('../pop-up-message');
            }
        }
    });
}

function presidentList(req, res, loggedInUserName) {
    console.log("##### se intra in presidentList()");
    //select the start and stop date of the last election
    connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            console.log("new Date():")
            console.log(new Date());
            let lastPresidency = rows[0];
            console.log("lastPresidency");
            console.log(lastPresidency);
            let lastPresidencyStart = lastPresidency.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            let lastPresidencyStop = lastPresidency.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            console.log("lastPresidency.start");
            console.log(lastPresidencyStart);
            console.log("lastPresidency.stop");
            console.log(lastPresidencyStop);

            //check if the election did end
            if (new Date() > lastPresidency.stop) {
                console.log("The presidential elections have not started so there are no presidential candidates.");
                req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
                res.redirect('../pop-up-message');
            } else {
                //select all candidates
                connection.query(`SELECT candidate FROM candidates`, function(err, rows) {
                    if (err) {
                        throw err;
                    } else {
                        console.log("\nrows: (candidates)");
                        console.log(rows)

                        //calculate votes
                        connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE '${lastPresidencyStart}' <= vote_date && vote_date <= '${lastPresidencyStop}' GROUP BY elected`, function (err, result) {
                            if (err) {
                                throw err;
                            } else {
                                console.log("result: (electeds)");
                                console.log(result);
                                res.render('presidentList', {loggedInUserName: loggedInUserName, candidates: rows, electeds : result, popUpMessage: " "});
                            }
                        });
                    }
                });
            }
        }
    });
}

function vote(req, res, userNameElected, userNameVoter) {
    console.log("##### se intra in vote()");
    connection.query(`SELECT vote_date FROM votes WHERE voter = '${userNameVoter}' ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let presentDate = new Date(new Date() + "UTC");
            let userNameVoter_LastTimeHeVoted;
            let userNameVoter_LastTimeHeVoted_AfterADay;

            if (rows[0] == undefined) { //when the user who wants to vote, never voted once before
                userNameVoter_LastTimeHeVoted = "never";
            } else {
                userNameVoter_LastTimeHeVoted = rows[0].vote_date;
                userNameVoter_LastTimeHeVoted_AfterADay = userNameVoter_LastTimeHeVoted;
                userNameVoter_LastTimeHeVoted_AfterADay.setDate(userNameVoter_LastTimeHeVoted_AfterADay.getDate() + 1)
                
                console.log("userNameVoter_LastTimeHeVoted_AfterADay:");
                console.log(userNameVoter_LastTimeHeVoted_AfterADay);
                console.log("presentDate:");
                console.log(presentDate);
            }

            if (userNameVoter_LastTimeHeVoted == "never" || userNameVoter_LastTimeHeVoted_AfterADay < presentDate) {
                connection.query("INSERT INTO votes (voter, elected, vote_date)" +
                "VALUES ('"+  userNameVoter +"', '"+ userNameElected +"', CURRENT_TIMESTAMP)", (err) => {
                    if (err) {
                        throw err;
                    } else {
                        if (appRunOn == "localhost") {
                            res.redirect(`http://localhost:3000/users/president/list`);
                        } else {
                            res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
                        }
                    }
                });
            } else {
                req.flash('message', 'You can only vote once per day.');
                res.redirect('../../pop-up-message');
            }
        }
    });
}

function votesHistory(res, userNameVoter) {
    console.log("##### se intra in votesHistory()");
    connection.query(`SELECT * FROM votes WHERE voter = '${userNameVoter}'`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let usersNameVoted = [], datesOfVote = [];
            for (let i = 0; i < rows.length; ++i) {
                usersNameVoted[i] = rows[i].elected;
                datesOfVote[i] = rows[i].vote_date;
            }
            console.log("usersNameVoted");
            console.log(usersNameVoted);
            console.log("datesOfVote");
            console.log(datesOfVote);
            connection.query(`SELECT * FROM elections`, function(err, rows) {
                if (err) {
                    throw err;
                } else {
                    let allPresidencies = rows;
                    console.log("allPresidencies");
                    console.log(allPresidencies);
                    res.render('votesHistory', {registeredUserName: userNameVoter, usersNameVoted: usersNameVoted, date : datesOfVote, allPresidencies: allPresidencies, appRunOn : appRunOn});                }
            });
        }
    });
}

//helper functions
function selectCandidates() {
    console.log("+++ se intra in selectCandidates()")
    connection.query(`SELECT * FROM candidates`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let candidates = [];
            //console.log("rows:")
            //console.log(rows);
            for (let i = 0; i < rows.length; ++i) {
                candidates[i] = rows[i].candidate;
            }
            console.log("candidates:");
            console.log(candidates);
            console.log(candidates.length);
            return candidates;
        }
    });
}

module.exports = {registerUser, loginUser, startElections, runForPresident, presidentList, vote, votesHistory, selectCandidates};