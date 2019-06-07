var express = require('express');
var router = express.Router();
var User = require('../models/user');
const fetch = require("node-fetch");
const _ = require('lodash')

// GET route for reading data
router.get('/', function (req, res, next) {
  return res.sendFile(path.join(__dirname + '/templateLogReg/index.html'));
});


//POST route for updating data
router.post('/', function (req, res, next) {
  // confirm that user typed same password twice
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error('Passwords do not match.');
    err.status = 400;
    res.send("passwords dont match");
    return next(err);
  }

  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
    }

    User.create(userData, function (error, user) {
      if (error) {
        return next(error);
      } else {
        req.session.userId = user._id;
        return res.redirect('/profile');
      }
    });

  } else if (req.body.logemail && req.body.logpassword) {
    User.authenticate(req.body.logemail, req.body.logpassword, function (error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/profile');
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
})

// GET route after registering
router.get('/profile', function (req, res, next) {
  User.findById(req.session.userId)
    .exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user === null) {
          var err = new Error('Not authorized! Go back!');
          err.status = 400;
          return next(err);
        } else {
          // return res.send('<h1>Name: </h1>' + user.username + '<h2>Mail: </h2>' + user.email + '<br><a type="button" href="/logout">Logout</a>')
          findServer((data) => {
            res.status(200).json(data);
          });
        }
      }
    });
});

// GET for logout logout
router.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});


// creating dummy servers with priority 
router.get('/server1', function (req, res) {
  res.status(200).send({
    url: `http://localhost:3000${req.url}`,
    priority: 1
  });
});

router.get('/server2', function (req, res) {
  res.status(201).send({
    url: `http://localhost:3000${req.url}`,
    priority: 2
  });
});
router.get('/server3', function (req, res) {
  res.status(404).send({
    url: `http://localhost:3000${req.url}`,
    priority: 3
  });
});
router.get('/server4', function (req, res) {
  res.status(299).send({
    url: `http://localhost:3000${req.url}`,
    priority: 10
  });
});
router.get('/server5', function (req, res) {
  res.status(212).send({
    url: `http://localhost:3000${req.url}`,
    priority: 8
  });
});

// helper function to find server with lowest priority
function findServer(callback) {
  const urls = [
    'http://localhost:3000/server1',
    'http://localhost:3000/server2',
    'http://localhost:3000/server3',
    'http://localhost:3000/server4',
    'http://localhost:3000/server5'
  ];
  Promise.all(urls.map(url =>
      fetch(url)
      .then(checkOnlineStatus)
      .then(parseJSON)
      .catch(error => error)
    ))
    .then(data => {
      var find = _.filter(data, function (o) {
        return o !== null;
      });
      if (_.isEmpty(find)) {
        callback('no servers are online')
      } else {
        return Promise.resolve(find)
      }
    })
    .then((find) => {
      find.sort(function (a, b) {
        return a.priority - b.priority;
      });
      console.log(find)
      return Promise.resolve(find)
    })
    .then((find) => {
      callback(find[0])
    })
}

// check online status
function checkOnlineStatus(response) {
  if (response.status < 300 && response.status >= 200) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(null);
  }
}

// parsing response into json 
function parseJSON(response) {
  return response.json();
}

module.exports = router;