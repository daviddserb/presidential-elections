const express = require('express');
const router = express.Router();

const db_connection = require('../db/connection.js')
const db_tables = require('../db/tables.js')
const db_users = require('../db/users.js');
const createConnection = db_connection.createConnection();
const appRunOn = createConnection[1];

db_connection.createConnection();
db_connection.connectToDatabase();
db_tables.createTablesInDatabase();

router.get('/pop-up-message', async (req, res) => {
    console.log("/pop-up-message");

    let messages = req.flash('message');
    console.log("messages: ", messages);
    // ??? BUG: sometimes req.flash('message') saves a message for multiple times, so I just select the last message which is the good one (work-around).
    let lastMessage = messages[messages.length - 1] + "";
    console.log('lastMessage:', lastMessage);

    if (lastMessage == 'Account successfully created.' || lastMessage == 'The name or the email is already taken, please change it.' || lastMessage == 'This account does not exist.') {
        res.render('homePage', {popUpMessage : lastMessage});
    } else if (lastMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo : req.session.loggedInUserInfo, popUpMessage : lastMessage});
    } else if (lastMessage == 'The presidential elections have not started so you can not run for president.' || lastMessage == 'The presidential elections have not started so there are no presidential candidates.') {
        res.render('userAccount', {registeredUserInfo : req.session.loggedInUserInfo, isCandidate: " ", popUpMessage : lastMessage});
    } else if (lastMessage == 'You can only vote once per day.' || lastMessage == 'You can not vote yourself.') {
        let runningElection = await db_users.checkIfRunningElection();
        let runningElectionStart = runningElection.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let runningElectionStop = runningElection.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        res.render('presidentList', {candidates : await db_users.selectCandidates(runningElection), electeds : await db_users.selectElectedsAndCountVotes(runningElectionStart, runningElectionStop), popUpMessage : actualMessage});
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
    console.log("/login");
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;

    //BEFORE:
    // if (await db_users.loginUser(email, password) == false) {
    //     req.flash('message', 'This account does not exist.');

    //     res.redirect('pop-up-message');
    // } else {
    //     // req = HTTP request facut de client (web browser) spre server (Node.js).
    //     // Salvam datele in-memory pe server si astfel putem accesa datele la diferite HTTP requests.
    //     req.session.loggedInUserInfo = await db_users.loginUser(email, password);

    //     res.redirect('profile'); //if login success => redirect /profile to load user page and functionalities
    // }

    //AFTER:
    console.log("before promise");
    await db_users.loginUser(email, password)
    .then((result) => {
        console.log("then:");
        console.log("result:", result);
        // req = HTTP request facut de client (web browser) spre server (Node.js).
        // Salvam datele in-memory pe server si astfel putem accesa datele la diferite HTTP requests.
        req.session.loggedInUserInfo = result;
        res.redirect('profile');
    })
    .catch((error) => {
        console.log("catch:");
        console.error("error:", error);
        req.flash('message', 'This account does not exist.');
        //req.flash('message', '${error}');
        res.redirect('pop-up-message');
        //res.status(404).send("User does not exist.");
    });
    console.log("after promise");
});

router.get('/profile', async (req, res) => {
    console.log("se intra in ruta profile");
    let loggedInUserInfo = req.session.loggedInUserInfo;
    let isCandidate = "no"; //suppose our logged in user is not a candidate

    let currentRunningElection = await db_users.checkIfRunningElection();
    //check if election running
    if (currentRunningElection != undefined) {
        // check if the logged in user is a candidate
        let currentRunningCandidate = await db_users.checkIfCurrentCandidate(loggedInUserInfo, currentRunningElection);
        if (currentRunningCandidate != undefined) {
            isCandidate = "yes";
        }
    }

    if (req.session.loggedInUserInfo.role != "admin") {
            res.render('userAccount', {registeredUserInfo : loggedInUserInfo, isCandidate : isCandidate, popUpMessage : "userAcc"});
        } else {
            res.render('adminAccount', {registeredUserInfo : loggedInUserInfo, popUpMessage : "adminAcc"});
    }
});

//Admin
router.post("/president/elections", async (req, res) => {
    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;

    if (await db_users.startElections(startPresidency, stopPresidency) == true) {
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

    if (runningElection == undefined) {
        req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
        res.redirect('../pop-up-message');
    } else {
        let allCandidates = await db_users.selectCandidates(runningElection);

        let runningElectionStart = runningElection.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let runningElectionStop = runningElection.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        console.log("runningElectionStart:");
        console.log(runningElectionStart);
        console.log("runningElectionStop:");
        console.log(runningElectionStop);

        let electedsAndVotes = await db_users.selectElectedsAndCountVotes(runningElectionStart, runningElectionStop);
        res.render('presidentList', {candidates : allCandidates, electeds : electedsAndVotes, popUpMessage : " "});
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
                if (await db_users.saveVote(userNameVoter, userNameElected) == true) {
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

    let allHisVotes = await db_users.allHisVotes(userNameVoter);
    if (allHisVotes.length >= 0) {
        let usersNameVoted = [], datesOfVote = [];
        for (let i = 0; i < allHisVotes.length; ++i) {
            usersNameVoted[i] = allHisVotes[i].elected;
            datesOfVote[i] = allHisVotes[i].vote_date;
        }
        console.log("usersNameVoted");
        console.log(usersNameVoted);
        console.log("datesOfVote");
        console.log(datesOfVote);

        let allElections = await db_users.selectAllElections();
        res.render('votesHistory', {registeredUserName : userNameVoter, usersNameVoted : usersNameVoted, date : datesOfVote, allElections : allElections, appRunOn : appRunOn});    
    }
});

module.exports = router;