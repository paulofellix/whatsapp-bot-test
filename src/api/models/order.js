const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    lead: {
        type: mongoose.Types.ObjectId,
        ref: 'Lead',
    },
    item: {
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    },
    address: Object
})

mongoose.model('Order', OrderSchema)