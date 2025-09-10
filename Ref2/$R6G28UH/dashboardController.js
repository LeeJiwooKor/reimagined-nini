const accountModel = require('../models/accountModel');
const assetModel = require('../models/assetModel');
const txModel = require('../models/transactionModel');

async function index(req, res){
  const accounts = await accountModel.all();
  const assets = await assetModel.all();
  const transactions = await txModel.all(15);

  // compute total balance
  const totalBalance = accounts.reduce((s,a)=> s + Number(a.balance || 0), 0);
  res.render('dashboard', { accounts, assets, transactions, totalBalance });
}

module.exports = { index };
