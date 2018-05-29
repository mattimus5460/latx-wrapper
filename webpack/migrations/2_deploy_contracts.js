var LATXW = artifacts.require("./LatiumXWrapper.sol");
var LATX = artifacts.require("./LatiumX.sol");

module.exports = function(deployer) {
  deployer.deploy(LATX);
  deployer.deploy(LATXW);
};
