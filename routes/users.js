const express = require('express');
const router = express.Router();

const db_connection = require('../db/connection.js')
const db_tables = require('../db/tables.js')
const db_users = require('../db/users.js');

db_connection.createConnection();
db_connection.connectToDatabase();
db_tables.createTablesInDatabase();

router.get('/pop-up-message', async (req, res) => {
    let messages = req.flash('message');
    // Sometimes req.flash saves a message multiple times (as a BUG) => select the last one (as a work-around)
    let lastMessage = messages[messages.length - 1] + '';

    const registerMessages = ["Account successfully created.", "The name and/or the email is already taken!"];
    const loginMessages = ["User not found!"];
    if (registerMessages.includes(lastMessage) || loginMessages.includes(lastMessage)) {
        res.render('home', {message: lastMessage});
        return;
    }

    try {
        var isRunningElection = false;
        var isCurrentCandidate = false;
        const runningElection = await db_users.checkIfRunningElection();
        // If there is a running election right now
        if (runningElection != []) {
            isRunningElection = true;
            const currentRunningCandidate = await db_users.checkIfCurrentCandidate(req.session.loggedInUserInfo, runningElection);
            // If the logged-in user is a current candidate in the running election
            if (currentRunningCandidate != []) {
                isCurrentCandidate = true;
            }
            var allCandidatesWithVotes = await db_users.getCandidatesWithVotes(runningElection);
        }
    } catch (exception) {
        throw exception;
    }

    const createElectionMessages = [lastMessage == "Presidency election started.", "Election start date can not be in the past!", "Election duration can not be less than 7 days!", "An existing election is already running!", "An election is already scheduled for the future!"];
    if (lastMessage == 'No election running right now!' || createElectionMessages.includes(createElectionMessages)) {
        res.render('profile', {loggedInUserInfo: req.session.loggedInUserInfo, isRunningElection: isRunningElection, isCurrentCandidate: isCurrentCandidate, message: lastMessage});
    } else if (lastMessage == 'You can only vote once per day.' || lastMessage == 'You can not vote yourself!') {
        res.render('electionCandidates', {loggedInUserData: req.session.loggedInUserInfo, candidatesWithVotes: allCandidatesWithVotes, message: lastMessage});
    }
});

router.post('/register', async function (req, res) {
    const name = req.body.inputName;
    const email = req.body.inputEmail;
    const password = req.body.inputPassword;

    try {
        const promiseResult = await db_users.createUser(name, email, password);
        if (promiseResult == "Account successfully created.") {
            req.flash('message', `${promiseResult}`);
            res.redirect('pop-up-message');
        }
    } catch (error) {
        req.flash('message', `${error}`);
        res.redirect('pop-up-message');
    }
});

router.post('/login', (req, res) => {
    const email = req.body.accountEmail;
    const password = req.body.accountPassword;

    db_users.loginUser(email, password)
    .then((result) => {
        // req is a HTTP request made by the client (web browser) to the server (Node.js).
        // We use it in order to save data (information about the logged in user) in-memory on the server so we can access the data in different HTTP requests.
        req.session.loggedInUserInfo = result;

        res.redirect('profile');
    })
    .catch((error) => {
        req.flash('message', `${error}`);
        res.redirect('pop-up-message');
    });
});

router.get('/profile', async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    if (loggedInUserData.role != 'admin') {
        try {
            const runningElection = await db_users.checkIfRunningElection();

            // Check if there is a running election
            if (runningElection != []) {
                var isRunningElection = true;

                const currentRunningCandidate = await db_users.checkIfCurrentCandidate(loggedInUserData, runningElection);

                // Check if the logged-in user is a candidate in the current running election
                if (currentRunningCandidate != []) {
                    var isCurrentCandidate = true;
                }
            }
        } catch (error) {
            var message = error;
        }
    }

    res.render('profile', {loggedInUserInfo: loggedInUserData, isRunningElection: isRunningElection, isCurrentCandidate: isCurrentCandidate, message: message});
});

router.post("/president/run", async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    try {
        const runningElection = await db_users.checkIfRunningElection();

        // Check if an election is running rigth now
        if (runningElection != []) {

            if (await db_users.saveCandidate(runningElection, loggedInUserData) == "Successfully running for presidency!") {
                res.redirect('/users/election-candidates');
            }
        }
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
            req.flash('message', 'You can only vote once per day.');
            res.redirect('../../pop-up-message');
        }
    }
});

router.get('/votes/history', async (req, res) => {
    const loggedInUserData = req.session.loggedInUserInfo;

    const userVoteHistory = await db_users.getUserVoteHistory(loggedInUserData);

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

    // TODO: sa ma reuit peste getElectedsWithVotesFromAllElections si sa vad daca pot modifica numele sau sa dau detalii mai bune
    const electedsWithVotes = await db_users.getElectedsWithVotesFromAllElections();
    // The winners from all elections made (one winner per election)
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
        req.flash('message', 'Election start date can not be in the past!');
        res.redirect('../pop-up-message');
        return;
    }

    // Validation: The election duration cannot be less than at least minElectionDuration days
    const minElectionDuration = 7; // The minimum duration for an election

    const timeDifference = finishDateElection - startDateElection; // Calculate the election interval in milliseconds
    const daysTimeDifference = timeDifference / (1000 * 60 * 60 * 24); // Convert the election interval to days

    if (daysTimeDifference < minElectionDuration) {
        // TODO: ??? how to send a variable in the message instead of hard-coded number (7)
        req.flash('message', 'Election duration can not be less than 7 days!');
        res.redirect('../pop-up-message');
        return;
    }

    // Validation: Cannot create a new election if an election is already running
    try {
        await db_users.checkIfRunningElection();
        req.flash('message', 'An existing election is already running!');
        res.redirect('../pop-up-message');
        return;
    } catch (error) {
        // No election is running right now
    }

    // Validation: Cannot create a new election if an election is scheduled for the future
    try {
        await db_users.checkIfFutureElectionScheduled();
        // TODO: ??? sa trimit start si stop-ul election-ului pt. a spune in mesaj ca este programata o electie pt. viitor si sa arat date-urile
        req.flash('message', 'An election is already scheduled for the future!');
        res.redirect('../pop-up-message');
        return;
    } catch (error) {
        // No election is scheduled for the future
    }

    if (await db_users.createElection(formatDate(startDateElection), formatDate(finishDateElection)) == true) {
        req.flash('message', 'Presidency election started.');
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