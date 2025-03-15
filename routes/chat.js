const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Group = require('../models/Group');

// Get chat page with contacts and groups
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // Get user's contacts with unread message count
        const contacts = await User.aggregate([
            {
                $match: {
                    _id: { $ne: req.user._id },
                    interests: { $in: req.user.interests }
                }
            },
            {
                $lookup: {
                    from: 'chats',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$type', 'private'] },
                                        {
                                            $or: [
                                                { $eq: ['$sender', '$$userId'] },
                                                { $eq: ['$recipient', '$$userId'] }
                                            ]
                                        },
                                        { $eq: ['$recipient', req.user._id] },
                                        { $eq: ['$read', false] }
                                    ]
                                }
                            }
                        },
                        { $count: 'unread' }
                    ],
                    as: 'unreadMessages'
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ['$unreadMessages.unread', 0] }, 0]
                    }
                }
            },
            {
                $project: {
                    username: 1,
                    profilePicture: 1,
                    interests: 1,
                    unreadCount: 1
                }
            }
        ]);

        // Get user's eco groups
        const groups = await Group.aggregate([
            {
                $match: {
                    members: req.user._id,
                    category: 'eco'
                }
            },
            {
                $lookup: {
                    from: 'chats',
                    let: { groupId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$type', 'group'] },
                                        { $eq: ['$group', '$$groupId'] },
                                        { $not: { $in: [req.user._id, '$readBy'] } }
                                    ]
                                }
                            }
                        },
                        { $count: 'unread' }
                    ],
                    as: 'unreadMessages'
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ['$unreadMessages.unread', 0] }, 0]
                    },
                    memberCount: { $size: '$members' }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    icon: 1,
                    memberCount: 1,
                    unreadCount: 1
                }
            }
        ]);

        res.render('chat', {
            title: 'EcoChat',
            user: req.user,
            contacts: contacts,
            groups: groups
        });
    } catch (err) {
        console.error('Error loading chat:', err);
        req.flash('error_msg', 'Error loading chat');
        res.redirect('/feed');
    }
});

// Get chat history with a user
router.get('/history/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const messages = await Chat.find({
            type: 'private',
            $or: [
                { sender: req.user._id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user._id }
            ]
        })
        .populate('sender', 'username profilePicture')
        .sort('createdAt')
        .limit(50);

        // Mark messages as read
        await Chat.updateMany(
            {
                type: 'private',
                sender: req.params.userId,
                recipient: req.user._id,
                read: false
            },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Error fetching chat history' });
    }
});

// Get group chat history
router.get('/group/:groupId', ensureAuthenticated, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group || !group.members.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        const messages = await Chat.find({
            type: 'group',
            group: req.params.groupId
        })
        .populate('sender', 'username profilePicture')
        .sort('createdAt')
        .limit(50);

        // Mark messages as read
        await Chat.updateMany(
            {
                type: 'group',
                group: req.params.groupId,
                readBy: { $ne: req.user._id }
            },
            { $addToSet: { readBy: req.user._id } }
        );

        res.json(messages);
    } catch (err) {
        console.error('Error fetching group chat:', err);
        res.status(500).json({ error: 'Error fetching group chat' });
    }
});

// Send private message
router.post('/send/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const message = new Chat({
            type: 'private',
            sender: req.user._id,
            recipient: req.params.userId,
            content: content.trim()
        });

        await message.save();
        await message.populate('sender', 'username profilePicture');
        
        // Emit message through socket.io
        req.app.get('io').to(req.params.userId).emit('private_message', message);
        
        res.json(message);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Error sending message' });
    }
});

// Send group message
router.post('/group/:groupId', ensureAuthenticated, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group || !group.members.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const message = new Chat({
            type: 'group',
            sender: req.user._id,
            group: req.params.groupId,
            content: content.trim(),
            readBy: [req.user._id]
        });

        await message.save();
        await message.populate('sender', 'username profilePicture');
        
        // Emit message through socket.io
        req.app.get('io').to(`group_${req.params.groupId}`).emit('group_message', message);
        
        res.json(message);
    } catch (err) {
        console.error('Error sending group message:', err);
        res.status(500).json({ error: 'Error sending group message' });
    }
});

module.exports = router;
