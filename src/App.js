import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import './App.css';
import web3 from './web3'; // Import your web3 instance
import contract from './Crowdfunding';// Import your contract instance
import {navItems} from "./helpers";

class App extends Component {
    // Define the initial state of the component
    state = {
        currentAccount: '',
        owner: '',
        balance: '',
        collectedFees: '',
        campaigns: [], // List of campaigns
        newCampaign: {title: '', pledgeCost: '', numberOfPledges: ''},
        newOwner: '',
    };

    // Lifecycle method to load data from the contract
    async componentDidMount() {
        try {
            const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
            const owner = await contract.methods.owner().call();
            const balance = await web3.eth.getBalance(contract.options.address);
            const collectedFees = await contract.methods.totalFeesCollected().call();

            this.setState({
                currentAccount: accounts[0],
                owner,
                balance: web3.utils.fromWei(balance, 'ether'),
                collectedFees: web3.utils.fromWei(collectedFees, 'ether'),
            });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error loading contract data:", error);
        }

        window.ethereum.on('accountsChanged', (accounts) => {
            this.setState({currentAccount: accounts[0]});
        });
    }

    // Load the campaigns from the contract
    loadCampaigns = async () => {
        const campaignCount = await contract.methods.getCampaignCounter().call();
        const campaigns = [];

        for (let i = 0; i < campaignCount; i++) {
            const campaign = await contract.methods.campaigns(i).call();
            campaigns.push({...campaign, id: i});
        }

        this.setState({campaigns});
    };

    // Create a new campaign
    createCampaign = async (newCampaign) => {
        console.log("State", this.state);
        console.log("New Campaign", newCampaign);
        const {title, pledgeCost, numberOfPledges} = newCampaign;
        console.log('Creating campaign in:', title, pledgeCost, numberOfPledges);

        try {
            await contract.methods
                .createCampaign(title, Number(pledgeCost), Number(numberOfPledges))
                .send({
                    from: this.state.currentAccount,
                    value: "1",
                });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error creating campaign:", error);
        }
    };

    // Pledge to a campaign
    pledge = async (campaignId, pledgeCost) => {
        try {
            await contract.methods
                .campaignFunding(1, campaignId)
                .send({
                    from: this.state.currentAccount,
                    value: pledgeCost
                });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error pledging to campaign:", error);
        }
    }

    cancelCampaign = async (campaignId) => {
        try {
            await contract.methods
                .cancelCampaign(campaignId)
                .send({
                    from: this.state.currentAccount,
                });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error canceling campaign:", error);
        }
    }

    completeCampaign = async (campaignId) => {
        try {
            await contract.methods
                .completeCampaign(campaignId)
                .send({
                    from: this.state.currentAccount,
                });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error fulfilling campaign:", error);
        }
    }

    refundInvestor = async () => {
        const {currentAccount} = this.state;

        if (!web3.utils.isAddress(currentAccount)) {
            alert("Please enter a valid Ethereum address.");
            return;
        }

        try {
            this.setState({message: "Processing refund..."});

            await contract.methods
                .refundInvestor(currentAccount)
                .send({from: currentAccount});

            alert(`Refund successful for investor: ${currentAccount}`);
            this.setState({investorAddress: "", message: ""});

            await this.loadCampaigns(); // Reload campaigns to update the state
        } catch (error) {
            console.error("Error refunding investor:", error.message || error);
            alert(`Error refunding investor: ${error.message || 'Transaction failed.'}`);
        }
    };


    renderCampaigns = (campaigns, filter) => {
        return campaigns
            .filter(filter)
            .map((campaign) => (
                <tr key={campaign.id}>
                    <td>{campaign.entrepreneur}</td>
                    <td>{campaign.title}</td>
                    <td>{web3.utils.fromWei(campaign.sharePrice, 'ether')}</td>
                    <td>{campaign.currentShares}/{campaign.totalShares}</td>
                    <td>{campaign.isActive ? 'Active' : campaign.isCompleted ? 'Completed' : 'Canceled'}</td>
                    {
                        !campaign.isCancelled || !campaign.isCompleted &&
                        <td className={`d-flex gap-2 h-auto`}>
                            {
                                campaign.isActive &&
                                <button
                                    className="btn btn-success btn-sm"
                                    onClick={async () => await this.pledge(campaign.id, campaign.sharePrice)}
                                >
                                    Pledge
                                </button>
                            }
                            {
                                campaign.isActive &&
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={async () => await this.cancelCampaign(campaign.id)}
                                >
                                    Cancel
                                </button>
                            }
                            {
                                (campaign.currentShares === campaign.totalShares) && campaign.isActive &&
                                <button
                                    className="btn btn-info btn-sm"
                                    onClick={async () => await this.completeCampaign(campaign.id)}
                                >
                                    Fulfill
                                </button>
                            }
                        </td>
                    }
                </tr>
            ));
    };

    withdrawFees = async () => {
        try {
            await contract.methods
                .withdrawFees()
                .send({
                    from: this.state.currentAccount,
                });
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error withdrawing funds:", error);
        }
    }

