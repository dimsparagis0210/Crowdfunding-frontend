import web3 from './web3';
import abi from './Crowdfunding.json';

const address = '0x261F9e56bbCD51291d00fCb991f0B7Eef5d00418';
const contract = new web3.eth.Contract(abi, address);


export default contract;
