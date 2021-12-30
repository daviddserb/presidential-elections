const { response } = require('express');
var express = require('express');
var router = express.Router();
const mysql = require('mysql');

//Connect to MySQL Connections
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "presidential_elections_db",
  port: "3306"
});

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
  'runForPresident VARCHAR(255),' +
  'votes INT(255),' +
  'lastTimeYouVoted DATETIME' +
  ')', (err) => {
  if (err) {
    throw err;
  } else {
    console.log("table created in the database");
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
      // ???!!!???
      //sa ii spun cumva ca name SI/SAU email deja exista in baza de date
      res.redirect('/error');

      // ???!!!???
      //throw err; //asta a trebuit sa o pun in comentariu, ca altfel trebuie sa dau restart la server cand se arunca eroarea, ii ok?
    } else {
      // ???!!!???
      //sa fac cumva sa stie ca i s-a creat contul cu succes

      //res.sendStatus(201);
      //res.send("Account successfully created.");
      res.redirect('/');
    }
  });
});

//Log in
router.post('/login', function (req, res) {
  let email = req.body.searchEmail;
  let password = req.body.searchPassword;

  connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, function(err, rows) {
    if (err) {
      // ???!!!
      // in ce caz mi se intra in acest if? pt. ca daca exista sau nu exista contul, nu se intra in if aici...
      throw err;
    } else {
      // ???!!!
      // cand se baga un cont care nu exista, tot aici se intra, adica in else, nu in if, de ce...?

      console.log(rows);
      console.log(rows[0]);

      if (rows[0] == undefined) {
        console.log("SE INTRA IN IF-UL CU UNDEFINED PT CA ACEST CONT NU EXISTA");
        res.redirect('/error');
      } else {
        res.render('userAccount', {registeredUserInfo: rows[0]});
      }
    }
  });
});

//Presidential candidates
router.get('/presidentialCandidates/:userName', function (req, res) { ///presidentialCandidates/:name/:lastTimeYouVoted
  //???!!!: pot aici sa trimit /:userInfo in loc sa trimit /:name?
  let loggedInUserName = req.params.userName;
  console.log(loggedInUserName);

  connection.query("SELECT * FROM users", function(err, result) {
    if (err) {
      throw err;
    } else {
      res.render('presidentList', {allUsersInfo: result, loggedInUserName: loggedInUserName});
    }
  });
});

//Run for president
router.post("/runForPresident/:name", function (req, res) {

  console.log("\n se intra in /runForPresident");
  let userName = req.params.name;

  console.log("userName= " + userName + "\n");

  connection.query(`UPDATE users SET runForPresident = "YES" WHERE name = '${userName}'`, (err) => {
    if (err) {
      throw err;
    } else {
      console.log("You are now running for president.");
      res.redirect(`http://localhost:3000/users/presidentialCandidates/${userName}`);
    }
  });
});

//Vote
router.post("/vote/:name1/:name2", function (req, res) {
  console.log("\n se intra in /vote");

  let userNameWhoGotVoted = req.params.name1;
  console.log("userNameWhoGotVoted= " + userNameWhoGotVoted);

  let userNameWhoVoted = req.params.name2;
  console.log("userNameWhoVoted= " + userNameWhoVoted);

  connection.query(`SELECT lastTimeYouVoted FROM users WHERE name = '${userNameWhoVoted}'`, function(err, rows) {
    
    //!!! de ce NU se extrage sub forma in care ii salvat in baza de date?
    console.log("ultima data cand a votat IN BAZA DE DATE= ");
    console.log(rows[0].lastTimeYouVoted);

    //!!! si aici cand salvez campul din baza de date in variabila din cod, se afiseaza sub alta forma
    let userNameWhoVoted_LastTimeHeVoted = rows[0].lastTimeYouVoted;
    console.log("ultima data cand a votat IN VARIABILA= " + userNameWhoVoted_LastTimeHeVoted)

    let dateAfterADay = new Date(new Date() + "UTC");
    dateAfterADay.setDate(dateAfterADay.getDate() + 1);
    let dateAfterADayFormatted = dateAfterADay.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    console.log("dateAfterADayFormatted= " + dateAfterADayFormatted);

    if (userNameWhoVoted_LastTimeHeVoted == undefined || dateAfterADayFormatted < userNameWhoVoted_LastTimeHeVoted) {
      console.log("EL POATE VOTA PT. CA ULTIMA DATA CAND A VOTAT II UNDEFINED");
      connection.query(`UPDATE users SET lastTimeYouVoted = CURRENT_TIMESTAMP WHERE name = '${userNameWhoVoted}'`, (err) => {
        if (err) {
          console.log("se intra in if (err) ca nu se poate vota din cauza ultimei dati in care a votat")
          throw err;
        } else {
          console.log("S-A UPDATAT DATA LA CARE A VOTAT.");

          connection.query(`SELECT votes FROM users WHERE name = '${userNameWhoGotVoted}'`, function(err, rows) {
            if (err) {
              console.log("se intra in if (err) ca nu se poate selecta cel care a primit votul")
              throw err;
            } else {
              let userNameWhoGotVoted_Votes = rows[0].votes;
              if (userNameWhoGotVoted_Votes == undefined) {
                console.log("se intra in if ca voturi = undefined");
                userNameWhoGotVoted_Votes = 0;
              }
              console.log("cate voturi are cel care ii votat= " + userNameWhoGotVoted_Votes);
              connection.query(`UPDATE users SET votes = ${++userNameWhoGotVoted_Votes} WHERE name = '${userNameWhoGotVoted}'`, (err) => {
                if (err) {
                  console.log("NU S-AU UPDATAT VOTURILE CU SUCCES");
                  throw err;
                } else {
                  console.log("S-AU UPDATAT VOTURILE CU SUCCES");
                  res.redirect(`http://localhost:3000/users/presidentialCandidates/${userNameWhoVoted}`);
                }
              });
            }
          });
        }
      });
    } else {
      console.log("You can only vote once a day.")
      res.redirect(`http://localhost:3000/users/presidentialCandidates/${userNameWhoVoted}`);
    }
  });

  /*connection.query("SELECT * FROM users", function(err, rows) {
    if (err) {
      throw err;
    } else {
      for (let i = 0; i < rows.length; ++i) {
        if (userNameWhoGotVoted == rows[i].name) {
          let userVotes = rows[i].votes;
          let lastTimeYouVoted = rows[i].lastTimeYouVoted;
          for (let i = 0; i < rows.length; ++i) {
          }
          console.log("lastTimeYouVoted= " + lastTimeYouVoted);
          let dateAfterADay = new Date(new Date() + "UTC");
          dateAfterADay.setDate(dateAfterADay.getDate() + 1);
          let dateAfterADayFormatted = dateAfterADay.toISOString().replace(/T/, ' ').replace(/\..+/, '');
          console.log(dateAfterADayFormatted);

          if (lastTimeYouVoted == null || dateAfterADayFormatted < lastTimeYouVoted) {
            console.log("se intra");
            connection.query(`UPDATE users SET votes = '${++userVotes}', lastTimeYouVoted = CURRENT_TIMESTAMP WHERE name = '${userNameWhoGotVoted}'`, (err) => {
              if (err) {
                throw err;
              } else {
                console.log("You did vote.");
                res.redirect('http://localhost:3000/users/presidentList');
              }
            });
          } else {
            console.log("You can only vote once a day.")
            res.redirect('http://localhost:3000/users/login');
          }
        }
      }
    }
  });*/
});

module.exports = router;