    render() {
        const {currentAccount, owner, balance, collectedFees, campaigns} = this.state;

        const currentAccountShortened = currentAccount ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` : '';
        return (
            <div className="">
                <nav
                    className="navbar navbar-expand-lg text-white p-2 d-flex top-nav align-items-center justify-content-between">
                    <header className={`pink-white`}>
                        <h2 className="gradient-text">Crypto Crowdfunding</h2>
                        <h5 className={'fs-6'}>A Web3 Implementation for the Course of Blockchain</h5>
                    </header>
                    <ul className={"text-white navbar-nav gap-4"}>
                        {
                            navItems.map((item, index) => (
                                <div className={`d-flex flex-column gap-1 align-items-center nav-text`} key={index}>
                                    <li className="nav-item text-white">{item.name}</li>
                                    {index === 0 && <div>{owner}</div>}
                                    {index === 1 && <div>{balance}</div>}
                                    {index === 2 && <div>{collectedFees}</div>}
                                </div>
                            ))
                        }
                    </ul>
                    <section className="address rounded-2 p-2">
                        <img
                            src="/circum_wallet.png"
                            alt="Wallet"
                            width="30"
                        />
                        <div>{currentAccountShortened}</div>
                    </section>
                </nav>
                <main className={'row p-5 gap-5'}>
                    <section className={`col-md-auto create-campaign`}>
                        <header className={`text-center`}>
                            <h2 className={`fs-4 gradient-text`}>Campaign Creation</h2>
                            <h4 className={`fs-6 white`}>Create your own campaign in seconds</h4>
                        </header>
                        <form className={`d-flex flex-column align-items-center`} onSubmit={
                            async (e) => {
                                e.preventDefault();
                                const newCampaign = {
                                    title: document.getElementById('title').value,
                                    pledgeCost: document.getElementById('pledgeCost').value,
                                    numberOfPledges: document.getElementById('numOfPledges').value
                                };
                                console.log('Creating campaign:', newCampaign);

                                this.setState({newCampaign});

                                await this.createCampaign(newCampaign);
                            }
                        }>
                            <div className="mb-3">
                                <label htmlFor="exampleInputEmail1" className="form-label">Title</label>
                                <input type="text" className="form-control" id="title" placeholder={'Campaign 1'}/>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="pledgeCost" className="form-label">Pledge Cost</label>
                                <input type="text" className="form-control" id="pledgeCost" placeholder={"10000"}/>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="numOfPledges" className="form-label">Number of Pledges</label>
                                <input type="text" className="form-control" id="numOfPledges" placeholder={"200"}/>
                            </div>
                            <button type="submit" className="btn btn-light">Create</button>
                        </form>
                    </section>
                    <section className={'col custom-table'}>
                        <h3 className={'pink-white'}>Live Campaigns</h3>
                        <table className="table table-dark table-hover">
                            <thead>
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price (ETH)</th>
                                <th>Shares (Pledged/Total)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>{this.renderCampaigns(campaigns, (c) => c.isActive)}</tbody>
                        </table>

                        <br/>
                        <h3 className={'pink-white'}>Fulfilled Campaigns</h3>
                        <table className="table table-dark table-hover">
                            <thead>
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price (ETH)</th>
                                <th>Shares (Pledged/Total)</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>{this.renderCampaigns(campaigns, (c) => c.isCompleted)}</tbody>
                        </table>

                        <br/>
                        <header className={`d-flex gap-2 mb-2`}>
                            <h3 className={'pink-white'}>Canceled Campaigns</h3>
                            <button
                                className="btn btn-light btn-sm"
                                onClick={async () => await this.refundInvestor()}
                            >
                                Claim
                            </button>
                        </header>
                        <table className="table table-dark table-hover">
                            <thead>
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price (ETH)</th>
                                <th>Shares (Pledged/Total)</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody
                                className={`border`}>{this.renderCampaigns(campaigns, (c) => !c.isActive && !c.isCompleted)}</tbody>
                        </table>
                    </section>
                    <section className={`row control-panel`}>
                        <header>
                            <h3 className={`pink-white`}>Control Panel</h3>
                            <h6 className={`text-white-50`}>Only Contract Owner can perform these actions</h6>
                        </header>
                        <div className="d-flex w-100 justify-content-between mb-2 gap-5">
                            <button
                                className="btn btn-light border w-100"
                                onClick={async () => await this.withdrawFees()}
                            >
                                Withdraw
                            </button>
                            <div className="w-100">
                                <input
                                    type="text" className="form-control" placeholder="New owner's wallet address" id={'newOwner'}/>
                                <button
                                    className="btn btn-dark mt-2 w-100"
                                    onClick={async () => await contract.methods.changeOwner(document.getElementById('newOwner').value).send({from: this.state.currentAccount})}
                                >
                                    Change Owner
                                </button>
                            </div>
                            <div className="w-100">
                                <input type="text" className="form-control" placeholder="Entrepreneur's address"/>
                                <button
                                    className="btn btn-danger mt-2 w-100"
                                    onClick={async () => await contract.methods.banEntrepreneur().send({from: this.state.currentAccount})}
                                >
                                    Ban Entrepreneur
                                </button>
                            </div>
                        </div>
                    </section>
                </main>

            </div>
        );
    }
}

export default App;
