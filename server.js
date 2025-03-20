const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    setTimeout(connectDB, 5000);
  }
};

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

const startServer = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Connect to MongoDB
startServer();

// Todo Schema
const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Todo = mongoose.model('Todo', todoSchema);

// Routes
app.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.q || '';

    // Build the query
    const query = searchQuery
      ? { title: { $regex: searchQuery, $options: 'i' } }
      : {};

    const todos = await Todo.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Todo.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.render('index', {
      todos,
      currentPage: page,
      totalPages,
      messages: req.query.message ? [req.query.message] : [],
      searchQuery
    });
  } catch (error) {
    console.error('Error:', error);
    res.render('index', { 
      todos: [], 
      currentPage: 1, 
      totalPages: 1,
      messages: ['Error fetching todos'],
      searchQuery: ''
    });
  }
});

app.post('/todos', async (req, res) => {
  try {
    const todo = new Todo({
      title: req.body.title,
      description: req.body.description
    });
    await todo.save();
    res.redirect('/?message=Todo created successfully');
  } catch (error) {
    res.redirect('/?message=Error creating todo');
  }
});

app.post('/todos/:id/toggle', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    todo.completed = !todo.completed;
    await todo.save();
    res.redirect('/?message=Todo updated successfully');
  } catch (error) {
    res.redirect('/?message=Error updating todo');
  }
});

app.post('/todos/:id/delete', async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    res.redirect('/?message=Todo deleted successfully');
  } catch (error) {
    res.redirect('/?message=Error deleting todo');
  }
});

app.get('/todos/:id/edit', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    res.render('edit', { todo });
  } catch (error) {
    res.redirect('/?message=Error loading todo');
  }
});

app.post('/todos/:id/edit', async (req, res) => {
  try {
    await Todo.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      description: req.body.description
    });
    res.redirect('/?message=Todo updated successfully');
  } catch (error) {
    res.redirect('/?message=Error updating todo');
  }
});

// For Vercel deployment
const PORT = process.env.PORT || 3001;

// Export the Express app for Vercel
module.exports = app; 