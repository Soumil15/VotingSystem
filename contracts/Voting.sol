// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Candidate {
        string name;
        uint voteCount;
    }

    Candidate[] public candidates;

    // Mapping to track registered voters
    mapping(address => bool) public registeredVoters;

    // Event for logging voter registration
    event VoterRegistered(address voter);

    // Event for logging vote casting
    event VoteCast(address voter, uint candidateIndex);

    constructor(string[] memory candidateNames) {
        for (uint i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    // Function to register a voter by their address
    function registerVoter(address voter) public {
        require(!registeredVoters[voter], "Voter is already registered.");
        registeredVoters[voter] = true;
        emit VoterRegistered(voter);
    }

    // Function to cast a vote for a candidate
    function castVote(uint candidateIndex) public {
        require(registeredVoters[msg.sender], "You must be registered to vote.");
        require(candidateIndex < candidates.length, "Invalid candidate index.");
        candidates[candidateIndex].voteCount += 1;
        registeredVoters[msg.sender] = false; // Prevent double voting
        emit VoteCast(msg.sender, candidateIndex);
    }

    // Unified function for registration and voting (optional usage)
    function registerOrVote(uint candidateIndex) public {
        if (!registeredVoters[msg.sender]) {
            registeredVoters[msg.sender] = true;
            emit VoterRegistered(msg.sender);
        }

        require(candidateIndex < candidates.length, "Invalid candidate index.");
        candidates[candidateIndex].voteCount += 1;
        registeredVoters[msg.sender] = false; // Prevent double voting
        emit VoteCast(msg.sender, candidateIndex);
    }

    // Function to get the number of candidates
    function getCandidateCount() public view returns (uint) {
        return candidates.length;
    }

    // Function to get the details of a candidate
    function getCandidateDetails(uint index) public view returns (string memory name, uint voteCount) {
        require(index < candidates.length, "Invalid candidate index.");
        Candidate memory candidate = candidates[index];
        return (candidate.name, candidate.voteCount);
    }
}

