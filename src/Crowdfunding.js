import web3 from './web3';
import abi from './Crowdfunding.json';

const address = '0x8D16427e1f6418e878A02De9183a4f27cCb5F7D3';
const contract = new web3.eth.Contract(abi, address);

export default contract;
