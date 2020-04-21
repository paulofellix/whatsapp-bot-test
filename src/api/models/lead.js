const mongoose = require('mongoose')

const LeadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    number: {
        type: String,
        required: true,
    },
    addresses: [{
        primary: Boolean,
        type: {
            type: String,
            enum: ['plain', 'point']
        },
        plain: String,
        coordinates: [Number]
    }],
    messages: [{
        date: Date,
        msg: String
    }],
    flow: {
        type: Object
    },
    lastAction: String,
    orders: [{
        id: {
            type: String,
            default: new mongoose.Types.ObjectId().toHexString()
        },
        date: Date,
        items: {
            item: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            quantity: Number
        }
    }]
})

mongoose.model('Lead', LeadSchema)