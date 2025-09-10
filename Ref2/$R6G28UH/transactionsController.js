const txModel = require('../models/transactionModel');
const accountModel = require('../models/accountModel');
const assetModel = require('../models/assetModel');

async function list(req,res){
  const items = await txModel.all(200);
  res.render('transactions/list', { items });
}
async function showNew(req,res){
  const accounts = await accountModel.all();
  const assets = await assetModel.all();
  res.render('transactions/new', { accounts, assets });
}
async function postNew(req,res){
  const body = req.body;
  await txModel.create({
    account_id: body.account_id,
    type: body.type,
    amount: body.amount,
    category: body.category,
    asset_id: body.asset_id || null,
    description: body.description,
    created_at: body.created_at || new Date()
  });
  res.redirect('/transactions');
}
async function showEdit(req,res){
  const tx = await txModel.get(req.params.id);
  const accounts = await accountModel.all();
  const assets = await assetModel.all();
  res.render('transactions/edit', { tx, accounts, assets });
}
async function postEdit(req,res){
  await txModel.update(req.params.id, req.body);
  res.redirect('/transactions');
}
async function remove(req,res){
  await txModel.remove(req.params.id);
  res.redirect('/transactions');
}
module.exports = { list, showNew, postNew, showEdit, postEdit, remove };
