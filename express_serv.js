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

//GLOBAL VARIABLES

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
    password: "$2a$10$UXMip3NRtG3uuK6vrUZhJ.9guOvuthzKr2Hs9w8bHCKNxGexDrRW."
  }
};

//Function that generates random alphanumeric strings for id's
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

//Function that checks if the user's e-mail exists
const emailExists = (email, password) => {
  if (password === undefined) {
    for (userEmail in users) {
      if (users[userEmail].email === email) {
        return true;
      }
    }
    return false;
  }
};

//Function to help users store their web searches

const loggedInUser = (user) => {
  let subset = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].linkid === user) {
      subset[shortURL] = urlDatabase[shortURL];
    }
  }
  return subset;
};

//Main page that redirects to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

//Login page
app.get('/login', (req, res) => {
  let templateVars = {
    username: users[req.session.user_id]
  }

  if (users[req.session.user_id]) {
    res.redirect('/urls');
  } else {
  res.render('login', templateVars);
  }
});


app.get('/urls', (req, res) => {
const subsetUser = loggedInUser(req.session.user_id);
    let templateVars = {
      url: subsetUser,
      username: users[req.session.user_id]
    };
    res.render('urls_index', templateVars);
});

// Get new links
app.get('/urls/new', (req, res) => {
    let templateVars = {
      username: users[req.session.user_id]
    };

    res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
    let templateVars = {
      username: users[req.session.user_id],
      shortURL: req.params.id,
      longURL: urlDatabase[req.params.id].longURL
    };
    res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404);
    res.send('Error: 404');
  }
  res.redirect(urlDatabase[req.params.shortURL].longURL);
});

app.get("/u/:id", (req, res) => {
  var shortURL = req.params.id;
  var longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

app.get('/register', (req, res) => {
  if (userExists(req.session.user_id)) {
    res.redirect('/');
  }
  res.render('register');
});

app.post("/urls:id/edit", (req, res) => {
  if (userExists(req.session.user_id)) {
    res.redirect("/urls/:id");
  } else {
    res.status(403);
    res.send('Error');
  }
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
    let shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      linkid: req.session.user_id
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.status(401);
    res.send('Error: 401: <a href="/"> login to gain full access to the website </a>');
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
      longURL: req.body.longURL,
      linkid: req.session.user_id
    };
    res.redirect('/urls/' + req.params.id);
  }
});



app.post('/login', (req, res) => {
  // check if the e-mail and passwords match and user emails match
  // const verifiedId = '';
  
  for (let user in users) {
    const verifiedPassword = bcryptjs.compareSync(req.body.password, users[user].password);
    if (users[user].email === req.body.email && verifiedPassword) {
      req.session.user_id = users[user].id;
      res.redirect('/urls');
      return;
    }
  } 
  res.status(400).send('username and password do not match');
});

app.post('/register', (req, res) => {

  if (req.body.email === '' || req.body.password === '') {
    res.status(400).send('Email or password empty.')
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
      password: req.body.password
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
