const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

const bcryptjs = require('bcryptjs');
const password = "purple";

const hashedPassword = bcryptjs.hashSync(password, 10);

const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  secret: 'COOKIE_SESSION_SECRET',
  max: 24 * 60 * 60 * 1000
}));

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    linkid: 'userRandomID'
  },
  '9sm5xK': {
    longURL: "http://www.google.com",
    linkid: 'userRandomID'
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "$2a$10$UXMip3NRtG3uuK6vrUZhJ.9guOvuthzKr2Hs9w8bHCKNxGexDrRW."
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "pineapple"
  }
};

const generateRandomString = () => {
  let resultStr = '';
  let possibleOutcomes = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 6; i++) {
    resultStr += possibleOutcomes.charAt(Math.floor(Math.random() * possibleOutcomes.length));
  }
  return resultStr;
}

// This function expression checks if the currentUserid matches with the userid from the database
const userExists = (currentUser) => {
  for (let user in users) {
    if (user === currentUser) {
      return true;
    }
  }
  return false;
};

const emailExists = (email, password) => {
  if (password === undefined) {
    for (userEmail in users) {
      if (users[userEmail].email === email) {
        return true;
      }
    }
    return false;
  }
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (userExists(req.session.user_id)) {
    res.render('urls_index', { username: users[req.session.user_id] });
  } else {
    res.render('login', { username: undefined });
  }
});


app.get('/urls', (req, res) => {
  if (userExists(req.session.user_id)) {
    let subset = {};
    for (let link in urlDatabase) {
      if (urlDatabase[link].linkid === req.session.user_id) {
        subset[link] = urlDatabase[link];
      }
    }
    let templateVars = {
      url: subset,
      username: users[req.session.user_id]
    };
    res.render('urls_index', templateVars);
    res.status(200);
  } else {
    res.status(401).send('Error: 401');
  }
});

// Get new links
app.get('/urls/new', (req, res) => {
  if (userExists(req.session.user_id)) {
    let subset = {};
    for (let link in urlDatabase) {
      if (urlDatabase[link].linkid === req.session.user_id) {
        subset[link] = urlDatabase[link];
      }
    }
    let templateVars = {
      url: subset,
      username: users[req.session.user_id]
    };
    res.render('urls_new', templateVars);
  } else {
    res.status(401).send('Error: 401');
  }
});

app.get('/urls/:id', (req, res) => {
  if (!(urlDatabase[req.params.id])) {
    res.status(404);
    res.send('Error: 404');
    return;
  } if (!req.session.user_id) {
    res.status(401);
    res.send('Error: 401');
    return;
  } if (urlDatabase[req.params.id].linkid !== req.session.user_id) {
    res.status(403)
    res.send('Error: 403');
    return;
  } if (userExists(req.session.user_id)) {

    let templateVars = {
      url: req.params.id,
      long: urlDatabase[req.params.id].longURL
    };
    res.render('urls_show', templateVars);
    return;
  }
});

app.get('/u/:shortURL', (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404);
    res.send('Error: 404');
  }
  res.redirect(urlDatabase[req.params.shortURL].longURL);
});


app.get('/register', (req, res) => {
  if (userExists(req.session.user_id)) {
    res.redirect('/');
  }
  res.render('register');
});


app.post('/urls/:id/delete', (req, res) => {
  if (userExists(req.session.user_id)) {
    delete urlDatabase[req.params.id];
    res.redirect('/urls');
  } else {
    res.status(403).send('403: Permission not granted to delete.');
  }
});

app.post('/urls', (req, res) => {
  if (userExists(req.session.user_id)) {
    let newID = generateRandomString();
    urlDatabase[newID] = {
      longURL: req.body.longURL,
      linkid: req.session.user_id
    };
    res.redirect('/urls');
  } else {
    res.status(401);
    res.send('Error: 401');
  }
});

app.post('/urls/:id', (req, res) => {
  if (!(urlDatabase[req.params.id])) {
    res.status(404);
    res.send('Error: 404');
    return;
  } if (!req.session.user_id) {
    res.status(401);
    res.send('Error: 401');
    return;
  } if (urlDatabase[req.params.id].linkid !== req.session.user_id) {
    res.status(403)
    res.send('Error: 403');
    return;
  } if (userExists(req.session.user_id)) {
    urlDatabase[req.params.id] = {
      longURL: req.body.newURL,
      linkid: req.session.user_id
    };
    res.redirect('/urls');
  }
});

app.post('/login', (req, res) => {
  // check if the e-mail and passwords match and user emails match
  for (let user in users) {
    // let userPassword = bcryptjs.compareSync(req.body.password, users[user].password);
    if (users[user].email === req.body.email && bcryptjs.compareSync(req.body.password, users[user].password)) {
      req.session.user_id = users[user].id;
      res.redirect('/urls');
      return;
    }
  }
  res.status(401).send('Invalid input.');
});

app.post('/register', (req, res) => {
  // check if email or password is empty
  if (req.body.email === '' || req.body.password === '') {
    res.status(400);
    res.send('Email or password empty.')
//now we're checking all the users we have -- does any of them match req.body.email
  } else if (emailExists(req.body.email)) {
    res.status(400);
    res.send('Email is in use.');
  } else {
    // add a new user to dabatase
    let newUserId = generateRandomString();
    users[newUserId] = {
      id: newUserId,
      email: req.body.email,
      password: hashedPassword
    };
    req.session.user_id = newUserId;
    res.redirect('/urls');
  }
});

app.post('/logout', (req, res) => {
  req.session.user_id = null;
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
