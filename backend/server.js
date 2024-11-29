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
let web3;
const initWeb3 = async () => {
    web3 = new Web3('http://127.0.0.1:7545');
    
    try {
        // Get accounts from database
        const [accounts] = await db.promise().query(
            'SELECT account_address, private_key FROM metamask_accounts WHERE status = "available" OR status = "assigned"'
        );
        
        if (accounts.length === 0) {
            throw new Error('No accounts found in database');
        }
        
        // Clear existing accounts
        web3.eth.accounts.wallet.clear();
        
        // Add accounts to web3 wallet
        accounts.forEach(account => {
            const privateKey = account.private_key.startsWith('0x') ? 
                account.private_key : 
                '0x' + account.private_key;
            web3.eth.accounts.wallet.add(privateKey);
        });
        
        return web3;
    } catch (error) {
        console.error('Error initializing web3:', error);
        throw error;
    }
};

// Initialize web3 and contract
(async () => {
    try {
        web3 = await initWeb3();
        const votingContract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Get first account from database for verification
        const [firstAccount] = await db.promise().query(
            'SELECT account_address FROM metamask_accounts WHERE status = "available" OR status = "assigned" LIMIT 1'
        );
        
        if (firstAccount.length > 0) {
            console.log("Connected to database, using account:", firstAccount[0].account_address);
        }
        
        // Rest of your contract verification code...
    } catch (error) {
        console.error('Initialization failed:', error);
    }
})();

// Contract ABI and address
const contractABI = [
    {
        "inputs": [{"internalType": "string[]", "name": "candidateNames", "type": "string[]"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "candidateIndex", "type": "uint256"}],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [{"internalType": "address", "name": "voter", "type": "address"}],
        "name": "registerVoter",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const contractAddress = '0xaF9D0E71CAa43C2E0cDDeab7b563e694D40F1030';

// After contract initialization
console.log('Contract address:', contractAddress);

// After web3 initialization
const getAvailableAccounts = async () => {
    try {
        const [accounts] = await db.promise().query(
            'SELECT account_address FROM metamask_accounts WHERE status = "available"'
        );
        return accounts.map(acc => acc.account_address);
    } catch (error) {
        console.error('Error fetching accounts from database:', error);
        return [];
    }
};

// Modify the verification code
(async () => {
    try {
        const dbAccounts = await getAvailableAccounts();
        if (dbAccounts.length === 0) {
            throw new Error('No available accounts in database');
        }
        console.log("Connected to database, first available account:", dbAccounts[0]);
        
        // Rest of your verification code...
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
            return res.status(400).json({ 
                error: 'Voter ID or email already exists',
                details: 'Please use different credentials'
            });
        }

        // Start transaction
        await db.promise().beginTransaction();

        try {
            // Get available MetaMask account
            const getAccountQuery = 'SELECT account_address FROM metamask_accounts WHERE status = "available" AND voter_id IS NULL LIMIT 1';
            const [availableAccounts] = await db.promise().query(getAccountQuery);

            if (availableAccounts.length === 0) {
                await db.promise().rollback();
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

            // Commit transaction
            await db.promise().commit();

            res.status(200).json({
                message: 'User registered successfully',
                account: accountAddress
            });
        } catch (error) {
            await db.promise().rollback();
            throw error;
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            error: 'Internal server error during signup',
            details: error.message 
        });
    }
});

// Voter Info Endpoint
app.get('/voter-info', async (req, res) => {
    const voterId = req.query.voter_id;
    
    if (!voterId) {
        return res.status(400).json({ error: 'Voter ID is required' });
    }

    try {
        const [results] = await db.promise().query(`
            SELECT u.name, u.voter_id, u.address, u.phone_number, u.has_voted, 
                   CASE 
                       WHEN m.account_address NOT LIKE '0x%' 
                       THEN CONCAT('0x', m.account_address)
                       ELSE m.account_address
                   END as account_address
            FROM users u
            LEFT JOIN metamask_accounts m ON u.voter_id = m.voter_id
            WHERE u.voter_id = ?
        `, [voterId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        console.log("Voter info found:", results[0]);
        res.json(results[0]);
    } catch (err) {
        console.error('Error fetching voter info:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
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