import web3 from './web3';
import abi from './Crowdfunding.json';

const address = '0xAE588629e2Fc9912c9928F1a9d92d6942ad265C5';
const contract = new web3.eth.Contract(abi, address);

export default contract;
