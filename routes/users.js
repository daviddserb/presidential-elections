const express = require('express');
const mysql = require('mysql');
var router = express.Router();

var connection;
var appRunOn;

if (process.env.JAWSDB_URL) {
    //Connect to JawsDB
    connection = mysql.createConnection(process.env.JAWSDB_URL);
    appRunOn = "Heroku";
} else {
    //Connect to MySQL Connections
    connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "password",
        database: "presidential_elections_db",
        port: "3306"
    });
    appRunOn = "localHost";
}

//Connect to the database
connection.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log("connected to the database");
    }
});

//Create the table in the database
connection.query('CREATE TABLE IF NOT EXISTS users(' + 
'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
'name VARCHAR(255) UNIQUE NOT NULL,' +
'email VARCHAR(255) UNIQUE NOT NULL,' +
'password VARCHAR(255) NOT NULL,' +
'runForPresident VARCHAR(255)' +
')', (err) => {
if (err) {
    throw err;
} else {
    console.log("table 'users' created in the database");
}
});

//Create the table in the database for the vote history of some user
connection.query('CREATE TABLE IF NOT EXISTS vote_history(' + 
'id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
'whoVoted VARCHAR(255),' +
'whoWasVoted VARCHAR(255),' +
'dateOfVote DATETIME' +
')', (err) => {
    if (err) {
        throw err;
    } else {
        console.log("table 'vote_history' created in the database");
    }
});

//Pop-up messages
router.get('/popUpMessage', (req, res) => {
    console.log("\n se intra in /popUpMessage \n");
    //console.log(req.flash('message')); //because it doesn't come as a string
    let actualMessage = "" + req.flash('message'); //I make it a string
    console.log(actualMessage);

    if (actualMessage == 'This account does not exist.' || actualMessage == 'The name or the email is already taken, please change it.' || actualMessage == 'Account successfully created.') {
        console.log("se intra in indexxxxxxxxxxxx");
        res.render('index', { popUpMessage: actualMessage});
    } else if (actualMessage == 'You can only vote once per day.' || actualMessage == 'You can not vote yourself.'){
        res.render('presidentList', {popUpMessage: actualMessage});
    } else { //if you refresh the page, after you got the pop-up message
        if (appRunOn == "localHost") {
            res.redirect(`http://localhost:3000/`);
        } else {
            res.redirect(`https://presidential--elections.herokuapp.com/`);
        }
    }
});

//Create account
router.post('/createAccount', function(req, res) {
    let name = req.body.inputName;
    let email = req.body.inputEmail;
    let password = req.body.inputPassword;

    connection.query("INSERT INTO users(name, email, password)" +
    "VALUES ('"+ name +"', '"+ email +"', '"+ password +"')", (err) => {
        if (err) {
            req.flash('message', 'The name or the email is already taken, please change it.');
            res.redirect('popUpMessage');
        } else {
            req.flash('message', 'Account successfully created.');
            res.redirect('popUpMessage');
        }
    });
});

//Log in
router.post('/login', function (req, res) {
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;

    connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            if (rows[0] == undefined) {
                req.flash('message', 'This account does not exist.');
                res.redirect('popUpMessage');
            } else {
                res.render('userAccount', {registeredUserInfo: rows[0]});
            }
        }
    });
});

