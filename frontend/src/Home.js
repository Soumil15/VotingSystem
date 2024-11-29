import React, { useState, useEffect } from 'react';
import './VoterDashboard.css';
import { initWeb3 } from './web3';
import axios from 'axios';
import { Web3 } from 'web3';

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
  const [voteCounts, setVoteCounts] = useState({});

  useEffect(() => {
    const init = async () => {
        try {
            // Initialize Web3 and contract
            const { votingInstance: instance } = await initWeb3();
            setVotingInstance(instance);

            // Fetch candidates from backend
            const candidatesResponse = await axios.get('http://localhost:8081/candidates');
            if (candidatesResponse.status === 200) {
                setCandidates(candidatesResponse.data);
            }

            // Fetch voter info from backend - Changed from POST to GET
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
                    setVoteFlag(response.data.has_voted || false);
                }
            }

            // Initial vote count fetch
            await fetchVoteCounts();

            // Set up polling for vote counts
            const interval = setInterval(fetchVoteCounts, 5000);
            return () => clearInterval(interval);
        } catch (error) {
            console.error("Error initializing Home component:", error);
        }
    };

    init();
  }, []);

  useEffect(() => {
    const validateSession = async () => {
        const voterId = localStorage.getItem("voter_id");
        if (voterId) {
            try {
                const response = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
                if (response.status !== 200) {
                    localStorage.clear();
                    window.location.href = "http://localhost:3000/login";
                }
            } catch (error) {
                localStorage.clear();
                window.location.href = "http://localhost:3000/login";
            }
        } else {
            window.location.href = "http://localhost:3000/login";
        }
    };

    validateSession();
  }, []);

  const fetchVoteCounts = async () => {
    try {
        const { votingInstance } = await initWeb3();
        const candidateCount = await votingInstance.methods.getCandidateCount().call();
        const newVoteCounts = {};
        
        for (let i = 0; i < candidateCount; i++) {
            const candidateDetails = await votingInstance.methods.getCandidateDetails(i).call();
            newVoteCounts[i] = parseInt(candidateDetails.voteCount);
        }
        
        setVoteCounts(newVoteCounts);
    } catch (error) {
        console.error("Error fetching vote counts from blockchain:", error);
    }
};

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
        const voterId = localStorage.getItem("voter_id");
        if (!voterId) {
            alert("No voter ID found. Please log in.");
            return;
        }

        // Initialize Web3 first
        const web3Instance = new Web3('http://127.0.0.1:7545');
        
        // Get voter's account address
        const voterResponse = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
        if (!voterResponse.data.account_address) {
            alert("No MetaMask account found for this voter.");
            return;
        }

        // Clean and format the address
        let voterAccount = voterResponse.data.account_address;
        if (!voterAccount.startsWith('0x')) {
            voterAccount = '0x' + voterAccount;
        }
        voterAccount = web3Instance.utils.toChecksumAddress(voterAccount);
        console.log("Voting with account:", voterAccount);

        // Initialize contract
        const { votingInstance } = await initWeb3();
        
        try {
            await votingInstance.methods.registerVoter(voterAccount)
                .send({ 
                    from: voterAccount,
                    gas: 3000000
                });
            console.log("Voter registered successfully");
        } catch (error) {
            if (!error.message.includes("already registered")) {
                throw error;
            }
            console.log("Voter already registered");
        }

        // Cast vote on blockchain
        const transaction = await votingInstance.methods.castVote(candidateId)
            .send({ 
                from: voterAccount,
                gas: 3000000
            });

        console.log("Vote transaction:", transaction);

        // Record vote in database
        const response = await axios.post('http://localhost:8081/vote', {
            voter_id: voterId,
            candidate_id: candidateId
        });

        if (response.status === 200) {
            alert("Vote cast successfully!");
            setVoteFlag(true);
            await fetchVoteCounts();
        }
    } catch (error) {
        console.error("Error during voting:", error);
        alert("Failed to cast vote. Please try again: " + error.message);
    }
};

const handleLogout = () => {
    try {
        // Clear all localStorage items
        localStorage.clear();
        
        // Redirect to frontend login page
        window.location.href = "http://localhost:3000/login";
    } catch (error) {
        console.error("Error during logout:", error);
        alert("Error during logout. Please try again.");
    }
};

  
  return (
    <div className="dashboard">
      <header className="navbar">
        <h1>GENERAL ELECTION</h1>
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
      </header>

      <div className="candidate-section">
        {candidates.map((candidate) => (
          <div className="candidate-card" key={candidate.id}>
            <div className="candidate-photo">
              <span>{candidate.name}</span>
            </div>
            <div className="vote-count">
              Votes: {voteCounts[candidate.id] || 0}
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
          <strong>Voter Information:</strong>
          <div>Name: {voterInfo.name}</div>
          <div>Voter ID: {voterInfo.voter_id}</div>
          <div>Address: {voterInfo.address}</div>
          <div>Contact: {voterInfo.phone_number}</div>
        </div>
        <div className="status">
          <div>Voting Status:</div>
          <div className="status-indicator">
            <span>{voteFlag ? "Voted" : "Pending"}</span>
            <div className={`status-dot ${voteFlag ? "voted" : "pending"}`}></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
