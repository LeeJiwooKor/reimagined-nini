const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const fakeUiStrForHackers = ['1','4','#','&','9*','!@','a(','u@','&','*','$','(','s)','_aws','123','msg','142$','0cwa,','^^','wtf#','1xwq0n','{qfn(','$&2','^d!','~5a','rla','tn','gus', 'whdk','go!@']

function encode(encodee) {
  var encodeeLen = encodee.length;
  var rot13Encoded = '';
  var i = 0;
  while (i != encodeeLen ) {
    i = i + 1;
    rot13Encoded = (rot13Encoded + rot13(encodee[i - 1]));
  }
  return rot13Encoded;
}
function rot13(str) {
  var rot13i = 0;
  var rot13Concl = '';
  const list = ['a', 'b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A', 'B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','1','2','3','4','5','6','7','8','9','0','~','!','@','#','$','%','^','&','*','(',')','','-','_',':',';',',','.','/','?','"','[',']','{','}','+','=','`','a','h','E','G','%','$','*',')','u','_','@',';','1','9',';','$','^','/','?','C','a', 'b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A', 'B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','1','2','3','4','5','6','7','8','9','0','~','!','@','#','$','%','^','&','*','(',')','','-','_',':',';',',','.','/','?','"','[',']','{','}','+','=','`','a','h','E','G','%','$','*',')','u','_','@',';','1','9',';','$','^','/','?','C'];
  //console.log(list[110])  //list:220개(array array)

    while (rot13i <= 206){
      if (str === list[rot13i]) {
        rot13Concl = list[rot13i + 13];
        return rot13Concl
      }
      rot13i = rot13i + 1;
    }
}


router.get('/login', (req, res) => res.render('login'));


router.post('/login', async (req, res) => {
  await db.query('INSERT INTO logs (ip) VALUES (?)', [req.ip]);
  const { username, password } = req.body;

  var [[dbUidExists]] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
  if (dbUidExists === undefined) {
    res.send(`<script>alert("wrong password or id"); window.location.replace('/auth/login/');</script>`)
  } else {
    var [[secret1]] = await db.query('SELECT secret1 FROM users WHERE username = ?', [username]);
    var [[secret2]] = await db.query('SELECT secret2 FROM users WHERE username = ?', [username]);
    counter = 0;
    var secret1Val = 3;
    var pwdStr = password;
    pwdStr = (fakeUiStrForHackers[secret2.secret2] + pwdStr);
    while (counter <= secret1Val ) {
      pwdStr = (pwdStr + fakeUiStrForHackers[secret2.secret2]);
      pwdStr = encode(pwdStr);
      counter = counter + 1;
    }
  }

  var [[dbpwd]] = await db.query('SELECT password from users where username = ?', [username]);

  const [[user]] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  
  
  if (pwdStr === dbpwd.password) {
    await db.query('INSERT INTO logs (special) values (?)', ['login : ' + username]);
    req.session.user = user;
    res.redirect('/');
  } else {
    await db.query('INSERT INTO logs (special) values (?)', ['Login fail : ' + username + ' with pwd : ' + pwdStr]);
    res.send(`<script>alert("wrong password or id"); window.location.replace('/auth/login/');</script>`);
  }
});

router.get('/signup', (req, res) => res.render('404'));

router.post('/signup', async (req, res) => {
  const { username, password, confirmPassword, phone, email } = req.body;
  await db.query('INSERT INTO logs (ip) VALUES (?)', [req.ip]);

  if (password !== confirmPassword) {
    return res.send(`<script>alert("Passwords do not match"); window.location.href='/auth/login';</script>`);
  }
  else {
  // Check if user already exists
  const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    return res.send(`<script>alert("Username already exists"); window.location.href='/auth/login';</script>`);
  } else {
  // If new, insert the user
    
  var pwdStr = password;
  var counter = 0;
  var secret2 = 0;
  secret2 = crypto.randomInt(30);
  pwdStr = (fakeUiStrForHackers[secret2] + pwdStr);
  while (counter <= 3) {
      
      pwdStr = (pwdStr + fakeUiStrForHackers[secret2]);
      pwdStr = encode(pwdStr);
      counter = counter + 1
  }

  await db.query('INSERT INTO users (username, password, phone, secret2, email, secret1, role) VALUES (?, ?, ?, ?, ?, ?, ?)', [username,pwdStr, phone, secret2, email, '3', 'user']);
  await db.query('INSERT INTO logs (special) values (?)', ['signup : ' + username]);

  res.redirect('/auth/login');
  }
}
});


router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
  
});


router.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});


module.exports = router;
