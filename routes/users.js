const express = require('express');
const mysql = require('mysql');
var router = express.Router();

var connection;
var appRunOn;

/*let currentDate = new Date();
currentDate = new Date(currentDate + "UTC");
//currentDate = new Date(currentDate + "UTC").toISOString().replace(/T/, ' ').replace(/\..+/, '');
console.log(currentDate);*/

if (process.env.JAWSDB_URL) {
    //Create connection to JawsDB
    connection = mysql.createConnection(process.env.JAWSDB_URL);
    appRunOn = "heroku";
} else {
    //Create connection to MySQL
    connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "password",
        database: "presidential_elections_db",
        port: "3306"
    });
    appRunOn = "localhost";
}

//Connect to the database (localhost)
connection.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log("connected to the database (localhost)");
    }
});

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

router.get('/pop-up-message', (req, res) => {
    console.log("\n se intra in /pop-up-message \n");
    
    //console.log(req.flash('message')); //because it doesn't come as a string
    let actualMessage = req.flash('message') + ""; //I make it a string
    console.log(actualMessage);

    if (actualMessage == 'This account does not exist.' || actualMessage == 'The name or the email is already taken, please change it.' || actualMessage == 'Account successfully created.') {
        res.render('homePage', { popUpMessage: actualMessage});
    } else if (actualMessage == 'You can only vote once per day.' || actualMessage == 'You can not vote yourself.'){
        res.render('presidentList', {popUpMessage: actualMessage});
    } else if (actualMessage == 'The presidential elections have not started so you can not run for president.' || actualMessage == 'The presidential elections have not started so there are no presidential candidates.') {
        res.render('userAccount', {registeredUserInfo: req.session.loggedInUserInfo, popUpMessage: actualMessage});
    } else if (actualMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo: req.session.loggedInUserInfo, popUpMessage: actualMessage});
    } else { //if you refresh the page, after you got the pop-up message
        if (appRunOn == "localhost") {
            res.redirect(`http://localhost:3000/`);
        } else {
            res.redirect(`https://presidential--elections.herokuapp.com/`);
        }
    }
});

router.post('/register', function(req, res) {
    let name = req.body.inputName;
    let email = req.body.inputEmail;
    let password = req.body.inputPassword;

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
});

router.post('/login', function (req, res) {
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;

    connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            if (rows[0] == undefined) {
                req.flash('message', 'This account does not exist.');
                res.redirect('pop-up-message');
            } else {
                req.session.loggedInUserInfo = rows[0]; //save the logged in user informations with session
                console.log(req.session.loggedInUserInfo);
                
                if (req.session.loggedInUserInfo.role != "admin") {
                    res.render('userAccount', {registeredUserInfo: rows[0], popUpMessage: " "});
                } else {
                    res.render('adminAccount', {registeredUserInfo: req.session.loggedInUserInfo, popUpMessage: "adminAcc"});
                }
            }
        }
    });
});

//Admin
router.post("/president/elections", function (req, res) {
    console.log("\nse intra in /president/elections\n")

    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;
    console.log(startPresidency);
    console.log(stopPresidency);

    connection.query("INSERT INTO elections (start, stop)" +
    "VALUES ('"+  startPresidency +"', '"+ stopPresidency +"')", (err) => {
        if (err) {
            throw err;
        } else {
            console.log("inserted into elections");
            req.flash('message', 'Presidency succesfully created.');
            res.redirect('../../pop-up-message');
        }
    });
});

router.post("/president/run", function (req, res) {
    console.log("\nse intra in /president/run\n")
    let loggedInUserName = req.session.loggedInUserInfo.name;

    connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let lastPresidency = rows[0];
            console.log(lastPresidency);

            if (lastPresidency.start < new Date() && new Date() < lastPresidency.stop) {
                connection.query(`UPDATE users SET role = "runForPresident" WHERE name = '${loggedInUserName}'`, (err) => {
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
});

router.get('/president/list', function (req, res) {
    console.log("\nse intra in /president/list/\n")
    let loggedInUserName = req.session.loggedInUserInfo.name;
    
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

            if (new Date() > lastPresidency.stop) {
                console.log("SE STERG PRESEDINTII PT. CA S-A TERMINAT CURENTA CAMPANIE ELECTORALA");
                connection.query(`UPDATE users SET role = NULL`, (err) => {
                    if (err) {
                        throw err;
                    } else {
                        req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
                        res.redirect('../pop-up-message');
                    }
                });
            } else {
                connection.query(`SELECT name FROM users WHERE role = "runForPresident"`, function(err, rows) {
                    if (err) {
                        throw err;
                    } else {
                        let usersNameWhoRunForPresident = [];
                        for (let i = 0; i < rows.length; ++i) {
                            usersNameWhoRunForPresident[i] = rows[i].name;
                        }
                        console.log("usersNameWhoRunForPresident");
                        console.log(usersNameWhoRunForPresident);

                        connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE vote_date >= '${lastPresidencyStart}' && vote_date <= '${lastPresidencyStop}' GROUP BY elected`, function (err, result) {
                            if (err) {
                                throw err;
                            } else {
                                console.log("result");
                                console.log(result);
                                let usersNameWithVotes = [];
                                for (let i = 0; i < result.length; ++i) {
                                    usersNameWithVotes[i] = result[i];
                                }
                                console.log("usersNameWithVotes");
                                console.log(usersNameWithVotes);
                                
                                res.render('presidentList', {loggedInUserName: loggedInUserName, usersNameWhoRunForPresident: usersNameWhoRunForPresident, usersNameWithVotes : usersNameWithVotes, popUpMessage: " "});
                            }
                        });
                    }
                });
            }
        }
    });
});

router.post("/user/:id/vote", function (req, res) {
    console.log("\n se intra in /user/vote\n");

    let userNameElected = req.params.id;
    let userNameVoter = req.session.loggedInUserInfo.name;

    console.log("userNameWhoWasVoted= " + userNameElected);
    console.log("userNameVoter= " + userNameVoter);

    if (userNameElected == userNameVoter) {
        req.flash('message', 'You can not vote yourself.');
        res.redirect('../../pop-up-message');
    } else {
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
});

router.get('/votes/history', function (req, res) {
    console.log("\n se intra in /votes/history\n");
    let userNameVoter = req.session.loggedInUserInfo.name;

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
});

/*
router.get('/votes/history', function (req, res) {
    console.log("\n se intra in /votes/history\n");
    let userNameVoter = req.session.loggedInUserInfo.name;

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
});
*/

module.exports = router;