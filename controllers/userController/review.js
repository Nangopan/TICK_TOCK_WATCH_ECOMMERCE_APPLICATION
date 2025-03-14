const User = require('../../model/userSchema')
const Product = require('../../model/productSchema')
const Review = require('../../model/reviewSchema')

const mongoose = require('mongoose');
//const ObjectId = mongoose.Types.ObjectId;


const addNewReviewPost= async(req, res) => {
    try {
        const userData = req.session.user
        const id       = userData._id
        
        const review = new Review({
            userId      : id,
            productId   : req.body.proId,
            name        : req.body.name,
            // rating      : req.body.rating,
            comment     : req.body.comment, 
            email       : req.body.email,
            // date        : Date.now, 
            rating: req.body.rating,
            is_default  : false,
        })

        const reviewData = await review.save()
        console.log(reviewData)
        res.redirect(`/productview?id=${req.body.proId}`)
       
    } catch (error) {
        console.log(error);
    }
}


const editReview = async (req, res) => {
    try {

        const id = req.params.id

        const review = await Review.findById(id);
        const reviewObject = review.toObject();
        console.log(review)

        res.render('/',{ res: reviewObject })
    } catch (error) {
        console.log(error);
    }
}


const  editReviewPost = async (req, res) => {
    try {

        const id = req.params.id

        await Address.findByIdAndUpdate(id, {$set:{
            userId      : id,
            name        : req.body.name,
            rating      : req.body.rating,
            comment     : req.body.comment, 
            date        : Date.now, 
            is_default  : false,
        }}, {new : true})

        res.redirect('/')
        
        // Find user addresses
        // const userAddresses = await Address.find({ userId: id }).lean();
        // res.render('user/editAddress')
    } catch (error) {
        console.log(error);
    }
}

module.exports={
    editReviewPost,editReview,addNewReviewPost
}

