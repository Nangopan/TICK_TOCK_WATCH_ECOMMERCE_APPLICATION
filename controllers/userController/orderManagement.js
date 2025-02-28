const Product = require("../../model/productSchema");
const User = require("../../model/userSchema");
const { Address } = require("../../model/addressSchema");

const Order = require("../../model/orderSchema");
const moment = require('moment')
const mongoose = require('mongoose')



  

const payment_failed = (req, res) => {
    try {
        const userData = req.session.user;  // Get user data from session
        const { error, payment_method, order_id } = req.query;  // Get the error details, payment method, and order ID from the query params

        // Log the error for debugging purposes (you can also save this to a log file or database if needed)
        console.error("Payment failed for order:", order_id);
        console.error("Error details:", error);

        // Render the payment failed page with additional error details
        res.render('user/paymentFailed', {
            userData,
            error,            // Send the error object received from Razorpay
            payment_method,   // Send the payment method used (like "razorpay", "cash-on-delivery", etc.)
            order_id,         // Send the order ID that failed
            message: 'Your payment attempt failed. Please try again or choose another payment method.'
        });
    } catch (error) {
        console.log("Error in payment_failed route:", error);
        res.status(500).send("Internal Server Error");
    }
}


const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        let notCancelledAmt = 0;

        let canceledOrder = await Order.findOne({ _id: ID });

        if (!canceledOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await Order.updateOne({ _id: ID }, { $set: { status: 'Cancelled' } });

        for (const product of canceledOrder.product) {
            if (!product.isCancelled) {
                await Product.updateOne(
                    { _id: product._id },
                    { $inc: { stock: product.quantity }, $set: { isCancelled: true } }
                );

                await Order.updateOne(
                    { _id: ID, 'product._id': product._id },
                    { $set: { 'product.$.isCancelled': true } }
                );
            }


        }


        res.json({
            success: true,
            message: 'Successfully cancelled Order'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Return entire order
const returnOrder = async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        const ID = new mongoose.Types.ObjectId(id);
        let notCancelledAmt = 0;

        let returnedOrder = await Order.findOne({ _id: ID }).lean();
        console.log(returnedOrder, "returnedOrder")

        const returnedorder = await Order.findByIdAndUpdate(ID, { $set: { status: 'Returned' } }, { new: true });
        for (const product of returnedorder.product) {
            if (!product.isCancelled) {
                await Product.updateOne(
                    { _id: product._id },
                    { $inc: { stock: product.quantity } }
                );

                await Order.updateOne(
                    { _id: ID, 'product._id': product._id },
                    { $set: { 'product.$.isReturned': true } }
                );
            }


        }
        res.json({
            success: true,
            message: 'Successfully Returned Order'

        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Cancel one product in an order
const cancelOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;
        console.log(id, prodId)

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isCancelled': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        const result = await Order.findOne(
            { _id: ID, 'product._id': PRODID },
            { 'product.$': 1 }
        ).lean();

        const productQuantity = result.product[0].quantity;
        const productprice = result.product[0].price * productQuantity

        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );
        
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: productprice } }
            );
            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: productprice,
                            status: `refund of: ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );
        

        res.json({
            success: true,
            message: 'Successfully removed product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};
const returnOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;
        console.log(id, prodId)

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(400).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isReturned': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order or product not found' });
        }

        const result = await Order.findOne(
            { _id: ID, 'product._id': PRODID },
            { 'product.$': 1 }
        ).lean();

        const productQuantity = result.product[0].quantity;
        const productprice = result.product[0].price * productQuantity

        await Product.findOneAndUpdate(
            { _id: PRODID },
            { $inc: { stock: productQuantity } }
        );
    
            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: productprice,
                            status: `[return]refund of: ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );
        

        res.json({
            success: true,
            message: 'Successfully removed product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}



module.exports = {
    payment_failed,
    cancelOrder,
    cancelOneProduct,
    returnOrder,
    returnOneProduct,

}