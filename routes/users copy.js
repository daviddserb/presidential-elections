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

    if (actualMessage == 'Account successfully created.' || actualMessage == 'The name or the email is already taken, please change it.' || actualMessage == 'This account does not exist.') {
        res.render('homePage', {popUpMessage: actualMessage});
    } else if (actualMessage == 'Presidency succesfully created.') {
        res.render('adminAccount', {registeredUserInfo: req.session.loggedInUserInfo, popUpMessage: actualMessage});
    } else if (actualMessage == 'The presidential elections have not started so you can not run for president.' || actualMessage == 'The presidential elections have not started so there are no presidential candidates.') {
        res.render('userAccount', {registeredUserInfo: req.session.loggedInUserInfo, isCandidate: " ", popUpMessage: actualMessage});
    } else if (actualMessage == 'You can only vote once per day.' || actualMessage == 'You can not vote yourself.'){
        res.render('presidentList', {popUpMessage: actualMessage});
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
    let loggedInUserInfo = req.session.loggedInUserInfo;

    let isCandidate;
    if (await db_users.profile(loggedInUserInfo) == undefined) {
        console.log("NU II CURENT PARTICIPANT");
        isCandidate = "no";
    } else {
        isCandidate = "yes";
        console.log("II CURENT PARTICIPANT");
    }

    if (req.session.loggedInUserInfo.role != "admin") {
            res.render('userAccount', {registeredUserInfo: loggedInUserInfo, isCandidate: isCandidate, popUpMessage: "userAcc"});
        } else {
            res.render('adminAccount', {registeredUserInfo: loggedInUserInfo, popUpMessage: "adminAcc"});
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

router.get('/president/list', async function (req, res) {
    console.log("$$$ /president/list/")
    if (await db_users.selectLastElection() == false) {
        console.log("NU AVEM NICIO ELECTIE...?")
    } else {
        console.log("new Date():")
        console.log(new Date());

        let lastElection = await db_users.selectLastElection();
        console.log("lastElection");
        console.log(lastElection);
        let lastElectionId = lastElection.id;
        console.log("lastElectionId:");
        console.log(lastElectionId);
        let lastElectionStart = lastElection.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let lastElectionStop = lastElection.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        console.log("lastElection.start");
        console.log(lastElectionStart);
        console.log("lastElection.stop");
        console.log(lastElectionStop);

        if (new Date() > lastElection.stop) {
            console.log("The presidential elections have not started so there are no presidential candidates.");
            req.flash('message', 'The presidential elections have not started so there are no presidential candidates.');
            res.redirect('../pop-up-message');
        } else {
            //"false" in string pt. ca daca se returneaza un sir gol comparatia este adevarata
            if (await db_users.selectCurrentCandidates(lastElectionId) == "false") {
                console.log("???...???")
            } else {
                let allCurentCandidates = await db_users.selectCurrentCandidates(lastElectionId);
                console.log('allCurentCandidates:');
                console.log(allCurentCandidates);

                //"false" in string pt. ca daca se returneaza un sir gol comparatia este adevarata
                if (await db_users.calculateEachVote(lastElectionStart, lastElectionStop) == "false") {
                    console.log("habar n-am aici");
                } else {
                    console.log("MI SE INTRA IN RANDAREEEEEE");
                    let electedsAndVotes = await db_users.calculateEachVote(lastElectionStart, lastElectionStop);
                    res.render('presidentList', {loggedInUserInfo: req.session.loggedInUserInfo.name, candidates: allCurentCandidates, electeds : electedsAndVotes, popUpMessage: " "});
                }
            }
        }
    }
});

router.post("/user/:id/vote", async function (req, res) {
    console.log("$$$ /user/vote");
    let userNameElected = req.params.id;
    let userNameVoter = req.session.loggedInUserInfo.name;
    console.log("userNameWhoWasVoted= " + userNameElected);
    console.log("userNameVoter= " + userNameVoter);

    if (userNameElected == userNameVoter) {
        req.flash('message', 'You can not vote yourself.');
        res.redirect('../../pop-up-message');
    } else {
        if (await db_users.selectLastVote(userNameVoter) == false) {
            console.log("if 1 de la vote");
        } else {
            let lastVoteDate = await db_users.selectLastVote(userNameVoter);
            console.log("lastVoteDate:");
            console.log(lastVoteDate);
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
            
            //if he never voted or if it already passed 1 day since the last vote => he can vote
            if (userNameVoter_LastTimeHeVoted == "never" || userNameVoter_LastTimeHeVoted_AfterADay < presentDate) {
                if (await db_users.saveVote(userNameVoter, userNameElected) == false) {
                    console.log("nu a putut fi salvat votul, dar e imposibil");
                } else {
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

router.get('/votes/history', async function (req, res) {
    console.log("$$$ /votes/history");
    let userNameVoter = req.session.loggedInUserInfo.name;
    if (await db_users.selectAllUserVotes(userNameVoter) == "false") {
        console.log("nush...");
    } else {
        let allInfoVotes = await db_users.selectAllUserVotes(userNameVoter);
        let usersNameVoted = [], datesOfVote = [];
        for (let i = 0; i < allInfoVotes.length; ++i) {
            usersNameVoted[i] = allInfoVotes[i].elected;
            datesOfVote[i] = allInfoVotes[i].vote_date;
        }
        console.log("usersNameVoted");
        console.log(usersNameVoted);
        console.log("datesOfVote");
        console.log(datesOfVote);
        if (await db_users.selectAllElections() == false) {
            console.log("nu ii nicio electie");
        } else {
            let allElections = await db_users.selectAllElections();
            console.log("allElections");
            console.log(allElections);
            res.render('votesHistory', {registeredUserName : userNameVoter, usersNameVoted : usersNameVoted, date : datesOfVote, allElections : allElections, appRunOn : appRunOn});    
        }
    }
});

module.exports = router;