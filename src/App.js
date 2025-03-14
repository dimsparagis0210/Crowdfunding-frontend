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
        hasRefunds: false,
        eventsTriggered: false,
        sharesPerBacker: [],
        isContractActive: false,
        windowSize: 0,
        isSecondAdmin: false,
    };

    updateInfo = async () => {
        const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
        const owner = await contract.methods.owner().call();
        const balance = await web3.eth.getBalance(contract.options.address);
        const collectedFees = await contract.methods.totalFeesCollected().call();

        await this.checkRefunds(accounts[0]);

        this.setState({
            currentAccount: accounts[0],
            owner,
            balance: web3.utils.fromWei(balance, 'ether'),
            collectedFees: web3.utils.fromWei(collectedFees, 'ether'),
            isSecondAdmin: accounts[0] === '0x153dfef4355E823dCB0FCc76Efe942BefCa86477'
        });

        window.ethereum.on('accountsChanged', this.handleAccountChange);

        await this.loadCampaigns();
    }

    // Lifecycle method to load data from the contract
    async componentDidMount() {
        try {
            await this.updateInfo();
            if (!this.state.eventsTriggered) {
                this.setupEventListeners();
                this.setState({eventsTriggered: true});
            }
        } catch (error) {
            console.error("Error loading contract data:", error);
        }
    }

    setupEventListeners() {
        // Listen for account change
        window.ethereum.on('accountsChanged', async (accounts) => {
            this.setState({currentAccount: accounts[0]});
            await this.checkRefunds(accounts[0]);
            await this.loadCampaigns();
        });

        // Listen for campaign creation
        contract.events.CampaignCreated().on('data', async (data) => {
            console.log('New campaign created:', data);
            await this.updateInfo();
        });

        // Listen for campaign funding
        contract.events.SharesPurchased().on('data', async (data) => {
            console.log('Shares purchased:', data);
            await this.updateInfo();
        });

        // Listen for campaign cancellation
        contract.events.CampaignCancelled().on('data', async (data) => {
            console.log('Campaign cancelled:', data);
            await this.updateInfo();
        });

        // Listen for campaign completion
        contract.events.CampaignCompleted().on('data', async (data) => {
            console.log('Campaign completed:', data);
            await this.updateInfo();
        });

        // Listen for refund
        contract.events.InvestorRefunded().on('data', async (data) => {
            console.log('Refund:', data);
            await this.updateInfo();
        });

        // Listen for fee withdrawal
        contract.events.FeesWithdrawn().on('data', async (data) => {
            console.log('Fees withdrawn:', data);
            await this.updateInfo();
        });

        // Listen for owner change
        contract.events.ChangeOwner().on('data', async (data) => {
            console.log('Owner changed:', data);
            await this.updateInfo();
        });

        // Listen for entrepreneur ban
        contract.events.BanEntrepreneur().on('data', async (data) => {
            console.log('Entrepreneur banned:', data);
            await this.updateInfo();
        });

        // Listen for contract destruction
        contract.events.DestroyContract().on('data', async (data) => {
            console.log('Contract destroyed:', data);
            await this.updateInfo();
        });

        // Set up a listener for screen size changes
        window.addEventListener('resize', () => {
            this.setState({windowSize: window.innerWidth});
        });
    }

    // Handle account change
    handleAccountChange = async () => {
        const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
        this.setState({currentAccount: accounts[0]});
        await this.checkRefunds(accounts[0]);
        await this.loadCampaigns();
    }

    // Check if there are refunds available
    checkRefunds = async (account) => {
        const refunds = await contract.methods.refunds(account).call();
        this.setState({hasRefunds: refunds > 0});
    };

    // Load the campaigns from the contract
    loadCampaigns = async () => {
        const campaignCount = await contract.methods.getCampaignCounter().call();
        const campaigns = [];
        const sharesPerBacker = [];

        for (let i = 0; i < campaignCount; i++) {
            const campaign = await contract.methods.campaigns(i).call();
            campaigns.push({...campaign, id: i});
            const userPledges = await contract.methods.getSharesPerBacker(i, this.state.currentAccount).call();
            console.log("User Pledges", userPledges);
            const sharesPerBackerObject = {
                sharesPerBacker: userPledges,
                campaignId: i
            }
            sharesPerBacker.push(sharesPerBackerObject);
        }
        const isContractActive = await contract.methods.getIsContractActive().call();
        this.setState({sharesPerBacker});
        this.setState({campaigns});
        this.setState({isContractActive});
    };

    // Create a new campaign
    createCampaign = async (newCampaign) => {
        const {title, pledgeCost, numberOfPledges} = newCampaign;

        try {
            await contract.methods
                .createCampaign(title, Number(pledgeCost), Number(numberOfPledges))
                .send({
                    from: this.state.currentAccount,
                    value: 20000000000000000,
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
        console.log("Completing campaign:", campaignId);
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

            // alert(`Refund successful for investor: ${currentAccount}`);
            this.setState({investorAddress: "", message: ""});

            await this.checkRefunds(currentAccount);
            await this.loadCampaigns(); // Reload campaigns to update the state
        } catch (error) {
            console.error("Error refunding investor:", error.message || error);
            alert(`Error refunding investor: ${error.message || 'Transaction failed.'}`);
        }
    };


    renderCampaigns = (campaigns, filter) => {
        const {currentAccount} = this.state;

        return campaigns
            .filter(filter)
            .map((campaign) => {
                // Fetch the user's pledges for this campaign
                // const userPledges = await contract.methods.getSharesPerBacker(campaign.id, currentAccount).call();

                return (
                    <tr key={campaign.id}>
                        <td>{campaign.entrepreneur}</td>
                        <td>{campaign.title}</td>
                        <td>{web3.utils.fromWei(20000000000000000, 'wei')}</td>
                        <td>{campaign.totalShares - campaign.currentShares > 0 ? `${campaign.totalShares - campaign.currentShares}` : '0'}</td>
                        <td>{this.state.sharesPerBacker.filter(
                            (s) => s.campaignId === campaign.id).map((s) => s.sharesPerBacker
                        )}</td>
                        <td>{campaign.isActive ? 'Active' : campaign.isCompleted ? 'Completed' : 'Canceled'}</td>
                        {
                            (!campaign.isCancelled && !campaign.isCompleted) &&
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
                                    (campaign.isActive &&
                                        (campaign.entrepreneur.toLowerCase() === currentAccount.toLowerCase() ||
                                            this.state.owner.toLowerCase() === currentAccount.toLowerCase() ||
                                            this.state.isSecondAdmin)) &&
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={async () => await this.cancelCampaign(campaign.id)}
                                    >
                                        Cancel
                                    </button>
                                }
                                {
                                    (campaign.isActive &&
                                        (campaign.currentShares >= campaign.totalShares) &&
                                        (campaign.entrepreneur.toLowerCase() === currentAccount.toLowerCase() ||
                                            this.state.owner.toLowerCase() === currentAccount.toLowerCase() ||
                                            this.state.isSecondAdmin))
                                    &&
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
                );
            });
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

    destroyContract = async () => {
        try {
            await contract.methods
                .destroyContract()
                .send({
                    from: this.state.currentAccount,
                });
            this.setState({isContractActive: true});
            await this.loadCampaigns();
        } catch (error) {
            console.error("Error destroying contract:", error);
        }
    }

    render() {
        const {currentAccount, owner, balance, collectedFees, campaigns} = this.state;

        const currentAccountShortened = currentAccount ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` : '';
        return (
            <div className="min-vh-100 overflow-x-hidden">
                <nav
                    className="responsive-header navbar navbar-expand-lg text-white py-3 px-5 d-flex top-nav align-items-center justify-content-between w-100">
                    <header className={`pink-white`}>
                        <h2 className="gradient-text">Crypto Crowdfunding</h2>
                        <h5 className={'fs-6'}>A Web3 Implementation for the Course of Blockchain</h5>
                    </header>
                    <div>

                    </div>
                    <ul className={"custom-nav text-white navbar-nav gap-4"}>
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
                <main className={'row p-5 gap-5 w-100'}>
                    {
                        (this.state.currentAccount.toLowerCase() !== this.state.owner.toLowerCase()
                            && this.state.isContractActive) &&
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
                    }
                    {
                        (this.state.isSecondAdmin && this.state.isContractActive) &&
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
                    }
                    <section className={'overflow-x-scroll col custom-table'}>
                        <h3 className={'pink-white'}>Live Campaigns</h3>
                        <table className="table table-dark table-hover">
                            <thead>
                            <tr>
                                <th>Entrepreneur</th>
                                <th>Title</th>
                                <th>Price (ETH)</th>
                                <th>Pledges Left</th>
                                <th>Your Pledges</th>
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
                                <th>Pledges Left</th>
                                <th>Your Pledges</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>{this.renderCampaigns(campaigns, (c) => c.isCompleted)}</tbody>
                        </table>

                        <br/>
                        <header className={`d-flex gap-2 mb-2`}>
                            <h3 className={'pink-white'}>Canceled Campaigns</h3>
                            <button
                                className={`${!this.state.hasRefunds ? 'disabled' : ''} btn btn-light btn-sm`}
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
                                <th>Pledges Left</th>
                                <th>Your Pledges</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody
                                className={``}>{this.renderCampaigns(campaigns, (c) => !c.isActive && !c.isCompleted)}</tbody>
                        </table>
                    </section>
                    <section className={`control-panel`}>
                        <header>
                            <h3 className={`pink-white`}>Control Panel</h3>
                            <h6 className={`text-white-50`}>Only Contract Owner can perform these actions</h6>
                        </header>
                        <div className="d-flex w-100 justify-content-between mb-2 gap-5">
                            {
                                this.state.isSecondAdmin
                                    ?
                                    <button
                                        className={`btn w-100 btn-light`}
                                        onClick={async () => await this.withdrawFees()}
                                    >
                                        Withdraw
                                    </button>
                                    :
                                    <button
                                        className={`btn w-100 ${(this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() && this.state.isContractActive
                                            ? 'btn-light' : 'btn-light disabled')}`}
                                        onClick={async () => await this.withdrawFees()}
                                    >
                                        Withdraw
                                    </button>
                            }
                            <div className="w-100">
                                {
                                    (this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() ||
                                        this.state.isSecondAdmin) && this.state.isContractActive
                                        ?
                                        <input
                                            type="text"
                                            className={'form-control'}
                                            placeholder="New owner's wallet address"
                                            id={'newOwner'}
                                        />
                                        :
                                        <input
                                            type="text"
                                            className={'form-control'}
                                            placeholder="New owner's wallet address"
                                            id={'newOwner'}
                                            disabled
                                        />
                                }
                                <button
                                    className={`btn w-100 mt-2 ${(this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() ||
                                        this.state.isSecondAdmin) && this.state.isContractActive
                                        ? 'btn-dark' : 'btn-dark disabled'}`}
                                    // className="btn btn-dark mt-2 w-100"
                                    onClick={async () => await contract.methods.changeOwner(document.getElementById('newOwner').value).send({from: this.state.currentAccount})}
                                >
                                    Change Owner
                                </button>
                            </div>
                            <div className="w-100">
                                {
                                    (this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() ||
                                        this.state.isSecondAdmin) && this.state.isContractActive
                                        ?
                                        <input
                                            type="text"
                                            className={'form-control'}
                                            placeholder="Entrepreneur's address"
                                            id={'bannedEntrepreneur'}
                                        />
                                        :
                                        <input
                                            type="text"
                                            className={'form-control'}
                                            placeholder="Entrepreneur's address"
                                            disabled
                                            id={'bannedEntrepreneur'}
                                        />
                                }
                                <button
                                    className={`btn w-100 mt-2 ${(this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() ||
                                        this.state.isSecondAdmin) && this.state.isContractActive
                                        ? 'btn-danger' : 'btn-danger disabled'}`}
                                    onClick={async () => await contract.methods.banInvestor(
                                        document.getElementById('bannedEntrepreneur').value
                                    ).send({from: this.state.currentAccount})}
                                >
                                    Ban Entrepreneur
                                </button>
                            </div>
                            <button
                                className={`btn w-100 ${(this.state.currentAccount.toLowerCase() === this.state.owner.toLowerCase() ||
                                    this.state.isSecondAdmin) && this.state.isContractActive
                                    ? 'btn-danger' : 'btn-danger disabled'}`}
                                onClick={async () => await this.destroyContract()}
                            >
                                Destroy Contract
                            </button>
                        </div>
                    </section>
                </main>

            </div>
        );
    }
}

export default App;
