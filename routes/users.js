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
    //??? BUG: sometimes req.flash('message') saves a message for multiple times, so I just select the last message which is the good one (work-around).
    let lastMessage = messages[messages.length - 1] + '';
    console.log('lastMessage:', lastMessage);

    if (lastMessage == 'Account successfully created!' || lastMessage == 'The name and/or the email is already taken, please change it!' || lastMessage == 'User not found!') {
        res.render('homePage', {popUpMessage : lastMessage});
    } else if (lastMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo : req.session.loggedInUserInfo, popUpMessage : lastMessage});
    } else if (lastMessage == 'No election running right now!') {
        console.log("/pop-up-messaage/userAccount");
        res.render('userAccount', {registeredUserInfo : req.session.loggedInUserInfo, isCandidate: " ", popUpMessage : lastMessage});
    } else if (lastMessage == 'You can only vote once per day.' || lastMessage == 'You can not vote yourself!') {
        let runningElection = await db_users.checkIfRunningElection();
        let runningElectionStart = runningElection.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let runningElectionStop = runningElection.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        res.render('presidentList', {candidates : await db_users.selectCandidates(runningElection), electeds : await db_users.selectElectedsAndCountVotes(runningElectionStart, runningElectionStop), popUpMessage : lastMessage});
    } else {
        console.log("nu s-a intrat in niciun mesaj");
    }
});

router.post('/register', async function (req, res) {
    console.log("/register");
    let name = req.body.inputName;
    let email = req.body.inputEmail;
    let password = req.body.inputPassword;

    try {
        const promiseResult = await db_users.registerUser(name, email, password);
        console.log("promiseResult:", promiseResult);
        if (promiseResult == "Account successfully created!") {
            req.flash('message', `${promiseResult}`);
            res.redirect('pop-up-message');
        } else {
            console.log("??? Erori de pe server");
        }
    } catch (error) {
        req.flash('message', `${error}`);
        res.redirect('pop-up-message');
    }
});

router.post('/login', (req, res) => {
    console.log("/login");
    let email = req.body.searchEmail;
    let password = req.body.searchPassword;

    //Call promises with: then catch or async await and try catch.
    db_users.loginUser(email, password)
    .then((result) => {
        console.log("then:");
        console.log("result:", result);
        
        //req = HTTP request facut de client (web browser) spre server (Node.js).
        //Salvam datele in-memory pe server si astfel putem accesa datele la diferite HTTP requests.
        req.session.loggedInUserInfo = result;

        res.redirect('profile');
    })
    .catch((error) => {
        console.log("catch:");
        console.error("error:", error);

        req.flash('message', `${error}`);
        res.redirect('pop-up-message');
    });
});

router.get('/profile', async (req, res) => {
    console.log("/profile");

    let loggedInUserInfo = req.session.loggedInUserInfo;

    let currentRunningElection;
    let isElection = false;
    let currentRunningCandidate;
    let isCandidate = false; //Suppose logged-in user is not a candidate
    let popUpMessage = '';

    try {
        //Check if there is a running election
        currentRunningElection = await db_users.checkIfRunningElection();
        if (currentRunningElection != []) {
            isElection = true;
            //Check if the logged-in user is a candidate
            currentRunningCandidate = await db_users.checkIfCurrentCandidate(loggedInUserInfo, currentRunningElection);
            if (currentRunningCandidate != []) {
                isCandidate = true;
            }
        }
    } catch (error) {
        console.log("catch:");
        if (error == "No election running right now!") {
            popUpMessage = error;
        }
    }

    if (req.session.loggedInUserInfo.role != "admin") {
            res.render('userAccount', {registeredUserInfo : loggedInUserInfo, isElection : isElection, isCandidate : isCandidate, popUpMessage : popUpMessage});
    } else {
            res.render('adminAccount', {registeredUserInfo : loggedInUserInfo, popUpMessage : "adminAcc"});
    }
});

router.post("/president/run", async (req, res) => {
    console.log("/president/run");
    let loggedInUserName = req.session.loggedInUserInfo.name;

    try {
        let currentRunningElection = await db_users.checkIfRunningElection();
        if (currentRunningElection != []) {
            let saveCandidate = await db_users.saveCandidate(currentRunningElection, loggedInUserName);
            if (saveCandidate == "Successfully running for presidency!") {
                if (appRunOn == "localhost") {
                    res.redirect(`http://localhost:3000/users/president/list`);
                } else {
                    res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
                }
            }
        }
    } catch (exception) {
        console.log("catch:");
        if (error == "No election running right now!") {
            popUpMessage = error;
        }
    }
});

router.get('/president/list', async (req, res) => {
    console.log("/president/list/")
    let runningElection = await db_users.checkIfRunningElection();

    if (runningElection == undefined) { // ???
        req.flash('message', 'No election running right now!');
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
    console.log(`/user/${req.params.id}/vote`);

    let userNameElected = req.params.id;
    let userNameVoter = req.session.loggedInUserInfo.name;
    console.log("userNameElected= " + userNameElected);
    console.log("userNameVoter= " + userNameVoter);

    if (userNameElected == userNameVoter) {
        console.log("nu te poti vota de tine");
        req.flash('message', 'You can not vote yourself!');
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
    console.log("/votes/history");
    
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

//For Admin only
router.post("/president/elections", async (req, res) => {
    console.log("/president/elections");

    let startPresidency = req.body.startPresidency;
    let stopPresidency = req.body.stopPresidency;

    if (await db_users.startElections(startPresidency, stopPresidency) == true) {
        req.flash('message', 'Presidency succesfully created.');
        res.redirect('../pop-up-message');
    }
});

module.exports = router;