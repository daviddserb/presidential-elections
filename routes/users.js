const express = require('express');
const router = express.Router();

const db_connection = require('../db/connection.js')
const db_tables = require('../db/tables.js')
const db_users = require('../db/users.js');

db_connection.createConnection();
db_connection.connectToDatabase();
db_tables.createTablesInDatabase();

const minElectionDuration = 7; // The minimum duration (in days) for an election

router.get('/pop-up-message', async (req, res) => {
    let messages = req.flash('message');
    // Sometimes req.flash saves a message multiple times (as a BUG) => select the last one (as a work-around) and convert it to string
    let lastMessage = messages[messages.length - 1] + '';

    var isRunningElection = false;
    var isCurrentCandidate = false;
    
    var createElectionMessages = ["Presidency election started.", "Election start date can not be in the past!", `Election duration can not be less than ${minElectionDuration} days!`, "An existing election is already running!"];
    var voteMessages = ["You can only vote once per day!", "You can not vote yourself!"];

    try {
        const runningElection = await db_users.checkIfRunningElection();
        isRunningElection = true;

        var allCandidatesWithVotes = await db_users.getCandidatesWithVotes(runningElection);
    } catch (exception) {
    }

    try {
        await db_users.checkIfCurrentCandidate(req.session.loggedInUserInfo, runningElection);
        isCurrentCandidate = true;
    } catch (exception) {
    }

    try {
        const futureElection = await db_users.checkIfFutureElectionScheduled();
        createElectionMessages.push(`Election already scheduled: ${formatDate(futureElection.start)} - ${formatDate(futureElection.stop)}!`);
    } catch (exception) {
    }

    if (lastMessage == "No election running right now!" || createElectionMessages.includes(lastMessage)) {
        res.render('profile', {loggedInUserInfo: req.session.loggedInUserInfo, isRunningElection: isRunningElection, isCurrentCandidate: isCurrentCandidate, message: lastMessage});
    } else if (voteMessages.includes(lastMessage)) {
        console.log(lastMessage)
        res.render('electionCandidates', {loggedInUserData: req.session.loggedInUserInfo, candidatesWithVotes: allCandidatesWithVotes, message: lastMessage});
    }
});

router.post('/register', async function (req, res) {
    const name = req.body.inputName;
    const email = req.body.inputEmail;
    const password = req.body.inputPassword;

    // One method to call async functions - try catch block and use async await
    try {
        // Await the registerUser() function because it is an async function (DB call)
        // So we have to wait it in order for the Promise to be completed (and not pending, for example)
        const registrationResult = await db_users.registerUser(name, email, password);
        res.render('home', {message: registrationResult});
    } catch (error) {
        res.render('home', {message: error});
    }
});

router.post('/login', (req, res) => {
    const email = req.body.accountEmail;
    const password = req.body.accountPassword;

    // Second method to call async functions - then catch block
    db_users.loginUser(email, password)
    .then((result) => {
        // req is a HTTP request made by the client (web browser) to the server (Node.js).
        // We use it in order to save data (information about the logged in user) in-memory on the server so we can access the data in different HTTP requests.
        req.session.loggedInUserInfo = result;

        res.redirect('profile');
    })
    .catch((error) => {
        res.render('home', {message: error});
    });
});

router.get('/profile', async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    try {
        // Check if there is a running election
        const runningElection = await db_users.checkIfRunningElection();
        var isRunningElection = true;

        if (loggedInUserData.role != 'admin') {
            // Check if the logged-in user is a candidate in the current running election
            await db_users.checkIfCurrentCandidate(loggedInUserData, runningElection);
            var isCurrentCandidate = true;
        }
    } catch (error) {
        var message = error;
    }

    res.render('profile', {loggedInUserInfo: loggedInUserData, isRunningElection: isRunningElection, isCurrentCandidate: isCurrentCandidate, message: message});
});

router.post("/president/run", async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    try {
        const runningElection = await db_users.checkIfRunningElection();

        await db_users.saveCandidate(runningElection, loggedInUserData);
        res.redirect('/users/election-candidates');
    } catch (exception) {
        throw exception;
    }
});

router.get('/election-candidates', async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;
    try {
        const runningElection = await db_users.checkIfRunningElection();

        const allCandidatesWithVotes = await db_users.getCandidatesWithVotes(runningElection);

        res.render('electionCandidates', {loggedInUserData: loggedInUserData, candidatesWithVotes: allCandidatesWithVotes});
    } catch (error) {
        throw exception;
    }
});

