// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract'

var $ = require("jquery");
var jQuery = require("jquery");

var BigNumber = require('big-number');

import latxw_artifacts from '../../build/contracts/LatiumXTokenWrapped.json'
import latx_artifacts from '../../build/contracts/LatiumX.json'

var LATXWContract = contract(latxw_artifacts);
var LATXContract = contract(latx_artifacts);

var accounts, account, LATXWAddr, LATXW, LATXAddr, LATX, depositAddress;

window.App = {
    start: function () {
        var self = this;

        LATXWAddr = '0x13274fe19c0178208bcbee397af8167a7be27f6f';
        LATXW = web3.eth.contract(LATXWContract.abi).at(LATXWAddr);

        LATXAddr = '0xeec918d74c746167564401103096d45bbd494b74';
        LATX = web3.eth.contract(LATXContract.abi).at(LATXAddr);

        // Get the initial account balance so it can be displayed.
        web3.eth.getAccounts(function (err, accs) {
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
            $('#addresses').html(accounts.map(function (account) {
                return '<li><a href="javascript:;" onclick="selectAccount(\'' + account + '\')">' + account + '</a></li>'
            }).join(''));

            function updateLoop() {
                App.update(function () {
                    setTimeout(function () {
                        updateLoop()
                    }, 10000);
                });
            }

            updateLoop();
        });
    },

    setStatus: function (message) {
        var status = document.getElementById("status");
        status.innerHTML = message;
    },

    selectAccount: function (newAccount) {
        account = newAccount;
        $('#address').html(account);
        update(function () {
        });
    },

    update: function (callback) {

        LATX.balanceOf(account, function (err, balance) {
            var balanceLATX = new BigNumber(balance).div(Math.pow(10, 8));
            $('#balanceLATX').html('<p>Balance (LATX): ' + balanceLATX + '</p>');
        });
        LATXW.balanceOf(account, function (err, balance) {
            var balanceLATXW = new BigNumber(balance).div(Math.pow(10, 8));
            $('#balanceLATXW').html('<p>Balance (LATXW): ' + balanceLATXW + '</p>');
            if (balance > 0) {
                var html = '<p><input class="form-control" style="width: 150px; display: inline;" type="text" id="withdrawAmount"> <button class="btn btn-default" onclick="App.withdrawLATXW();">Withdraw LATXW</button></p>';
                if ($('#withdraw').html() != html) $('#withdraw').html(html);
            } else {
                $('#withdraw').html('<p>You don\'t have any LATXW to withdraw.</p>');
            }
        });
        LATXW.getPersonalDepositAddress(account, function (err, result) {
            depositAddress = result;
            if (depositAddress != '0x0000000000000000000000000000000000000000') {
                $('#depositAddress').html('<p>Deposit address: <a href="https://etherscan.io/address/' + depositAddress + '" target="_blank">' + depositAddress + '</a></p>');
                var html = '<p><input class="form-control" style="width: 150px; display: inline;" type="text" id="depositAmount"> <button class="btn btn-default" onclick="App.sendLATX();">Send LATX</button></p>';
                if ($('#sendLATX').html() != html) $('#sendLATX').html(html);
                LATX.balanceOf(depositAddress, function (err, result) {
                    var currentDeposit = new BigNumber(result).div(Math.pow(10, 8));
                    $('#currentDeposit').html('<p>Current deposit (LATX): ' + currentDeposit + '</p>');
                    if (currentDeposit > 0) {
                        $('#processDeposit').html('<p><button class="btn btn-default" onclick="App.processDeposit();">Process deposit</button></p>');
                    } else {
                        $('#processDeposit').html('<p>Please deposit first.</p>');
                    }
                    callback();
                });
            } else {
                $('#depositAddress').html('<p><button class="btn btn-default" onclick="App.generateDepositAddress();">Generate deposit address</button></p>');
                $('#processDeposit').html('<p>Please generate a deposit address first.</p>');
                $('#currentDeposit').html('');
                $('#sendLATX').html('<p>Please generate a deposit address first.</p>');
                callback();
            }
        })
    },

    generateDepositAddress: function () {
        LATXW.createPersonalDepositAddress({from: account, value: 0, gas: 500000}, function (err, result) {
            App.txSent(result);
        });
    },

    processDeposit: function () {
        LATXW.processDeposit({from: account, value: 0, gas: 300000}, function (err, result) {
            App.txSent(result);
        });
    },

    sendLATX: function () {
        var amountVal = $('#depositAmount').val();
        var amount =  new BigNumber(amountVal).mult(Math.pow(10, 8));
        LATX.balanceOf(account, function (err, balance) {
            if (amount > balance) amount = balance;
            if (depositAddress && amount > 0) {
                LATX.transfer(depositAddress, amount.toString(), {from: account, value: 0, gas: 300000}, function (err, result) {
                    App.txSent(result);
                });
            }
        })
    },

    withdrawLATXW: function () {
        var amount = new BigNumber($('#withdrawAmount').val()).mult(Math.pow(10, 8));
        LATXW.balanceOf(account, function (err, balance) {
            if (amount > balance) amount = balance;
            if (amount > 0) {
                LATXW.transfer(LATXW.address, amount.toString(), {from: account, value: 0, gas: 300000}, function (err, result) {
                    App.txSent(result);
                });
            }
        })
    },

    txSent: function (hash) {
        alert('You sent a transaction. Follow it here: <a href="https://etherscan.io/tx/' + hash + '" target="_blank">' + hash + '</a>');
    },

    alert: function (message) {
        alertify.alert('Alert', message, function () {
        });
    }

};

window.addEventListener('load', function () {
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