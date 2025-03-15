const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const { Server } = require('socket.io');
const http = require('http');
const expressLayouts = require('express-ejs-layouts');
dotenv.config({ path: './config.env' });


const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.set('io', io);


require('./config/passport')(passport);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Express Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Express Session
const store = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  touchAfter : 24 * 3600,
});
app.use(session({
  store: store,
  secret: process.env.JWT_SECRET || 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash Messages
app.use(flash());

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.currentUser = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Wrap socket handling in session middleware
  const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
  io.use(wrap(session({ 
    secret: process.env.JWT_SECRET || 'secret',
    resave: true,
    saveUninitialized: true 
  })));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  
  if (socket.request.session.passport?.user) {
    const userId = socket.request.session.passport.user;
    socket.join(userId.toString());
    // Emit user status
    io.emit('user_status', { 
      userId: userId,
      status: 'online'
    });
  }

  
  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('leave_room', (room) => {
    socket.leave(room);
  });

  
  socket.on('private_message', (data) => {
    io.to(data.recipient).emit('receive_message', {
      sender: data.sender,
      content: data.content,
      timestamp: new Date()
    });
  });

  
  socket.on('group_message', (data) => {
    io.to(`group_${data.groupId}`).emit('receive_message', {
      sender: data.sender,
      content: data.content,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Routes
app.use('/profile', require('./routes/profile')); 
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/posts', require('./routes/posts'));
app.use('/marketplace', require('./routes/marketplace'));
app.use('/volunteers', require('./routes/volunteers'));
app.use('/chat', require('./routes/chat'));
app.use('/groups', require('./routes/groups'));

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
