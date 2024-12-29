import React, {Component} from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import './App.css';
import web3 from './web3'; // Import your web3 instance
import contract from './Crowdfunding'; // Import your contract instance

class App extends Component {
    state = {
        currentAccount: '',
        owner: '',
        balance: '',
        collectedFees: '',
        campaigns: [], // List of campaigns
        newCampaign: {title: '', pledgeCost: '', numberOfPledges: ''},
    };

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

    loadCampaigns = async () => {
        const campaignCount = await contract.methods.getCampaignCount().call();
        const campaigns = [];

        for (let i = 0; i < campaignCount; i++) {
            const campaign = await contract.methods.campaigns(i).call();
            campaigns.push({...campaign, id: i});
        }

        this.setState({campaigns});
    };

    createCampaign = async (event) => {
        event.preventDefault();
        const {title, pledgeCost, numberOfPledges} = this.state.newCampaign;

        try {
            await contract.methods
                .createCampaign(title, web3.utils.toWei(pledgeCost, 'ether'), numberOfPledges)
                .send({from: this.state.currentAccount});

            this.loadCampaigns();
        } catch (error) {
            console.error("Error creating campaign:", error);
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
                    <td>
                        {campaign.isActive && <button className="btn btn-success btn-sm">Pledge</button>}
                        {campaign.isActive && <button className="btn btn-danger btn-sm">Cancel</button>}
                        {campaign.isCompleted && <button className="btn btn-info btn-sm">Fulfill</button>}
                        {!campaign.isActive && !campaign.isCompleted && (
                            <button className="btn btn-warning btn-sm">Claim</button>
                        )}
                    </td>
                </tr>
            ));
    };

    render() {
        const {currentAccount, owner, balance, collectedFees, campaigns} = this.state;

        const currentAccountShortened = currentAccount ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` : '';

        return (
            <div className="">
                <nav className="text-white p-2 d-flex top-nav align-items-center justify-content-between">
                    <h1 className="">Crowdfunding DApp</h1>
                    <section className="address rounded-2 p-2">
                        <img
                            src="/circum_wallet.png"
                            alt="Wallet"
                            width="30"
                        />
                        <div>{currentAccountShortened}</div>
                    </section>
                </nav>
                {/*<div className="mb-4">*/}
                {/*    <div className="">*/}
                {/*        <strong className="">Current Address</strong>*/}
                {/*        <template className="form-control text-secondary">{currentAccount}</template>*/}
                {/*    </div>*/}

                {/*    <div className="">*/}
                {/*        <strong className="">Owner's Address</strong>*/}
                {/*        <template className="form-control text-secondary">{owner}</template>*/}
                {/*    </div>*/}

                {/*    <div className="">*/}
                {/*        <strong className="">Balance</strong>*/}
                {/*        <template className="form-control text-secondary">{balance}</template>*/}
                {/*        <strong className="">Collected Fees</strong>*/}
                {/*        <template className="form-control text-secondary">{collectedFees}</template>*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/*<form onSubmit={this.createCampaign} className="mb-4">*/}
                {/*    <h3>New Campaign</h3>*/}
                {/*    <div className="row mb-2">*/}
                {/*        <div className="col">*/}
                {/*            <input*/}
                {/*                type="text"*/}
                {/*                className="form-control"*/}
                {/*                placeholder="Title"*/}
                {/*                onChange={(e) =>*/}
                {/*                    this.setState({newCampaign: {...this.state.newCampaign, title: e.target.value}})*/}
                {/*                }*/}
                {/*            />*/}
                {/*        </div>*/}
                {/*        <div className="col">*/}
                {/*            <input*/}
                {/*                type="text"*/}
                {/*                className="form-control"*/}
                {/*                placeholder="Pledge cost (ETH)"*/}
                {/*                onChange={(e) =>*/}
                {/*                    this.setState({*/}
                {/*                        newCampaign: {*/}
                {/*                            ...this.state.newCampaign,*/}
                {/*                            pledgeCost: e.target.value*/}
                {/*                        }*/}
                {/*                    })*/}
                {/*                }*/}
                {/*            />*/}
                {/*        </div>*/}
                {/*        <div className="col">*/}
                {/*            <input*/}
                {/*                type="number"*/}
                {/*                className="form-control"*/}
                {/*                placeholder="Number of pledges"*/}
                {/*                onChange={(e) =>*/}
                {/*                    this.setState({*/}
                {/*                        newCampaign: {*/}
                {/*                            ...this.state.newCampaign,*/}
                {/*                            numberOfPledges: e.target.value*/}
                {/*                        }*/}
                {/*                    })*/}
                {/*                }*/}
                {/*            />*/}
                {/*        </div>*/}
                {/*        <div className="col">*/}
                {/*            <button className="btn btn-primary">Create</button>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</form>*/}

                {/*<h3>Live Campaigns</h3>*/}
                {/*<table className="table table-striped">*/}
                {/*    <thead>*/}
                {/*    <tr>*/}
                {/*        <th>Entrepreneur</th>*/}
                {/*        <th>Title</th>*/}
                {/*        <th>Price (ETH)</th>*/}
                {/*        <th>Shares (Pledged/Total)</th>*/}
                {/*        <th>Status</th>*/}
                {/*        <th>Actions</th>*/}
                {/*    </tr>*/}
                {/*    </thead>*/}
                {/*    <tbody>{this.renderCampaigns(campaigns, (c) => c.isActive)}</tbody>*/}
                {/*</table>*/}

                {/*<h3>Fulfilled Campaigns</h3>*/}
                {/*<table className="table table-striped">*/}
                {/*    <thead>*/}
                {/*    <tr>*/}
                {/*        <th>Entrepreneur</th>*/}
                {/*        <th>Title</th>*/}
                {/*        <th>Price (ETH)</th>*/}
                {/*        <th>Shares (Pledged/Total)</th>*/}
                {/*        <th>Status</th>*/}
                {/*        <th>Actions</th>*/}
                {/*    </tr>*/}
                {/*    </thead>*/}
                {/*    <tbody>{this.renderCampaigns(campaigns, (c) => c.isCompleted)}</tbody>*/}
                {/*</table>*/}

                {/*<h3>Canceled Campaigns</h3>*/}
                {/*<table className="table table-striped">*/}
                {/*    <thead>*/}
                {/*    <tr>*/}
                {/*        <th>Entrepreneur</th>*/}
                {/*        <th>Title</th>*/}
                {/*        <th>Price (ETH)</th>*/}
                {/*        <th>Shares (Pledged/Total)</th>*/}
                {/*        <th>Status</th>*/}
                {/*        <th>Actions</th>*/}
                {/*    </tr>*/}
                {/*    </thead>*/}
                {/*    <tbody>{this.renderCampaigns(campaigns, (c) => !c.isActive && !c.isCompleted)}</tbody>*/}
                {/*</table>*/}

                {/*<h3>Control Panel</h3>*/}
                {/*<div className="row mb-2">*/}
                {/*    <div className="col">*/}
                {/*        <button className="btn btn-warning">Withdraw</button>*/}
                {/*    </div>*/}
                {/*    <div className="col">*/}
                {/*        <input type="text" className="form-control" placeholder="New owner's wallet address"/>*/}
                {/*        <button className="btn btn-info mt-2">Change Owner</button>*/}
                {/*    </div>*/}
                {/*    <div className="col">*/}
                {/*        <input type="text" className="form-control" placeholder="Entrepreneur's address"/>*/}
                {/*        <button className="btn btn-danger mt-2">Ban Entrepreneur</button>*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        );
    }
}

export default App;
