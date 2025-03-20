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

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/todo-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 