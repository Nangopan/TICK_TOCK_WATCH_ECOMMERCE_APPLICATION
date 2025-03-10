const moment = require('moment');
const Sale = require("../../model/orderSchema");
const Order = require("../../model/orderSchema");
const PDFDocument = require('pdfkit');
const hbs = require('hbs');
const Handlebars = require('handlebars');
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const HttpStatus = require('../../httpStatus');


let months = [];
let odersByMonth = [];
let revnueByMonth = [];
let totalRevnue = 0;
let totalSales = 0;
let categories = [];
let revenues = [];

const loadDashboard = async (req, res) => {
    try {

        const categoryCount = await Category.countDocuments();
        const categoryRevenue = await Order.aggregate([
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "products",
                    localField: "product._id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalRevenue: { $sum: { $multiply: ["$product.quantity", "$productDetails.price"] } }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $project: {
                    _id: 0,
                    category: "$categoryDetails.category",
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        categories = categoryRevenue.map(item => item.category);
        revenues = categoryRevenue.map(item => item.totalRevenue);

        console.log(categories);
        console.log("//////////////////////////////////////////////////////////", categoryRevenue);

        const sales = await Sale.find({}).lean();

        const salesByMonth = {};

        sales.forEach((sale) => {
            const monthYear = moment(sale.date).format('MMMM YYYY');
            if (!salesByMonth[monthYear]) {
                salesByMonth[monthYear] = {
                    totalOrders: 0,
                    totalRevenue: 0
                };
            }
            
            salesByMonth[monthYear].totalOrders += 1;
            salesByMonth[monthYear].totalRevenue += sale.total;
        });
    
        const chartData = [];

        Object.keys(salesByMonth).forEach((monthYear) => {
            const { totalOrders, totalRevenue } = salesByMonth[monthYear];
            chartData.push({
                month: monthYear.split(' ')[0],
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue || 0
            });
        });

        console.log(chartData);

        months = [];
        odersByMonth = [];
        revnueByMonth = [];
        totalRevnue = 0;
        totalSales = 0;

        chartData.forEach((data) => {
            months.push(data.month);
            odersByMonth.push(data.totalOrders);
            revnueByMonth.push(data.totalRevenue);
            totalRevnue += Number(data.totalRevenue);
            totalSales += Number(data.totalOrders);
        });

        const thisMonthOrder = odersByMonth.length > 0 ? odersByMonth[odersByMonth.length - 1] : 0;
        const thisMonthSales = revnueByMonth.length > 0 ? revnueByMonth[revnueByMonth.length - 1] : 0;

        let bestSellings = await Product.find().sort({ bestSelling: -1 }).limit(5).lean();
        let popuarProducts = await Product.find().sort({ popularity: -1 }).limit(5).lean();
        let bestSellingCategory = await Category.find().sort({ bestSelling: -1 }).limit(5).lean();


        res.render('admin/dashBoard', {
            categoryCount,
            revnueByMonth,
            bestSellingCategory,
            bestSellings,
            popuarProducts,
            months,
            odersByMonth,
            totalRevnue,
            categoryRevenue,
            totalSales,
            thisMonthOrder,
            thisMonthSales,
            layout: 'adminLayout'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};



const getSales = async (req, res) => {
    const { stDate, edDate } = req.query;
    console.log(stDate, edDate);

    const startDate = new Date(stDate);
    const endDate = new Date(new Date(edDate).setHours(23, 59, 59, 999));
    try {
        const orders = await Order.find({
            date: {
                $gte: startDate,
                $lte: endDate,
            },
            status: 'Delivered'
        }).sort({ date: 'desc' });
        console.log(orders);

        const formattedOrders = orders.map((order) => ({
            date: moment(order.date).format('YYYY-MM-DD'),
            ...order._doc
        }));

        console.log(formattedOrders);

        let salesData = [];

        let grandTotal = 0;

        formattedOrders.forEach((element) => {
            salesData.push({
                date: element.date,
                orderId: element.orderId,
                total: element.total,
                payMethod: element.paymentMethod,
                coupon: element.coupon,           
                couponUsed: element.couponUsed,
                proName: element.product,
            });
            grandTotal += element.total;
        });

        const salesCount = salesData.length;

        console.log(grandTotal);

        res.json({
            grandTotal: grandTotal,
            salesCount: salesCount,
            orders: salesData,
        });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(HttpStatus.InternalServerError).send('Internal Server Error');
    }
};



module.exports = {
    loadDashboard,
    getSales,
};
