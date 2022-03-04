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

//async before a function => the function always returns a promise and allows await
router.post('/register', async (req, res) => {
    let name = req.body.inputName;
    let email = req.body.inputEmail;
    let password = req.body.inputPassword;

    //await only works inside the async function and it does wait for a promise
    if (await db_users.registerUser(name, email, password) == false) {
        req.flash('message', 'The name or the email is already taken, please change it.');
        res.redirect('pop-up-message');
    } else {
        req.flash('message', 'Account successfully created.');
        res.redirect('pop-up-message');
    }
});

router.post('/login', async function (req, res) {
    console.log("$$$ /login");
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;
    if (await db_users.loginUser(email, password) == false) {
        req.flash('message', 'This account does not exist.');
        res.redirect('pop-up-message');
    } else {
        req.session.loggedInUserInfo = await db_users.loginUser(email, password);
        res.redirect('profile'); //redirectionam in ruta router.get('/profile')
    }
});

//if login success => redirect /profile
router.get('/profile', async function (req, res) {
    console.log("~~~ SE INTRA IN RUTA /profile");
    let loggedInUserName = req.session.loggedInUserInfo.name;
    console.log('await db_users.loginUser(email, password):');
    console.log(await db_users.profile(loggedInUserName));

    let isCandidate;
    if (await db_users.profile(loggedInUserName) == undefined) {
        console.log("NU II CURENT PARTICIPANT");
        isCandidate = "no";
    } else {
        isCandidate = "yes";
        console.log("II CURENT PARTICIPANT");
    }

    if (req.session.loggedInUserInfo.role != "admin") {
            res.render('userAccount', {registeredUserInfo: loggedInUserName, isCandidate: isCandidate, popUpMessage: "userAcc"});
        } else {
            res.render('adminAccount', {registeredUserInfo: loggedInUserName, isCandidate: isCandidate, popUpMessage: "adminAcc"});
    }
});

//Admin
router.post("/president/elections", async function (req, res) {
    console.log("$$$ /president/elections")
    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;
    console.log(startPresidency);
    console.log(stopPresidency);
    if (await db_users.startElections(startPresidency, stopPresidency) == false) {
        throw err;
    } else {
        console.log("inserted into elections");
        req.flash('message', 'Presidency succesfully created.');
        res.redirect('../pop-up-message');
    }
});

router.post("/president/run", async function (req, res) {
    console.log("$$$ /president/run")
    let loggedInUserName = req.session.loggedInUserInfo.name;

    if (await db_users.runForPresident(loggedInUserName) == false) {
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

//helper functions

module.exports = router;