import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import web3 from './web3';

class Lottery extends Component {
    state = {
        manager: '',
        players: [],
        balance: '',
        value: '',
        message: '',
        currentAccount: ''
    };

    async componentDidMount() {
        try { // Αν υπάρχει εγκατεστημένο metamask
// Ορισμός των state μεταβλητών
            const manager = await lottery.methods.manager().call();
            const players = await lottery.methods.getPlayers().call();
            const balance = await web3.eth.getBalance(lottery.options.address);
            this.setState({ message: '', manager, players, balance });
            try { // Επικοινωνία με το metamask
                const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
                this.setState({ message: '', currentAccount });
            } catch (error) { // Αν το metamask δεν έκανε accept το request
                this.setState({ message: 'Metamask has not connected yet' });
            }
        } catch (error) { // Αν το metamask δεν έχει εγκατασταθεί
            this.setState({ message: 'Metamask is not installed' });
        }
// Set up event listeners only once
        if (!this.eventListenersSet) {
            this.setupEventListeners();
            this.eventListenersSet = true;
        }
    }
    setupEventListeners() {
// Κάθε φορά που επιλέγεται άλλο πορτοφόλι στο metamask...
        window.ethereum.on('accountsChanged', (accounts) => {
// ... να γίνεται refresh η σελίδα
            const currentAccount = accounts[0];
            this.setState({ currentAccount });
        });
    }
// Όταν πατηθεί το κουμπί "Enter"
    onSubmit = async event => {
        event.preventDefault();
        this.setState({ message: 'Waiting on transaction success...' });
        await lottery.methods.enter().send({ // Κλήση της "enter()" του συμβολαίου
            from: this.state.currentAccount,
// gas: 100000, gasPrice: 1000000000, // μόνο στο Ganache
            value: web3.utils.toWei(this.state.value, 'ether')
        });
        this.setState({ message: 'You have been entered!' });
    };
// Όταν πατηθεί το κουμπί "Pick a Winner"
    onClick = async () => {
        this.setState({ message: 'Waiting on transaction success...' });
        await lottery.methods.pickWinner().send({ // Κλήση της "pickWinner()" του συμβολαίου
// gas: 100000, gasPrice: 1000000000, // μόνο στο Ganache
            from: this.state.currentAccount
        });
        this.setState({ message: 'A winner has been picked!' });
    };
// Κάθε φορά που η σελίδα γίνεται refresh
    render() {
        return (
            <div>
                <h2>Lottery Contract</h2>
                {/* Ό,τι βρίσκεται εντός των άγκιστρων είναι κώδικας JavaScript */}
                {/* Η σελίδα HLML λειτουργεί αυτόνομα, σαν να εκτελείται σε κάποιον server */}
                <p>
                    This contract is managed by {this.state.manager}. There are currently{' '}
                    {this.state.players.length} people entered, competing to win{' '}
                    {web3.utils.fromWei(this.state.balance, 'ether')} ether!
                </p>
                <hr /> {/* -------------------- Οριζόντια γραμμή -------------------- */}
                {/* Η φόρμα "Want to try your luck?" */}
                {/* Θα μπορούσε αντί να χρησιμοποιηθεί φόρμα, */}
                {/* να χρησιμοποιηθεί button... */}
                {/* και αντί .onSubmit να χρησιμοποιούνταν .onClick */}
                <form onSubmit={this.onSubmit}>
                    <h4>Want to try your luck? Connected wallet address: {this.state.currentAccount}</h4>
                    <div>
                        <label>Amount of ether to enter</label>
                        <input
                            value={this.state.value}
                            onChange={event => this.setState({ value: event.target.value })}
                        />
                    </div>
                    <button>Enter</button>
                </form>
                <hr /> {/* -------------------- Οριζόντια γραμμή -------------------- */}
                <h4>Ready to pick a winner?</h4>
                <button onClick={this.onClick}>Pick a winner!</button>
                <hr /> {/* -------------------- Οριζόντια γραμμή -------------------- */}
            </div>
        );
    }
}
export default Lottery;
