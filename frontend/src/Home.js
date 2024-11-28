import React, { useState, useEffect } from 'react';
import './VoterDashboard.css';
import { initWeb3 } from './web3';
import axios from 'axios';

const Home = () => {
  const [candidates, setCandidates] = useState([]);
  const [voteFlag, setVoteFlag] = useState(false);
  const [voterInfo, setVoterInfo] = useState({
    name: "Loading...",
    voter_id: "Loading...",
    address: "Loading...",
    phone_number: "Loading...",
  });
  const [votingInstance, setVotingInstance] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Web3 and load contract
        const { votingInstance } = await initWeb3();
        setVotingInstance(votingInstance);

        // Fetch candidates from the contract
        const candidateCount = await votingInstance.methods.getCandidateCount().call();
        const fetchedCandidates = [];
        for (let i = 0; i < candidateCount; i++) {
          const candidate = await votingInstance.methods.candidates(i).call();
          fetchedCandidates.push({ id: i, name: candidate.name });
        }
        setCandidates(fetchedCandidates);

        // Fetch voter info from backend
        const voterId = localStorage.getItem("voter_id");
        if (voterId) {
          console.log("Fetching voter info for ID:", voterId);
          const response = await axios.post('http://localhost:8081/voter-info', { voter_id: voterId });

          if (response.status === 200) {
            console.log("Voter info fetched:", response.data);
            setVoterInfo(response.data);
          } else {
            console.error("Failed to fetch voter info, status:", response.status);
          }
        } else {
          console.error("No voter ID found in local storage.");
        }
      } catch (error) {
        console.error("Error initializing Home component:", error);
      }
    };

    init();
  }, []);

  const registerVoter = async () => {
    try {
        const voterId = localStorage.getItem("voter_id");
        if (!voterId) {
            alert("No voter ID found. Please log in.");
            return;
        }

        const voterResponse = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
        if (voterResponse.status !== 200 || !voterResponse.data.account_address) {
            alert("Failed to fetch MetaMask account address. Please contact support.");
            return;
        }

        const voterAccount = voterResponse.data.account_address; // MetaMask account address
        const { votingInstance } = await initWeb3();

        console.log(`Registering voter with account ${voterAccount}`);
        const transaction = await votingInstance.methods.registerVoter(voterAccount).send({ from: voterAccount });

        console.log("Registration transaction receipt:", transaction);
        alert("Voter registered successfully!");
    } catch (error) {
        console.error("Error during registration:", error);
        if (error.message.includes("already registered")) {
            alert("You are already registered to vote.");
        } else {
            alert("Failed to register voter. Please try again.");
        }
    }
};

const handleVote = async (candidateId) => {
    try {
        // Step 1: Retrieve voter_id from localStorage
        const voterId = localStorage.getItem("voter_id");
        if (!voterId) {
            alert("No voter ID found. Please log in.");
            return;
        }

        // Step 2: Fetch MetaMask account address from the backend
        const voterResponse = await axios.post("http://localhost:8081/voter-info", {
            voter_id: voterId, // Send voter_id in the request body
        });

        if (voterResponse.status !== 200 || !voterResponse.data.account_address) {
            alert("Failed to fetch MetaMask account address. Please contact support.");
            return;
        }

        const voterAccount = voterResponse.data.account_address; // MetaMask account address
        console.log(`Fetched MetaMask account for voter ID ${voterId}:`, voterAccount);

        // Step 3: Initialize Web3 and the contract
        const { votingInstance } = await initWeb3();

        // Step 4: Check if the user is registered
        const isRegistered = await votingInstance.methods.registeredVoters(voterAccount).call();
        if (!isRegistered) {
            alert("You must be registered to vote. Please register first.");
            return;
        }

        // Step 5: Call the smart contract vote method
        console.log("Casting vote with parameters:", {
            candidateId,
            voterAccount,
        });

        const transaction = votingInstance.methods.castVote(candidateId);
        console.log("Transaction object created:", transaction);

        const receipt = await transaction.send({ from: voterAccount });
        console.log("Transaction receipt:", receipt);

        alert("Vote successfully cast!");
    } catch (error) {
        console.error("Error during voting:", error);
        if (error.message.includes("revert You must be registered to vote")) {
            alert("You must register to vote before casting a ballot.");
        } else if (error.message.includes("revert Invalid candidate index")) {
            alert("Invalid candidate selection. Please choose a valid candidate.");
        } else {
            alert("Failed to cast vote. Please try again.");
        }
    }
};

  
  return (
    <div className="dashboard">
      <header className="navbar">
        <h1>GENERAL ELECTION</h1>
      </header>

      <div className="candidate-section">
        {candidates.map((candidate) => (
          <div className="candidate-card" key={candidate.id}>
            <div className="candidate-photo">
              <span>{candidate.name}</span>
            </div>
            <button
              onClick={() => handleVote(candidate.id)}
              className="vote-button"
              disabled={voteFlag}
            >
              VOTE
            </button>
          </div>
        ))}
      </div>

      <footer className="voter-info">
        <div className="info-text">
          <strong>Voter Information :</strong>
          <div>Name: {voterInfo.name}</div>
          <div>Voter ID: {voterInfo.voter_id}</div>
          <div>Address: {voterInfo.address}</div>
          <div>Contact: {voterInfo.phone_number}</div>
        </div>
        <div className="status">
          <div>Voting Status:</div>
          <div className={`status-dot ${voteFlag ? "voted" : "pending"}`}></div>
          {voteFlag ? "Voted" : "Pending"}
        </div>
      </footer>
    </div>
  );
};

export default Home;
