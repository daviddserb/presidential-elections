var express = require('express');
var router = express.Router();

/* GET home page - first page to render when the app starts */
router.get('/', function(req, res) {
    res.render('home');
});

module.exports = router;
