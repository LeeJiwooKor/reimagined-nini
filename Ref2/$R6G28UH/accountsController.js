const accountModel = require('../models/accountModel');

async function list(req,res){
  const items = await accountModel.all();
  res.render('accounts/list', { items });
}
async function showNew(req,res){
  res.render('accounts/new');
}
async function postNew(req,res){
  await accountModel.create(req.body);
  res.redirect('/accounts');
}
async function showEdit(req,res){
  const item = await accountModel.get(req.params.id);
  res.render('accounts/edit', { item });
}
async function postEdit(req,res){
  await accountModel.update(req.params.id, req.body);
  res.redirect('/accounts');
}
async function remove(req,res){
  await accountModel.remove(req.params.id);
  res.redirect('/accounts');
}
module.exports = { list, showNew, postNew, showEdit, postEdit, remove };
