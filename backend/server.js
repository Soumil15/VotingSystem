const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Web3 } = require('web3');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MySQL database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "shahabzafar100707245", // Your MySQL password
    database: "blockchain_voting"
});

// Check database connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Initialize Web3
const web3 = new Web3('http://127.0.0.1:7545');

// Contract ABI and address
const contractABI = [
    {
        "inputs": [{"internalType": "string[]", "name": "candidateNames", "type": "string[]"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "address", "name": "voter", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "candidateIndex", "type": "uint256"}
        ],
        "name": "VoteCast",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "address", "name": "voter", "type": "address"}
        ],
        "name": "VoterRegistered",
        "type": "event"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "candidateIndex", "type": "uint256"}],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
        "name": "getCandidateDetails",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint256", "name": "voteCount", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCandidateCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "voter", "type": "address"}],
        "name": "registerVoter",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const contractAddress = '0x2b3A9398e9a1d5a3Ea10484087AF9b966DcECB45';
const votingContract = new web3.eth.Contract(contractABI, contractAddress);

// After contract initialization
console.log('Contract address:', contractAddress);

// Verify contract connection and get candidate data
(async () => {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log("Connected to Ganache, first account:", accounts[0]);
        
        // Verify contract code exists at address
        const code = await web3.eth.getCode(contractAddress);
        if (code === '0x') {
            throw new Error('No contract deployed at this address');
        }
        
        // Test contract methods
        const count = await votingContract.methods.getCandidateCount().call();
        console.log('Number of candidates:', count);
        
        // Get all candidates
        const candidatesData = [];
        for (let i = 0; i < count; i++) {
            const candidate = await votingContract.methods.getCandidateDetails(i).call();
            candidatesData.push({
                name: candidate.name,
                voteCount: candidate.voteCount
            });
            console.log(`Candidate ${i}:`, candidatesData[i]);
        }
        
        console.log('All candidates:', candidatesData);
    } catch (error) {
        console.error('Contract verification failed:', error);
        console.error('Error details:', error.message);
    }
})();

// Login Endpoint
app.post('/login', (req, res) => {
    const { voter_id, password } = req.body;

    if (!voter_id || !password) {
        return res.status(400).json({ error: 'Voter ID and password are required' });
    }

    const query = `SELECT voter_id, name, email, address, phone_number FROM users WHERE voter_id = ? AND password = ?`;
    db.query(query, [voter_id, password], (err, results) => {
        if (err) {
            console.error('Error during login query:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid Voter ID or Password' });
        }
        res.status(200).json({ user: results[0] });
    });
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
    try {
        const { voter_id, name, email, address, phone_number, password } = req.body;

        // Check if user already exists
        const checkUserQuery = 'SELECT * FROM users WHERE voter_id = ? OR email = ?';
        const [existingUsers] = await db.promise().query(checkUserQuery, [voter_id, email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Voter ID or email already exists' });
        }

        // Get available MetaMask account
        const getAccountQuery = 'SELECT account_address FROM metamask_accounts WHERE voter_id IS NULL AND status = "available" LIMIT 1';
        const [availableAccounts] = await db.promise().query(getAccountQuery);

        if (availableAccounts.length === 0) {
            return res.status(400).json({ error: 'No available MetaMask accounts' });
        }

        // Insert new user
        const insertUserQuery = `
            INSERT INTO users (voter_id, name, email, address, phone_number, password, has_voted)
            VALUES (?, ?, ?, ?, ?, ?, false)
        `;
        await db.promise().query(insertUserQuery, [voter_id, name, email, address, phone_number, password]);

        // Assign MetaMask account to user
        const accountAddress = availableAccounts[0].account_address;
        const updateAccountQuery = 'UPDATE metamask_accounts SET voter_id = ?, status = "assigned" WHERE account_address = ?';
        await db.promise().query(updateAccountQuery, [voter_id, accountAddress]);

        res.status(200).json({
            message: 'User registered successfully',
            account: accountAddress
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error during signup' });
    }
});

// Voter Info Endpoint
app.post('/voter-info', (req, res) => {
    const { voter_id } = req.body;
    
    if (!voter_id) {
        return res.status(400).json({ error: 'Voter ID is required' });
    }

    const query = 'SELECT name, voter_id, address, phone_number, has_voted FROM users WHERE voter_id = ?';
    db.query(query, [voter_id], (err, results) => {
        if (err) {
            console.error('Error fetching voter info:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        res.json(results[0]);
    });
});

// Voting Endpoint
app.post('/vote', async (req, res) => {
    const { voter_id, candidate_id } = req.body;

    // First, check if voter has already voted
    const checkVoteQuery = `SELECT has_voted FROM users WHERE voter_id = ?`;
    
    db.query(checkVoteQuery, [voter_id], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results[0]?.has_voted) {
            return res.status(400).json({ error: 'You have already voted' });
        }

        // Record the vote in votes table
        const recordVoteQuery = `INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)`;
        db.query(recordVoteQuery, [voter_id, candidate_id], async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to record vote' });
            }

            // Update user's voting status
            const updateUserQuery = `UPDATE users SET has_voted = true WHERE voter_id = ?`;
            db.query(updateUserQuery, [voter_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update user status' });
                }

                res.status(200).json({ message: 'Vote recorded successfully' });
            });
        });
    });
});

// Get Candidates Endpoint
app.get('/candidates', (req, res) => {
    try {
        // Hardcoded candidates for testing
        const candidates = [
            { id: 0, name: "Meet" },
            { id: 1, name: "Shahab" },
            { id: 2, name: "Soumil" },
            { id: 3, name: "Kris" }
        ];
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Vote Counts Endpoint
// app.get('/vote-counts', (req, res) => {
//     const query = `
//         SELECT candidate_id, COUNT(*) as vote_count 
//         FROM votes 
//         GROUP BY candidate_id
//     `;
    
//     db.query(query, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: 'Failed to fetch vote counts' });
//         }

//         const voteCounts = {};
//         results.forEach(row => {
//             voteCounts[row.candidate_id] = row.vote_count;
//         });

//         res.json(voteCounts);
//     });
// });

// Logout Endpoint
app.post('/logout', (req, res) => {
    try {
        const { voter_id } = req.body;
        
        // Update last_logout timestamp in database
        const query = `UPDATE users SET last_logout = NOW() WHERE voter_id = ?`;
        db.query(query, [voter_id], (err, result) => {
            if (err) {
                console.error('Error updating logout time:', err);
                return res.status(500).json({ error: 'Database error during logout' });
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Server error during logout' });
    }
});

// Start the server
const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});