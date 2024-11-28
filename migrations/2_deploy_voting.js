const Voting = artifacts.require("Voting");

module.exports = function (deployer) {
  const candidateNames = ["Meet", "Shahab", "Soumil", "Kris"];  // Replace with any names you'd like
  deployer.deploy(Voting, candidateNames);
};
