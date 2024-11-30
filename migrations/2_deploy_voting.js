const Voting = artifacts.require("Voting");

module.exports = function (deployer) {
  const candidateNames = ["Meet", "Shahab", "Soumil", "Kris"];  // Election Candidate names
  deployer.deploy(Voting, candidateNames);
};