router.post("/user/:id/vote", async (req, res) => {
    // The user who voted (it only can be the logged in user)
    const voter = req.session.loggedInUserInfo;
    // The name of the user who got voted
    const votedCandidate = req.params.id;

    // Validation: User cannot vote himself
    if (voter.name === votedCandidate) {
        req.flash('message', 'You can not vote yourself!');
        res.redirect('../../pop-up-message');
        return;
    }

    // Validation: User cannot vote more than one time/day
    const voterLastVoteDate = await db_users.getVoterLastVoteDate(voter.name);
    // Case 1: Voter has not voted at all (never) until now => CAN VOTE
    if (!voterLastVoteDate) {
        await userCanVote(voter, votedCandidate);
        res.redirect('back');
    // Case 2: Voter has voted before => check if ONE DAY has passed since HIS LAS VOTE
    } else {
        const currentDate = new Date();
        
        // Calculate the time difference in milliseconds
        const timeDifference = currentDate - voterLastVoteDate.vote_date;
        
        // Calculate the number of milliseconds in a day
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
        
        // Case 2.1: A day has passed since the last vote => CAN VOTE
        if (timeDifference >= oneDayInMilliseconds) {
            await userCanVote(voter, votedCandidate);
            res.redirect('back'); // Redirect to the same URL to restart the page so the data will be updated
        // Case 2.2: Less than a day has passed since the last vote => CANNOT VOTE
        } else {
            req.flash('message', 'You can only vote once per day!');
            res.redirect('../../pop-up-message');
        }
    }
});

router.get('/votes/history', async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    const userVoteHistoryDict = userVoteHistoryToDict();

    const electedsWithVotes = await db_users.getElectedsWithTotalVotesFromAllElections();
    const electionWinners = getFirstRowForEachElection(electedsWithVotes);

    res.render('votesHistory', {loggedInUserName: loggedInUserData.name, userVoteHistoryDict: userVoteHistoryDict, electionWinners: electionWinners});
});

// For Admin only - create election
router.post("/president/elections", async (req, res) => {
    // Extract the admin's input for Dates (that come as string) and convert them to Date
    const startDateElection = new Date(req.body.startDateElection);
    const finishDateElection = new Date(req.body.finishDateElection);

    // Validation: Start date cannot be in the past
    const currentDate = new Date();
    if (startDateElection < currentDate) {
        req.flash('message', "Election start date can not be in the past!");
        res.redirect('../pop-up-message');
        return;
    }

    // Validation: The election duration cannot be less than at least minElectionDuration days
    const timeDifference = finishDateElection - startDateElection; // Calculate the election interval in milliseconds
    const daysTimeDifference = timeDifference / (1000 * 60 * 60 * 24); // Convert the election interval to days
    if (daysTimeDifference < minElectionDuration) {
        req.flash('message', `Election duration can not be less than ${minElectionDuration} days!`);
        res.redirect('../pop-up-message');
        return;
    }

    // Validation: Cannot create a new election if an election is already running
    try {
        await db_users.checkIfRunningElection();
        req.flash('message', "An existing election is already running!");
        res.redirect('../pop-up-message');
        return;
    } catch (error) {
        // No election is running right now
    }

    // Validation: Cannot create a new election if an election is scheduled for the future
    try {
        const futureElection = await db_users.checkIfFutureElectionScheduled();
        req.flash('message', `Election already scheduled: ${formatDate(futureElection.start)} - ${formatDate(futureElection.stop)}!`);
        res.redirect('../pop-up-message');
        return;
    } catch (error) {
        // No election is scheduled for the future
    }

    if (await db_users.createElection(formatDate(startDateElection), formatDate(finishDateElection)) == true) {
        req.flash('message', "Presidency election started.");
        res.redirect('../pop-up-message');
    }
});

async function userCanVote(voter, elected) {
    try {
        const runningElection = await db_users.checkIfRunningElection();
        await db_users.saveVote(runningElection.id, voter, elected);
    } catch (exception) {
        throw exception;
    }
}

// date should be of type DateTime and will be returned as formatted string
function formatDate(date) {
    return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

async function userVoteHistoryToDict() {
    const userVoteHistory = await db_users.getUserVoteHistory(req.session.loggedInUserInfo);

    // Make dictionary for userVoteHistory:
    const userVoteHistoryDict = {};
    // Iterate through the query result and populate the dictionary
    userVoteHistory.forEach(row => {
        // Create the composed key for the dictionary
        const dictKey = `${formatDate(row.election_start)} ~ ${formatDate(row.election_stop)}`;

        // Check if the dictKey is already a key in the dictionary
        if (!userVoteHistoryDict.hasOwnProperty(dictKey)) {
            // If not, create a new array for that key
            userVoteHistoryDict[dictKey] = [];
        }

        // Save the current row into the array corresponding to the dictKey
        userVoteHistoryDict[dictKey].push({
            nr_election: row.election_id,
            elected: row.elected,
            vote_date: formatDate(row.vote_date),
            election_stop: row.election_stop
        });
    });

    return userVoteHistoryDict;
}

// Function to get only the first row for each nr_election (so the result will be the winner from each election)
const getFirstRowForEachElection = (electedsWithVotes) => {
    const firstRowsDict = {};

    electedsWithVotes.forEach((row) => {
      const { nr_election } = row;
  
      // If this nr_election is not already in the dictionary, add it
      if (!firstRowsDict.hasOwnProperty(nr_election)) {
        firstRowsDict[nr_election] = row;
      }
    });
  
    return firstRowsDict;
};

module.exports = router;