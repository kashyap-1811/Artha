const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    companyId: {
        type: String,
        required: true
    },
    budgetId: {
        type: String,
        required: true
    },
    allocationId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['THRESHOLD_ALERT', 'EXCEED_ALERT'],
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure we only send one notification of a specific type per allocation limit
notificationSchema.index({ allocationId: 1, type: 1 }, { unique: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