//Presidential candidates
router.get('/presidentialCandidates/:userName', function (req, res) {
    let loggedInUserName = req.params.userName;
    
    connection.query(`SELECT name FROM users WHERE runForPresident = "YES"`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let usersNameWhoRunForPresident = [];
            for (let i = 0; i < rows.length; ++i) {
                usersNameWhoRunForPresident[i] = rows[i].name;
            }
            console.log("usersNameWhoRunForPresident");
            console.log(usersNameWhoRunForPresident);

            connection.query(`SELECT whoWasVoted, COUNT(*) as votes FROM vote_history GROUP BY whoWasVoted`, function (err, result) {
                if (err) {
                    throw err;
                } else {
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
});

//Run for president
router.post("/runForPresident/:name", function (req, res) {
    let userName = req.params.name;

    connection.query(`UPDATE users SET runForPresident = "YES" WHERE name = '${userName}'`, (err) => {
        if (err) {
            throw err;
        } else {
            if (appRunOn == "localHost") {
                res.redirect(`http://localhost:3000/users/presidentialCandidates/${userName}`);
            } else {
                res.redirect(`https://presidential--elections.herokuapp.com/users/presidentialCandidates/${userName}`);
            }
        }
    });
});

//Vote
router.post("/vote/:name1/:name2", function (req, res) {
    console.log("\n se intra in /vote");

    let userNameWhoGotVoted = req.params.name1;
    let userNameWhoVoted = req.params.name2;

    console.log("userNameWhoWasVoted= " + userNameWhoGotVoted);
    console.log("userNameWhoVoted= " + userNameWhoVoted);

    if (userNameWhoGotVoted == userNameWhoVoted) {
        req.flash('message', 'You can not vote yourself.');
        res.redirect('../../popUpMessage');
        console.log("#########\n SE MERGE MAI DEPARTE\n ##############")
        //break;
    } else {
        console.log("se intra in else");
        connection.query(`SELECT dateOfVote FROM vote_history WHERE whoVoted = '${userNameWhoVoted}' ORDER BY id DESC LIMIT 1`, function(err, rows) {
            if (err) {
                throw err;
            } else {
                let presentDate = new Date(new Date() + "UTC");
                let userNameWhoVoted_LastTimeHeVoted;
                let userNameWhoVoted_LastTimeHeVoted_AfterADay;

                if (rows[0] == undefined) { //when the user who wants to vote, never voted once before
                    userNameWhoVoted_LastTimeHeVoted = "never";
                } else {
                    userNameWhoVoted_LastTimeHeVoted = rows[0].dateOfVote;
                    userNameWhoVoted_LastTimeHeVoted_AfterADay = userNameWhoVoted_LastTimeHeVoted;
                    userNameWhoVoted_LastTimeHeVoted_AfterADay.setDate(userNameWhoVoted_LastTimeHeVoted_AfterADay.getDate() + 1)
                    
                    console.log("userNameWhoVoted_LastTimeHeVoted_AfterADay:");
                    console.log(userNameWhoVoted_LastTimeHeVoted_AfterADay);
                    console.log("presentDate:");
                    console.log(presentDate);
                }

                if (userNameWhoVoted_LastTimeHeVoted == "never" || userNameWhoVoted_LastTimeHeVoted_AfterADay < presentDate) {
                    connection.query("INSERT INTO vote_history(whoVoted, whoWasVoted, dateOfVote)" +
                    "VALUES ('"+  userNameWhoVoted +"', '"+ userNameWhoGotVoted +"', CURRENT_TIMESTAMP)", (err) => {
                        if (err) {
                            throw err;
                        } else {
                            if (appRunOn == "localHost") {
                                res.redirect(`http://localhost:3000/users/presidentialCandidates/${userNameWhoVoted}`);
                            } else {
                                res.redirect(`https://presidential--elections.herokuapp.com/users/presidentialCandidates/${userNameWhoVoted}`);
                            }
                        }
                    });
                } else {
                    req.flash('message', 'You can only vote once per day.');
                    res.redirect('../../popUpMessage');
                }
            }
        });
    }
    console.log("la sf de else")
});

//Vote History
router.get('/voteHistory/:registeredUserName', function (req, res) {
    let userNameWhoVoted = req.params.registeredUserName;

    connection.query(`SELECT * FROM vote_history WHERE whoVoted = '${userNameWhoVoted}'`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let usersNameVoted = [], datesOfVote = [];
            for (let i = 0; i < rows.length; ++i) {
                usersNameVoted[i] = rows[i].whoWasVoted;
                datesOfVote[i] = rows[i].dateOfVote;
            }
            res.render('voteHistory', {registeredUserName: userNameWhoVoted, usersNameVoted: usersNameVoted, date : datesOfVote, appRunOn : appRunOn});
        }
    });
});

module.exports = router;
