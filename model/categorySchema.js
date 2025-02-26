const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
 
    category: {
        type: String,
        required: true
    },

    imageUrl:{
        type: String,
        required: true
    },

    isListed:{
        type:Boolean,
        default:true
    }
},{timestamps:true})


const Category = mongoose.model('category', categorySchema); 

module.exports = Category; 


