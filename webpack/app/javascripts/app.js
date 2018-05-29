// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

var $ = require("jquery");

import latxw_artifacts from '../../build/contracts/LatiumXTokenWrapped.json'
import latx_artifacts from '../../build/contracts/LatiumX.json'
var LATXW = contract(latxw_artifacts);
var LATX = contract(latx_artifacts);

var accounts, account, WrapperAddr, Wrapper, LATXAddr, LATX, depositAddress;


window.App = {
  start: function() {
    var self = this;


    WrapperAddr = '0x2f85E502a988AF76f7ee6D83b7db8d6c0A823bf9';
    Wrapper = LATXW.at(WrapperAddr);
    LATXAddr = '0x2f85E502a988AF76f7ee6D83b7db8d6c0A823bf9';
    LATX = LATX.at(LATXAddr);

    //var contract = web3.eth.contract(abi);

    LATXW.setProvider(web3.currentProvider);
    LATXW.at(WrapperAddr);


    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      console.log(accounts);
      $('#address').html(account);
      $('#addresses').html(accounts.map(function(account){return '<li><a href="javascript:;" onclick="selectAccount(\''+account+'\')">'+account+'</a></li>'}).join(''));

      App.update(function(){});
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  selectAccount: function(newAccount) {
    account = newAccount;
    $('#address').html(account);
    update(function(){});
  },

  update: function(callback) {

    LATX.balanceOf(account, function(err, balance){
        var balanceLATX = web3.fromWei(balance, "ether");
        $('#balanceLATX').html('<p>Balance (LATX): '+balanceLATX+'</p>');
    });
    Wrapper.balanceOf(account, function(err, balance){
        var balanceLATXW = web3.fromWei(balance, "ether");
        $('#balanceLATXW').html('<p>Balance (LATXW): '+balanceLATXW+'</p>');
        if (balance>0) {
            var html = '<p><input class="form-control" style="width: 150px; display: inline;" type="text" id="withdrawAmount"> <button class="btn btn-default" onclick="withdrawLATXW();">Withdraw LATXW</button></p>';
            if ($('#withdraw').html()!=html) $('#withdraw').html(html);
        } else {
            $('#withdraw').html('<p>You don\'t have any LATXW to withdraw.</p>');
        }
    });
    Wrapper.getPersonalDepositAddress(account, function(err, result) {
        depositAddress = result;
        if (depositAddress != '0x0000000000000000000000000000000000000000') {
            $('#depositAddress').html('<p>Deposit address: <a href="https://etherscan.io/address/'+depositAddress+'" target="_blank">'+depositAddress+'</a></p>');
            var html = '<p><input class="form-control" style="width: 150px; display: inline;" type="text" id="depositAmount"> <button class="btn btn-default" onclick="sendLATX();">Send LATX</button></p>';
            if ($('#sendLATX').html()!=html) $('#sendLATX').html(html);
            LATX.balanceOf(depositAddress, function(err, result) {
                var currentDeposit = web3.fromWei(result, "ether");
                $('#currentDeposit').html('<p>Current deposit (LATX): '+currentDeposit+'</p>');
                if (currentDeposit>0) {
                    $('#processDeposit').html('<p><button class="btn btn-default" onclick="processDeposit();">Process deposit</button></p>');
                } else {
                    $('#processDeposit').html('<p>Please deposit first.</p>');
                }
                callback();
            });
        } else {
            $('#depositAddress').html('<p><button class="btn btn-default" onclick="generateDepositAddress();">Generate deposit address</button></p>');
            $('#processDeposit').html('<p>Please generate a deposit address first.</p>');
            $('#currentDeposit').html('');
            $('#sendLATX').html('<p>Please generate a deposit address first.</p>');
            callback();
        }
    })
  },

  generateDepositAddress: function() {
    Wrapper.createPersonalDepositAddress({from: account, value: 0, gas: 250000}, function(err, result){
        txSent(result);
    });
  },

  processDeposit: function() {
    Wrapper.processDeposit({from: account, value: 0, gas: 250000}, function(err, result){
        txSent(result);
    });
  },

  sendLATX: function() {
     var amount = web3.toWei($('#depositAmount').val(), "ether");
     LATX.balanceOf(account, function (err, balance) {
         if (amount > balance) amount = balance;
         if (depositAddress && amount > 0) {
             LATX.transfer(depositAddress, amount, {from: account, value: 0, gas: 250000}, function (err, result) {
                 txSent(result);
             });
         }
     })
  },

  withdrawLATXW: function() {
    var amount = web3.toWei($('#withdrawAmount').val(), "ether");
    Wrapper.balanceOf(account, function(err, balance){
        if (amount>balance) amount = balance;
        if (amount>0) {
            Wrapper.transfer(Wrapper.address, amount, {from: account, value: 0, gas: 250000}, function(err, result){
                txSent(result);
            });
        }
    })
  },

  txSent: function(hash) {
    alert('You sent a transaction. Follow it here: <a href="https://etherscan.io/tx/'+hash+'" target="_blank">'+hash+'</a>');
  },

  alert: function(message) {
    alertify.alert('Alert', message, function(){});
  }

};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});