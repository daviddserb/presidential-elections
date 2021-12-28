var express = require('express');
var router = express.Router();
const mysql = require('mysql');

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
  'user VARCHAR(255) UNIQUE NOT NULL,' +
  'email VARCHAR(255) UNIQUE NOT NULL,' +
  'password VARCHAR(255) NOT NULL,' +
  'president VARCHAR(255),' +
  'votes INT(255)' +
  ')', (err) => {
  if (err) {
    throw err;
  } else {
    console.log("table created in the database");
  }
});

//Create account
router.post('/createAccount', function(req, res) {
  console.log("CREATE ACCOUNT");
  let user = req.body.inputUser;
  let email = req.body.inputEmail;
  let password = req.body.inputPassword;
  console.log(user + " | " + email + " | " + password);

  connection.query("INSERT INTO users(user, email, password)" +
    "VALUES ('"+ user +"', '"+ email +"', '"+ password +"')", (err) => {
    if (err) {
      // ???!!!???
      //sa ii spun cumva ca user SI/SAU email deja exista in baza de date
      res.redirect('/error');

      // ???!!!???
      //throw err; //asta a trebuit sa o pun in comentariu, ca altfel trebuie sa dau restart la server, ii ok?
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

  connection.query("SELECT * FROM users", function(err, rows) {
    if (err) {
      throw err;
    } else {
      for (var i = 0; i < rows.length; ++i) {
        if (email == rows[i].email && password == rows[i].password) {
          console.log("TE CONECTEZI LA CONT");
          res.render('userAccount', {userInfo: rows[i]});
          break;
        } else {
          if (i == rows.length - 1) { //if we checked the entire database
            res.redirect('/error');
          }
        }
      }
    }
  });
});

//President List
router.get('/presidentList', function (req, res) {
  connection.query("SELECT * FROM users", function(err, result) {
    if (err) {
      throw err;
    } else {
      res.render('presidentList', {userInfo: result});
    }
  });
});

//Run for president
router.post("/runForPresident/:email", function (req, res) {
  console.log("\n se intra in /runForPresident");
  let userEmail = req.params.email;
  console.log("userEmail= " + userEmail + "\n");
  connection.query(`UPDATE users SET president = "YES" WHERE email = '${userEmail}'`, (err) => {
    if (err) {
      throw err;
    } else {
      console.log("You are now running for president.");
      res.redirect('http://localhost:3000/users/presidentList?');
    }
  });
});

//Vote
router.post("/vote/:id", function (req, res) {
  console.log("\n se intra in vote");

  let userId = req.params.id;
  console.log("userId= " + userId + "\n");

  connection.query("SELECT * FROM users", function(err, rows) {
    if (err) {
      throw err;
    } else {
      for (var i = 0; i < rows.length; ++i) {
        if (userId == rows[i].id) {
          let userVotes = rows[i].votes;
          console.log("userVotes= " + userVotes);

          connection.query(`UPDATE users SET votes = '${++userVotes}' WHERE id = '${userId}'`, (err) => {
            if (err) {
              throw err;
            } else {
              console.log("You did vote.");
              res.redirect('http://localhost:3000/users/presidentList?');
            }
          });
        }
      }
    }
  });
});

module.exports = router;
