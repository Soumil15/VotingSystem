import React, { useState } from 'react';
import './VoterDashboard.css';

const Home = () => {

  const [voteFlag, setVoteFlag] = useState(false);
  const candidates = [
    { id: 1, name: "Candidate 1" },
    { id: 2, name: "Candidate 2" },
    { id: 3, name: "Candidate 3" },
    { id: 4, name: "Candidate 4" },
  ];

  //Please use the function below to handle the backend logic
  const handleVote = (candidateId) => {

    alert(`Voted for: ${candidates[candidateId].name}`);
    setVoteFlag = true;

    console.log(`Voted for Candidate ${candidateId}`);
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
            <button onClick={() => handleVote(candidate.id)} className="vote-button" disabled={voteFlag}>
              VOTE
            </button>
          </div>
        ))}
      </div>

      <footer className="voter-info">
        <div className="info-text">
          <strong>Voter Information :</strong>
          <div>Name :</div>
          <div>Voter ID :</div>
          <div>Address :</div>
          <div>Contact :</div>
        </div>
        <div className="status">
          <div>Voting Status :</div>
          <div className="status-dot voted"></div> Voted
          <div className="status-dot pending"></div> Pending
        </div>
      </footer>
    </div>
  );
};

export default Home;
