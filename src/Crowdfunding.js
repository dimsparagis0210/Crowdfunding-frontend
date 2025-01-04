import web3 from './web3';
import abi from './Crowdfunding.json';

const address = '0x9Eec08dC82B3B17CD5bAb73E9c19c926f77bDDB8';
const contract = new web3.eth.Contract(abi, address);

export default contract;
