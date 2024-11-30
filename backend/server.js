const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Web3 } = require('web3');
const fs = require('fs');

// Initialize the Express app
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON request bodies

// Connect to MySQL database
const db = mysql.createConnection({
    host: "localhost", // Database host
    user: "root", // Database username
    password: "shahabzafar100707245", // Database password
    database: "blockchain_voting" // Database name
});

// Check the database connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Initialize Web3 instance
let web3;
const initWeb3 = async () => {
    web3 = new Web3('http://127.0.0.1:7545'); // Connect to the local Ethereum blockchain (Ganache)

    try {
        // Query available or assigned accounts from the database
        const [accounts] = await db.promise().query(
            'SELECT account_address, private_key FROM metamask_accounts WHERE status = "available" OR status = "assigned"'
        );

        if (accounts.length === 0) {
            throw new Error('No accounts found in database');
        }

        // Clear existing accounts from Web3 wallet
        web3.eth.accounts.wallet.clear();

        // Add accounts from the database to Web3 wallet
        accounts.forEach(account => {
            const privateKey = account.private_key.startsWith('0x') ? 
                account.private_key : 
                '0x' + account.private_key; // Ensure private keys have the '0x' prefix
            web3.eth.accounts.wallet.add(privateKey);
        });

        return web3;
    } catch (error) {
        console.error('Error initializing web3:', error);
        throw error;
    }
};

// Initialize Web3 and smart contract instance
(async () => {
    try {
        web3 = await initWeb3();
        const votingContract = new web3.eth.Contract(contractABI, contractAddress); // Connect to the deployed contract

        // Fetch the first account for verification purposes
        const [firstAccount] = await db.promise().query(
            'SELECT account_address FROM metamask_accounts WHERE status = "available" OR status = "assigned" LIMIT 1'
        );

        if (firstAccount.length > 0) {
            console.log("Connected to database, using account:", firstAccount[0].account_address);
        }
    } catch (error) {
        console.error('Initialization failed:', error);
    }
})();

// Smart contract ABI and address (replace with actual values)
const contractABI = [
    // Smart contract constructor to initialize candidates
    {
        "inputs": [{"internalType": "string[]", "name": "candidateNames", "type": "string[]"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    // Function to cast a vote
    {
        "inputs": [{"internalType": "uint256", "name": "candidateIndex", "type": "uint256"}],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Function to get the total number of candidates
    {
        "inputs": [],
        "name": "getCandidateCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    // Function to retrieve candidate details by index
    {
        "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
        "name": "getCandidateDetails",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint256", "name": "voteCount", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Endpoint to fetch voter information
app.get('/voter-info', async (req, res) => {
    try {
        const { voter_id } = req.query; // Extract voter_id from query parameters
        const query = 'SELECT * FROM users WHERE voter_id = ?';
        const [results] = await db.promise().query(query, [voter_id]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        console.log("Voter info found:", results[0]);
        res.json(results[0]); // Return voter details
    } catch (err) {
        console.error('Error fetching voter info:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Endpoint to handle voting
app.post('/vote', async (req, res) => {
    const { voter_id, candidate_id } = req.body;

    // Check if the voter has already voted
    const checkVoteQuery = `SELECT has_voted FROM users WHERE voter_id = ?`;
    db.query(checkVoteQuery, [voter_id], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (results[0]?.has_voted) {
            return res.status(400).json({ error: 'You have already voted' });
        }

        // Record the vote in the database
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

// Endpoint to fetch a list of candidates
app.get('/candidates', (req, res) => {
    try {
        // Hardcoded candidate list for demonstration
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

// Endpoint to handle user logout
app.post('/logout', (req, res) => {
    try {
        const { voter_id } = req.body; // Extract voter_id from request body

        // Update the last_logout timestamp in the database
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

// Start the Express server
const PORT = 8081; // Server port
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
