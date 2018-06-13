var LATX = artifacts.require("LatiumX");
var LATXW = artifacts.require("LatiumXTokenWrapped");

module.exports = function(deployer) {
  deployer.deploy(LATX).then(function() {
      return deployer.deploy(LATXW, LATX.address);
  });
};
