router.get('/president/list', function (req, res) {
    console.log("\nse intra in /president/list/\n")
    let loggedInUserName = req.session.loggedInUserInfo.name;

    connection.query(`SELECT * FROM presidencies_history ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let lastPresidency = rows[0];
            console.log(lastPresidency);

            if (new Date() > lastPresidency.stop) {
                console.log("SE STERG PRESEDINTII");
                connection.query(`UPDATE users SET runForPresident = NULL`, (err) => {
                    if (err) {
                        throw err;
                    } else {

                    }
                });
            } else {
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
            
                        connection.query(`SELECT whoWasVoted, COUNT(*) as votes FROM votes_history GROUP BY whoWasVoted`, function (err, result) {
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
            }
        }
    });
    
    /*connection.query(`SELECT name FROM users WHERE runForPresident = "YES"`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let usersNameWhoRunForPresident = [];
            for (let i = 0; i < rows.length; ++i) {
                usersNameWhoRunForPresident[i] = rows[i].name;
            }
            console.log("usersNameWhoRunForPresident");
            console.log(usersNameWhoRunForPresident);

            connection.query(`SELECT whoWasVoted, COUNT(*) as votes FROM votes_history GROUP BY whoWasVoted`, function (err, result) {
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
    });*/
});