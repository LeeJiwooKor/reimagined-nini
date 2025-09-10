const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

async function showLogin(req, res){
  res.render('login', { message: req.flash('error') });
}

async function postLogin(req, res){
  const { username, password } = req.body;
  const user = await userModel.findByUsername(username);
  if(!user){
    req.flash('error', 'Invalid credentials');
    return res.redirect('/login');  
  }
  const ok = await bcrypt.compare(password, user.password);
  if(!ok){
    req.flash('error', 'Invalid credentials');
    return res.redirect('/login');
  }
  req.session.user = { id: user.id, username: user.username, display_name: user.display_name, role: user.role };
  res.redirect('/');
}

function logout(req, res){
  req.session.destroy(() => res.redirect('/login'));
}

module.exports = { showLogin, postLogin, logout };
