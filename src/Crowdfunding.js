import web3 from './web3';
import abi from './Crowdfunding.json';

const address = '0xe4E189CF4042A087F5b3D4AF42caae0A73E7b830';
const contract = new web3.eth.Contract(abi, address);

export default contract;
