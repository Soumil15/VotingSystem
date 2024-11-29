import Web3 from 'web3';
import VotingContract from './contracts/Voting.json';
import axios from 'axios';

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
    const web3Instance = await getWeb3();
    const votingInstance = await loadContract();
    return { web3: web3Instance, votingInstance };
  } catch (error) {
    console.error("Failed to initialize Web3:", error);
    throw error;
  }
};

// Function to get the current account (useful for login or vote casting)
const getCurrentAccount = async () => {
  try {
    const web3Instance = new Web3('http://127.0.0.1:7545'); // Use Ganache URL instead of window.ethereum
    const voterId = localStorage.getItem("voter_id");
    if (!voterId) {
      throw new Error("No voter ID found");
    }

    const response = await axios.get(`http://localhost:8081/voter-info?voter_id=${voterId}`);
    if (!response.data?.account_address) {
      throw new Error("No account address found for this voter");
    }

    // Clean and format the address
    let address = response.data.account_address;
    if (!address.startsWith('0x')) {
      address = '0x' + address;
    }
    return web3Instance.utils.toChecksumAddress(address);
  } catch (error) {
    console.error("Error fetching account:", error);
    throw new Error("Account Fetching Error: " + error.message);
  }
};

// Export functions for external use
export { getWeb3, loadContract, initWeb3, getCurrentAccount };
