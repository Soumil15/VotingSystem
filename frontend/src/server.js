const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Web3 } = require('web3');
const VotingContract = require('./contracts/Voting.json');

// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MySQL database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Your MySQL username
  password: 'meet@123', // Your MySQL password
  database: 'blockchain_voting', // Your database name
});

// Check database connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// Initialize Web3 and Voting Contract
const web3 = new Web3('http://127.0.0.1:7545');
(async () => {
  try {
    console.log("Connected to Ganache via HTTP Provider");
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = VotingContract.networks[networkId];

    if (!deployedNetwork) {
      throw new Error("Voting contract not deployed on this network.");
    }

    const votingContract = new web3.eth.Contract(
      VotingContract.abi,
      deployedNetwork.address
    );
    console.log("Voting contract loaded:", deployedNetwork.address);
  } catch (error) {
    console.error("Failed to initialize Web3 or contract:", error);
  }
})();

// Login Endpoint
app.post('/login', (req, res) => {
  const { voter_id, password } = req.body;

  // Validate input
  if (!voter_id || !password) {
    return res.status(400).json({ error: 'Voter ID and password are required' });
  }

  // Query to fetch user details
  const query = `SELECT voter_id, name, email, address, phone_number FROM users WHERE voter_id = ? AND password = ?`;
  db.query(query, [voter_id, password], (err, results) => {
    if (err) {
      console.error('Error during login query:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid Voter ID or Password' });
    }

    // Send user data as response
    res.status(200).json({ user: results[0] });
  });
});



// Signup Endpoint
app.post('/signup', (req, res) => {
  const { voter_id, name, email, address, phone_number, password } = req.body;

  // Validate input
  if (!voter_id || !name || !email || !address || !phone_number || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if voter_id or email already exists
  const queryCheck = `SELECT * FROM users WHERE voter_id = ? OR email = ?`;
  db.query(queryCheck, [voter_id, email], (err, results) => {
    if (err) {
      console.error('Error during database check:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (results.length > 0) {
      return res.status(400).json({ message: 'Voter ID or Email already exists' });
    }

    // Insert new user into the database
    const queryInsert = `INSERT INTO users (voter_id, name, email, address, phone_number, password) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(queryInsert, [voter_id, name, email, address, phone_number, password], (err) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Failed to insert user' });
      }

      // Assign MetaMask account to the voter
      const queryAssign = `
        UPDATE metamask_accounts 
        SET voter_id = ?, status = 'assigned' 
        WHERE status = 'available' 
        LIMIT 1
      `;
      db.query(queryAssign, [voter_id], (err, result) => {
        if (err) {
          console.error('Error assigning MetaMask account:', err);
          return res.status(500).json({ error: 'Failed to assign MetaMask account' });
        }

        if (result.affectedRows === 0) {
          // No available MetaMask accounts
          console.warn('No available MetaMask accounts for assignment.');
          return res.status(400).json({ error: 'No available MetaMask accounts. Please try again later.' });
        }

        // Fetch the assigned MetaMask account for confirmation
        const queryFetchAccount = `SELECT account_address FROM metamask_accounts WHERE voter_id = ?`;
        db.query(queryFetchAccount, [voter_id], (err, results) => {
          if (err) {
            console.error('Error fetching assigned MetaMask account:', err);
            return res.status(500).json({ error: 'Failed to fetch assigned MetaMask account' });
          }

          const accountAddress = results[0]?.account_address;
          console.log(`User registered successfully and assigned MetaMask account: ${accountAddress}`);

          // Success response with account details
          res.status(200).json({
            message: 'User registered and MetaMask account assigned successfully!',
            account: accountAddress,
          });
        });
      });
    });
  });
});

// Voter Information Endpoint
app.post('/voter-info', (req, res) => {
  console.log("Received voter-info request with body:", req.body); // Log the incoming request body
  const { voter_id } = req.body;

  if (!voter_id) {
    console.error("No voter_id provided in request body");
    return res.status(400).json({ error: 'Voter ID is required' });
  }

  const query = `SELECT u.voter_id, u.name, u.email, u.address, u.phone_number, 
                 COALESCE(ma.account_address, 'No MetaMask Account') AS account_address
                 FROM users u
                 LEFT JOIN metamask_accounts ma ON u.voter_id = ma.voter_id
                 WHERE u.voter_id = ?`;

  console.log("Executing query:", query); // Log the query for debugging
  db.query(query, [voter_id], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      console.error("No results found for voter_id:", voter_id);
      return res.status(404).json({ error: 'Voter not found' });
    }

    console.log("Query successful. Results:", results);
    res.status(200).json(results[0]);
  });
});




// Voting Endpoint
app.post('/vote', async (req, res) => {
  const { voter_id, candidate_id } = req.body;

  // Validate inputs
  if (!voter_id || candidate_id === undefined) {
    return res.status(400).json({ error: 'Voter ID and candidate ID are required' });
  }

  // Query for the voter's private key from the database
  const query = `SELECT private_key FROM metamask_accounts WHERE voter_id = ?`;
  db.query(query, [voter_id], async (err, results) => {
    if (err) {
      console.error('Error fetching voter account:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Account not found for the voter' });
    }

    const privateKey = results[0].private_key;

    try {
      // Create the account object using the private key
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log(`Processing vote for voter: ${account.address}`);

      // Use the registerOrVote function to handle both registration and voting
      const tx = votingContract.methods.registerOrVote(candidate_id);
      const receipt = await tx.send({ from: account.address, gas: 3000000 });

      console.log("Transaction receipt:", receipt.transactionHash);
      res.status(200).json({ message: 'Vote cast successfully', transactionHash: receipt.transactionHash });
    } catch (error) {
      console.error('Error during voting process:', error);
      if (error.message.includes('revert')) {
        res.status(400).json({ error: 'Smart contract error: ' + error.message });
      } else {
        res.status(500).json({ error: 'Failed to cast vote' });
      }
    }
  });
});



// Start the server
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
