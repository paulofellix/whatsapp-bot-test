const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
    brand: String,
    name: String,
    value: Number,
    type: String
})

mongoose.model('Product', ProductSchema)