const User = require('../../model/userSchema')

const walletManagement = async (req, res) => {
    try {
        const users = await User.find({});

        let transactions = [];
        users.forEach(user => {
            user.history.forEach(transaction => {transactions.push({
            transactionId: transaction.date, 
     transactionDate: new Date(transaction.date).toLocaleString(),
    user: { name: user.name },
       transactionType: transaction.amount > 0 ? "Credit" : "Debit",
                });
            });
        });

        // Pagination Logic
        const page = parseInt(req.query.page) || 1; // Current page
        const limit =5 ; // Transactions per page
        const totalTransactions = transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        
        const paginatedTransactions = transactions.slice((page - 1) * limit, page * limit);

        
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }

        res.render("admin/walletManagement", {transactions: paginatedTransactions,currentPage: page,
            totalPages: totalPages,
            pages: pages, 
            layout: 'adminLayout'
        });

    } catch (error) {
        console.error("Error fetching wallet transactions:", error);
        res.status(500).send("Internal Server Error");
    }
};


const transactionDetails = async (req, res) => {
    try {
        const transactionDate = Number(req.params.transactionId); 
        const user = await User.findOne({ "history.date": transactionDate }, "name email history");

        if (!user) return res.status(404).send("Transaction not found");

        
        const transaction = user.history.find(trx => trx.date === transactionDate);
        if (!transaction) return res.status(404).send("Transaction not found");

    
        const orderIdMatch = transaction.status.match(/\(Order ID: ([a-fA-F0-9]+)\)/);
        const orderId = orderIdMatch ? orderIdMatch[1] : null;

        
        const transactionDetails = {
            transactionId: transaction.date,
            transactionDate: new Date(transaction.date).toLocaleString(),
            user: { name: user.name, email: user.email },
            transactionType: transaction.amount > 0 ? "Credit" : "Debit",
            amount: transaction.amount,
            status: transaction.status,
            orderId: transaction.orderId
        };

        res.render("admin/transactionDetails", {
            transaction: transactionDetails,
            layout: 'adminLayout'
        });

    } catch (error) {
        console.error("Error fetching transaction details:", error);
        res.status(500).send("Internal Server Error");
    }
};




module.exports = { walletManagement , transactionDetails};
