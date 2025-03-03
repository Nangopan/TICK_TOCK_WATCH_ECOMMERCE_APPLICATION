const Product = require("../../model/productSchema");
const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Coupon = require('../../model/couponSchema')
const Order = require("../../model/orderSchema");
const moment = require('moment')
const easyinvoice = require('easyinvoice');
const mongoose = require('mongoose')
const HttpStatus = require('../../httpStatus');




const payment_failed = (req, res) => {
    try {
        const userData = req.session.user;  
        const { error, payment_method, order_id } = req.query;  

        res.render('user/paymentFailed', {
            userData,
            error,            
            payment_method,  
            order_id,       
            message: 'Your payment attempt failed. Please try again or choose another payment method.'
        });
    } catch (error) {
        console.log("Error in payment_failed route:", error);
        res.status(HttpStatus.InternalServerError).send("Internal Server Error");
    }
}




const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(HttpStatus.BadRequest).json({ error: 'Invalid order ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        let notCancelledAmt = 0;

        let canceledOrder = await Order.findOne({ _id: ID });

        if (!canceledOrder) {
            return res.status(HttpStatus.NotFound).json({ error: 'Order not found' });
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

        let couponAmountEach = 0
        if(canceledOrder.coupon){
            couponAmountEach = canceledOrder.discountAmt / canceledOrder.product.length

        }
       

        if (['wallet', 'razorpay'].includes(canceledOrder.paymentMethod)) {
            for (const data of canceledOrder.product) {
                //await Product.updateOne({ _id: data._id }, { $inc: { stock: data.quantity } });
                await User.updateOne(
                    { _id: req.session.user._id },
                    { $inc: { wallet: (data.price * data.quantity) - couponAmountEach } }
                );
                notCancelledAmt += (data.price * data.quantity) - couponAmountEach;
            }
            

            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: notCancelledAmt,
                            status: 'Refund Amount for Order Cancellation',
                            date: Date.now()
                        }
                    }
                }
            );
        }

        res.json({
            success: true,
            message: 'Successfully cancelled Order'
        });
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
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

        let order = await Order.findById(id)
        let amountToReturned = order.amountAfterDscnt


        let couponAmountEach = 0
        if(returnedOrder.coupon){
            couponAmountEach = returnedOrder.discountAmt / returnedOrder.product.length

        }

        if (['wallet', 'razorpay'].includes(returnedOrder.paymentMethod)) {
            for (const data of returnedOrder.product) {
                //await Product.updateOne({ _id: data._id }, { $inc: { stock: data.quantity } });
                await User.updateOne(
                    { _id: req.session.user._id },
                    { $inc: { wallet: (data.price * data.quantity) - couponAmountEach } }
                );
                notCancelledAmt += data.price * data.quantity - couponAmountEach;
            }

            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: notCancelledAmt,
                            status: 'Refund Amount for Order Return',
                            date: Date.now()
                        }
                    }
                }
            );
        }

        res.json({
            success: true,
            message: 'Successfully Returned Order'

        });
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};




// Cancel one product in an order
const cancelOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;
        console.log(id, prodId)

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(HttpStatus.BadRequest).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isCancelled': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(HttpStatus.NotFound).json({ error: 'Order or product not found' });
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
        if(updatedOrder.couponUsed){
            const coupon = await Coupon.findOne({ code: updatedOrder.coupon });
            const discountAmt = (productprice * coupon.discount) / 100;
            const newTotal = productprice - discountAmt;
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: newTotal } }
            );

            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: newTotal,
                            status: `Refund Amount for Cancel ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );

        }else{
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
                            status: `Refund Amount for Cancel ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );
        }

        res.json({
            success: true,
            message: 'Successfully removed product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};





const returnOneProduct = async (req, res) => {
    try {
        const { id, prodId } = req.body;
        console.log(id, prodId)

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(prodId)) {
            return res.status(HttpStatus.BadRequest).json({ error: 'Invalid order or product ID' });
        }

        const ID = new mongoose.Types.ObjectId(id);
        const PRODID = new mongoose.Types.ObjectId(prodId);

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: ID, 'product._id': PRODID },
            { $set: { 'product.$.isReturned': true } },
            { new: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(HttpStatus.NotFound).json({ error: 'Order or product not found' });
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
        if(updatedOrder.couponUsed){
            const coupon = await Coupon.findOne({ code: updatedOrder.coupon });
            const discountAmt = (productprice * coupon.discount) / 100;
            const newTotal = productprice - discountAmt;
            await User.updateOne(
                { _id: req.session.user._id },
                { $inc: { wallet: newTotal } }
            );

            await User.updateOne(
                { _id: req.session.user._id },
                {
                    $push: {
                        history: {
                            amount: newTotal,
                            status: `Refund Amount for Return ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );

        }else{
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
                            status: `[return] ${result.product[0].name}`,
                            date: Date.now()
                        }
                    }
                }
            );
        }

        res.json({
            success: true,
            message: 'Successfully removed product'
        });
    } catch (error) {
        console.log(error.message);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
}





const getInvoice = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(HttpStatus.NotFound).send({ message: 'Order not found' });
        }

        const { userId, address: addressId } = order;
        const [user, address] = await Promise.all([
            User.findById(userId),
            Address.findById(addressId),
        ]);

        if (!user || !address) {
            return res.status(HttpStatus.NotFound).send({ message: 'User or address not found' });
        }

        const products = order.product.map((product) => ({
            quantity: product.quantity.toString(),
            description: product.name,
            tax: product.tax,
            price: product.price,
        }));

        products.push({
            quantity: '1', 
            description: 'Delivery Charge',
            tax: 0, 
            price: 50, 
        });
        
        const date = moment(order.date).format('MMMM D, YYYY');
        
        const data = {
            mode: "development",
            currency: 'INR',
            taxNotation: 'vat',
            marginTop: 25,
            marginRight: 25,
            marginLeft: 25,
            marginBottom: 25,
            // background: 'https://public.easyinvoice.cloud/img/watermark-draft.jpg',
            sender: {
                company: 'MobileBazaar',
                address: 'Park Avenue',
                zip: '600034',
                city: 'Chennai',
                country: 'India',
            },
            client: {
                company: user.name,
                address: address.adressLine1,
                zip: address.pin,
                city: address.city,
                country: 'India',
            },
            information: {
                number: `INV-${orderId}`,
                date: date,
            },
            products: products,
        };

        easyinvoice.createInvoice(data, function (result) {
            const fileName = `invoice_${orderId}.pdf`;
            const pdfBuffer = Buffer.from(result.pdf, 'base64');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.send(pdfBuffer);
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};



module.exports = {
    payment_failed,
    cancelOrder,
    cancelOneProduct,
    returnOrder,
    returnOneProduct,
    getInvoice  

}