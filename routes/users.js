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

    if (actualMessage == 'Account successfully created.' || actualMessage == 'The name or the email is already taken, please change it.' || actualMessage == 'This account does not exist.') {
        res.render('homePage', {popUpMessage : actualMessage});
    } else if (actualMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo : req.session.loggedInUserInfo, popUpMessage : actualMessage});
    } else if (actualMessage == 'The presidential elections have not started so you can not run for president.' || actualMessage == 'The presidential elections have not started so there are no presidential candidates.') {
        res.render('userAccount', {registeredUserInfo : req.session.loggedInUserInfo, isCandidate: " ", popUpMessage : actualMessage});
    } else if (actualMessage == 'You can only vote once per day.' || actualMessage == 'You can not vote yourself.'){
        res.render('presidentList', {popUpMessage : actualMessage});
    }
});

//async before a function => the function always returns a promise and allows await
router.post('/register', async function (req, res) {
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

router.post('/login', async (req, res) => {
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
router.get('/profile', async (req, res) => {
    let loggedInUserInfo = req.session.loggedInUserInfo;

    let currentRunningElection = await db_users.checkIfRunningElection();
    let isCandidate = "no"; //suppose our logged in user is not a candidate

    //if there is an election running => we still need to check if the logged in user is a candidate or not
    if (currentRunningElection != undefined) {
        if (await db_users.checkIfCurrentCandidate(loggedInUserInfo, currentRunningElection) != undefined) {
            isCandidate = "yes";
        }
    }

    if (req.session.loggedInUserInfo.role != "admin") {
            res.render('userAccount', {registeredUserInfo: loggedInUserInfo, isCandidate: isCandidate, popUpMessage: "userAcc"});
        } else {
            res.render('adminAccount', {registeredUserInfo: loggedInUserInfo, popUpMessage: "adminAcc"});
    }
});

//Admin
router.post("/president/elections", async (req, res) => {
    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;

    if (await db_users.startElections(startPresidency, stopPresidency) != false) {
        req.flash('message', 'Presidency succesfully created.');
        res.redirect('../pop-up-message');
    }
});

router.post("/president/run", async (req, res) => {
    console.log("$$$ /president/run")
    let loggedInUserName = req.session.loggedInUserInfo.name;

    let currentRunningElection = await db_users.checkIfRunningElection();

    if (await db_users.checkIfRunningElection() == undefined) {
        req.flash('message', 'The presidential elections have not started so you can not run for president.');
        res.redirect('../pop-up-message');
    } else {
        if (await db_users.saveCandidate(currentRunningElection, loggedInUserName) == true) {
            if (appRunOn == "localhost") {
                res.redirect(`http://localhost:3000/users/president/list`);
            } else {
                res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
            }
        }
    }
});

router.get('/president/list', async (req, res) => {
    console.log("$$$ /president/list/")
    let runningElection = await db_users.checkIfRunningElection();
    console.log("runningElection:");
    console.log(runningElection);

    if (runningElection == undefined) {
        req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
        res.redirect('../pop-up-message');
    } else {
        let runningElectionStart = runningElection.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let runningElectionStop = runningElection.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        console.log("runningElectionStart");
        console.log(runningElectionStart);
        console.log("runningElectionStop");
        console.log(runningElectionStop);

        let allCandidates = await db_users.selectCandidates(runningElection);
        console.log('allCandidates:');
        console.log(allCandidates);

        //false in string because an empty array is considered equal to false
        if (allCandidates != "false") {
            if (await db_users.selectElectedsAndCountVotes(runningElectionStart, runningElectionStop) != "false") {
                console.log("MI SE INTRA IN RANDAREEEEEE");
                let electedsAndVotes = await db_users.selectElectedsAndCountVotes(runningElectionStart, runningElectionStop);
                res.render('presidentList', {loggedInUserInfo : req.session.loggedInUserInfo.name, candidates : allCandidates, electeds : electedsAndVotes, popUpMessage : " "});
            }
        }
    }
});

router.post("/user/:id/vote", async (req, res) => {
    console.log("$$$ /user/vote");
    let userNameElected = req.params.id;
    let userNameVoter = req.session.loggedInUserInfo.name;
    console.log("userNameElected= " + userNameElected);
    console.log("userNameVoter= " + userNameVoter);

    if (userNameElected == userNameVoter) {
        req.flash('message', 'You can not vote yourself.');
        res.redirect('../../pop-up-message');
    } else {
        let lastVoteDate = await db_users.hisLastVote(userNameVoter);
        console.log("lastVoteDate:");
        console.log(lastVoteDate);
        if (lastVoteDate != false) {

            let presentDate = new Date(new Date() + "UTC");
            let userNameVoter_LastTimeHeVoted, userNameVoter_LastTimeHeVoted_AfterADay;

            if (lastVoteDate == undefined) { //when the user who wants to vote, never voted once before
                userNameVoter_LastTimeHeVoted = "never";
            } else {
                userNameVoter_LastTimeHeVoted = lastVoteDate.vote_date;
                userNameVoter_LastTimeHeVoted_AfterADay = userNameVoter_LastTimeHeVoted;
                userNameVoter_LastTimeHeVoted_AfterADay.setDate(userNameVoter_LastTimeHeVoted_AfterADay.getDate() + 1)
                
                console.log("userNameVoter_LastTimeHeVoted_AfterADay:");
                console.log(userNameVoter_LastTimeHeVoted_AfterADay);
                console.log("presentDate:");
                console.log(presentDate);
            }
            
            //if he never voted before or if it already passed 1 day since the last vote => he can vote
            if (userNameVoter_LastTimeHeVoted == "never" || userNameVoter_LastTimeHeVoted_AfterADay < presentDate) {
                if (await db_users.saveVote(userNameVoter, userNameElected) != false) {
                    if (appRunOn == "localhost") {
                        res.redirect(`http://localhost:3000/users/president/list`);
                    } else {
                        res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
                    }
                }
            } else {
                req.flash('message', 'You can only vote once per day.');
                res.redirect('../../pop-up-message');
            }
        }
    }
});

router.get('/votes/history', async (req, res) => {
    console.log("$$$ /votes/history");
    let userNameVoter = req.session.loggedInUserInfo.name;

    let allInfoVotes = await db_users.allHisVotes(userNameVoter);
    //false in string because an empty array is considered equal to false
    if (allInfoVotes != "false") {
        let usersNameVoted = [], datesOfVote = [];
        for (let i = 0; i < allInfoVotes.length; ++i) {
            usersNameVoted[i] = allInfoVotes[i].elected;
            datesOfVote[i] = allInfoVotes[i].vote_date;
        }
        console.log("usersNameVoted");
        console.log(usersNameVoted);
        console.log("datesOfVote");
        console.log(datesOfVote);

        let allElections = await db_users.selectAllElections();
        console.log("allElections");
        console.log(allElections);
        res.render('votesHistory', {registeredUserName : userNameVoter, usersNameVoted : usersNameVoted, date : datesOfVote, allElections : allElections, appRunOn : appRunOn});    
    }
});

module.exports = router;