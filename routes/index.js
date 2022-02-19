var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('homePage', {popUpMessage: " "});
});

module.exports = router;
