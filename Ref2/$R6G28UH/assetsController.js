const assetModel = require('../models/assetModel');

async function list(req,res){
  const items = await assetModel.all();
  res.render('assets/list', { items });
}
async function showNew(req,res){
  res.render('assets/new');
}
async function postNew(req,res){
  await assetModel.create(req.body);
  res.redirect('/assets');
}
async function showEdit(req,res){
  const id = req.params.id;
  const item = await assetModel.get(id);
  res.render('assets/edit', { item });
}
async function postEdit(req,res){
  const id = req.params.id;
  await assetModel.update(id, req.body);
  res.redirect('/assets');
}
async function remove(req,res){
  await assetModel.remove(req.params.id);
  res.redirect('/assets');
}
module.exports = { list, showNew, postNew, showEdit, postEdit, remove };
