console.log("$$$ routes/users.js");
const express = require('express');
const router = express.Router();

const db_connection = require('../db/connection.js')
const createConnection = db_connection.createConnection();
const appRunOn = createConnection[1];
const db_tables = require('../db/tables.js')
const db_users = require('../db/users.js');

db_connection.createConnection();
db_connection.connectToDatabase();
db_tables.createTablesInDatabase();

// !: sa incerc sa fac loggedInUserInfo variabila globala sa vad daca merge

router.get('/pop-up-message', (req, res) => {
    console.log("$$$ /pop-up-message");
    let actualMessage = req.flash('message') + ""; //make it string
    console.log('actualMessage:');
    console.log(actualMessage);
    if (actualMessage == 'This account does not exist.' || actualMessage == 'The name or the email is already taken, please change it.' || actualMessage == 'Account successfully created.') {
        res.render('homePage', {popUpMessage: actualMessage});
    } else if (actualMessage == 'You can only vote once per day.' || actualMessage == 'You can not vote yourself.'){
        res.render('presidentList', {popUpMessage: actualMessage});
    } else if (actualMessage == 'The presidential elections have not started so you can not run for president.' || actualMessage == 'The presidential elections have not started so there are no presidential candidates.') {
        res.render('userAccount', {registeredUserInfo: req.session.loggedInUserInfo, candidates: 0, popUpMessage: actualMessage});
    } else if (actualMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo: req.session.loggedInUserInfo, popUpMessage: actualMessage});
    }
});

router.post('/register', function(req, res) {
    console.log("$$$ /register")
    let name = req.body.inputName;
    let email = req.body.inputEmail;
    let password = req.body.inputPassword;
    if (db_users.registerUser(name, email, password) == false) {
        console.log("se intra in if");
        req.flash('message', 'The name or the email is already taken, please change it.');
        res.redirect('pop-up-message');
    } else {
        console.log("se intra in else");
        req.flash('message', 'Account successfully created.');
        res.redirect('pop-up-message');
    }
});

router.post('/login', function (req, res) {
    console.log("$$$ /login")
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;
    if (db_users.loginUser(email, password) == false) {
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

//Admin
router.post("/president/elections", function (req, res) {
    console.log("$$$ /president/elections")
    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;
    console.log(startPresidency);
    console.log(stopPresidency);
    if (db_users.startElections(startPresidency, stopPresidency) == err) {
        throw err;
    } else {
        console.log("inserted into elections");
        req.flash('message', 'Presidency succesfully created.');
        res.redirect('../pop-up-message');
    }
});

router.post("/president/run", function (req, res) {
    console.log("$$$ /president/run")
    let loggedInUserName = req.session.loggedInUserInfo.name;
    if (db_users.runForPresident(loggedInUserName) == err) {
        throw err;
    } else if (db_users.runForPresident(loggedInUserName) == false) {
        req.flash('message', 'The presidential elections have not started so you can not run for president.');
        res.redirect('../pop-up-message');
    } else {
        if (appRunOn == "localhost") {
            res.redirect(`http://localhost:3000/users/president/list`);
        } else {
            res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
        }
    }
});

router.get('/president/list', function (req, res) {
    console.log("$$$ /president/list/")
    let loggedInUserName = req.session.loggedInUserInfo.name;
    if (db_users.presidentList(loggedInUserName) == err) {
        throw err;
    } else if (db_users.presidentList(loggedInUserName) == false) {
        console.log("The presidential elections have not started so there are no presidential candidates.");
        req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
        res.redirect('../pop-up-message');
    } else {
        console.log("result: (electeds)");
        console.log(result);
        res.render('presidentList', {loggedInUserName: loggedInUserName, candidates: rows, electeds : result, popUpMessage: " "});
    }
});

router.post("/user/:id/vote", function (req, res) {
    console.log("$$$ /user/vote");
    let userNameElected = req.params.id;
    let userNameVoter = req.session.loggedInUserInfo.name;
    console.log("userNameWhoWasVoted= " + userNameElected);
    console.log("userNameVoter= " + userNameVoter);
    if (userNameElected == userNameVoter) {
        req.flash('message', 'You can not vote yourself.');
        res.redirect('../../pop-up-message');
    } else {
        db_users.vote(userNameElected, userNameVoter);
    }
});

router.get('/votes/history', function (req, res) {
    console.log("$$$ /votes/history");
    let userNameVoter = req.session.loggedInUserInfo.name;
    db_users.votesHistory(userNameVoter);
});

module.exports = router;