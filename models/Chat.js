const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'private';
        }
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: function() {
            return this.type === 'group';
        }
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    read: {
        type: Boolean,
        default: false
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    attachments: [{
        type: {
            type: String,
            enum: ['image', 'file']
        },
        url: String,
        name: String
    }]
}, {
    timestamps: true
});

// Index for faster querying of private messages
chatSchema.index({
    type: 1,
    sender: 1,
    recipient: 1,
    createdAt: -1
});

// Index for faster querying of group messages
chatSchema.index({
    type: 1,
    group: 1,
    createdAt: -1
});

module.exports = mongoose.model('Chat', chatSchema);
