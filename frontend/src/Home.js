import React, { useState, useEffect } from 'react';
import './VoterDashboard.css';
import { initWeb3 } from './web3';
import axios from 'axios';
import { Web3 } from 'web3';

const Home = () => {
  // State variables to manage application data
  const [candidates, setCandidates] = useState([]); // List of candidates for voting
  const [voteFlag, setVoteFlag] = useState(false); // Whether the user has already voted
  const [voterInfo, setVoterInfo] = useState({
    name: "Loading...",
    voter_id: "Loading...",
    address: "Loading...",
    phone_number: "Loading...",
  }); // Information about the logged-in voter
  const [votingInstance, setVotingInstance] = useState(null); // Voting contract instance
  const [voteCounts, setVoteCounts] = useState({}); // Vote counts for each candidate

  // Effect to initialize the component
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Web3 and the voting contract
        const { votingInstance: instance } = await initWeb3();
        setVotingInstance(instance);

        // Fetch the list of candidates from the backend
        const candidatesResponse = await axios.get('http://localhost:8081/candidates');
        if (candidatesResponse.status === 200) {
          setCandidates(candidatesResponse.data);
        }

        // Fetch voter information from the backend
        const voterId = localStorage.getItem("voter_id");
        if (voterId) {
          const response = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
          if (response.status === 200) {
            setVoterInfo({
              name: response.data.name || "Loading...",
              voter_id: response.data.voter_id || "Loading...",
              address: response.data.address || "Loading...",
              phone_number: response.data.phone_number || "Loading...",
            });
            setVoteFlag(response.data.has_voted || false); // Update vote status
          }
        }

        // Fetch initial vote counts from the blockchain
        await fetchVoteCounts();

        // Set up polling to refresh vote counts periodically
        const interval = setInterval(fetchVoteCounts, 5000);
        return () => clearInterval(interval); // Cleanup interval on component unmount
      } catch (error) {
        console.error("Error initializing Home component:", error);
      }
    };

    init(); // Call the initialization function
  }, []);

  // Effect to validate the user session on component load
  useEffect(() => {
    const validateSession = async () => {
      const voterId = localStorage.getItem("voter_id");
      if (voterId) {
        try {
          const response = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
          if (response.status !== 200) {
            localStorage.clear();
            window.location.href = "http://localhost:3000/login"; // Redirect to login if session is invalid
          }
        } catch (error) {
          localStorage.clear();
          window.location.href = "http://localhost:3000/login"; // Handle errors by redirecting to login
        }
      } else {
        window.location.href = "http://localhost:3000/login"; // Redirect to login if voter ID is missing
      }
    };

    validateSession(); // Validate the session
  }, []);

  // Fetch the vote counts from the blockchain
  const fetchVoteCounts = async () => {
    try {
      const { votingInstance } = await initWeb3();
      const candidateCount = await votingInstance.methods.getCandidateCount().call(); // Get the total number of candidates
      const newVoteCounts = {};

      for (let i = 0; i < candidateCount; i++) {
        const candidateDetails = await votingInstance.methods.getCandidateDetails(i).call();
        newVoteCounts[i] = parseInt(candidateDetails.voteCount); // Store vote count for each candidate
      }

      setVoteCounts(newVoteCounts); // Update state with new vote counts
    } catch (error) {
      console.error("Error fetching vote counts from blockchain:", error);
    }
  };

  // Handle voter registration on the blockchain
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

  // Handle voting action
  const handleVote = async (candidateId) => {
    try {
      const voterId = localStorage.getItem("voter_id");
      if (!voterId) {
        alert("No voter ID found. Please log in.");
        return;
      }

      // Initialize Web3 and get voter's account address
      const web3Instance = new Web3('http://127.0.0.1:7545');
      const voterResponse = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
      if (!voterResponse.data.account_address) {
        alert("No MetaMask account found for this voter.");
        return;
      }

      let voterAccount = voterResponse.data.account_address;
      if (!voterAccount.startsWith('0x')) {
        voterAccount = '0x' + voterAccount;
      }
      voterAccount = web3Instance.utils.toChecksumAddress(voterAccount);
      console.log("Voting with account:", voterAccount);

      const { votingInstance } = await initWeb3();

      // Register the voter if not already registered
      try {
        await votingInstance.methods.registerVoter(voterAccount).send({ from: voterAccount, gas: 3000000 });
        console.log("Voter registered successfully");
      } catch (error) {
        if (!error.message.includes("already registered")) {
          throw error;
        }
        console.log("Voter already registered");
      }

      // Cast the vote on the blockchain
      const transaction = await votingInstance.methods.castVote(candidateId).send({ from: voterAccount, gas: 3000000 });

      console.log("Vote transaction:", transaction);

      // Record the vote in the backend database
      const response = await axios.post('http://localhost:8081/vote', {
        voter_id: voterId,
        candidate_id: candidateId,
      });

      if (response.status === 200) {
        alert("Vote cast successfully!");
        setVoteFlag(true); // Update voting status
        await fetchVoteCounts(); // Refresh vote counts
      }
    } catch (error) {
      console.error("Error during voting:", error);
      alert("Failed to cast vote. Please try again: " + error.message);
    }
  };

  // Handle user logout
  const handleLogout = () => {
    try {
      localStorage.clear(); // Clear local storage
      window.location.href = "http://localhost:3000/login"; // Redirect to login page
    } catch (error) {
      console.error("Error during logout:", error);
      alert("Error during logout. Please try again.");
    }
  };

  return (
    <div className="dashboard">
      {/* Header section */}
      <header className="navbar">
        <h1>GENERAL ELECTION</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Candidate section */}
      <div className="candidate-section">
        {candidates.map((candidate) => (
          <div className="candidate-card" key={candidate.id}>
            <div className="candidate-photo">
              <span>{candidate.name}</span>
            </div>
            <div className="vote-count">
              Votes: {voteCounts[candidate.id] || 0} {/* Display candidate vote count */}
            </div>
            <button
              onClick={() => handleVote(candidate.id)}
              className="vote-button"
              disabled={voteFlag} // Disable voting button if already voted
            >
              VOTE
            </button>
          </div>
        ))}
      </div>

      {/* Footer with voter information */}
      <footer className="voter-info">
        <div className="info-text">
          <strong>Voter Information:</strong>
          <div>Name: {voterInfo.name}</div>
          <div>Voter ID: {voterInfo.voter_id}</div>
          <div>Address: {voterInfo.address}</div>
          <div>Contact: {voterInfo.phone_number}</div>
        </div>
        <button className="register-button" onClick={registerVoter}>
          Register to Vote
        </button>
      </footer>
    </div>
  );
};

export default Home;
