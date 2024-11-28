import Web3 from 'web3';
import VotingContract from './contracts/Voting.json';

let web3; // Declare web3 variable globally
let votingInstance; // Declare votingInstance globally

// Initialize Web3 connection
const getWeb3 = async () => {
  try {
    // Initialize Web3 with Ganache provider or custom RPC URL
    web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545")); // Set web3 globally
    console.log("Connected to Ganache via HTTP Provider");
  } catch (error) {
    console.error("Failed to connect to Ganache or Ethereum network:", error);
    throw new Error("Web3 Initialization Error");
  }
  return web3;
};

// Load Voting contract instance
const loadContract = async () => {
  try {
    if (!web3) {
      throw new Error("Web3 is not initialized. Please initialize Web3 first.");
    }

    // Fetch network ID from Ganache
    const networkId = await web3.eth.net.getId();
    
    console.log("Active network ID:", networkId);

    const deployedNetwork = VotingContract.networks[networkId];

    if (!deployedNetwork) {
      throw new Error("Voting contract not deployed on this network.");
    }

    // Initialize contract instance
    votingInstance = new web3.eth.Contract(
      VotingContract.abi,
      deployedNetwork.address
    );
    console.log("Voting contract loaded:", deployedNetwork.address);
  } catch (error) {
    console.error("Failed to load Voting contract:", error);
    throw new Error("Contract Loading Error");
  }
  return votingInstance;
};

// Full initialization of Web3 and Voting contract
const initWeb3 = async () => {
  try {
    // Initialize Web3
    await getWeb3();

    // Load the Voting contract
    const contractInstance = await loadContract();

    // Return initialized Web3 and contract instance
    return { web3, votingInstance: contractInstance };
  } catch (error) {
    console.error("Error initializing Web3 and contract:", error);
    throw error;
  }
};

// Function to get the current account (useful for login or vote casting)
const getCurrentAccount = async () => {
  try {
    if (!web3) {
      await getWeb3();
    }

    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts found. Make sure MetaMask or Ganache is configured.");
    }

    console.log("Current account:", accounts[0]);
    return accounts[0]; // Return the first account (default account)
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw new Error("Account Fetching Error");
  }
};

// Export functions for external use
export { getWeb3, loadContract, initWeb3, getCurrentAccount };
