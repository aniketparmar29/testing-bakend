const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const port = 4000;
const cors = require('cors');
const dotenv = require("dotenv");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config({path:"./config.env"})

// app.use(cors({
//   origin: ['https://hathibrand.in/','http://localhost:3000'],
//   credentials: true,
// }));




app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




const pool = mysql.createPool({
connectionLimit: 100,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'https://hathibrand.in');
//   next();
// });






pool.getConnection(function(err, connection) {
    if (err) throw err;
  
    // Use the connection
    connection.query('SELECT * FROM products', function (error, results, fields) {
      // Release the connection back to the pool
      connection.release();
  
      if (error) throw error;
  
      // Do something with the results
      console.log("connection to mysql");
    });
  });

  //create product
  app.post('/products/new',(req, res) => {

    console.log('Request Body:', req.body);

    const { name, price, stock,image,weight,Category } = req.body;
    const date = Date.now();
    console.log(date)
    if (!name || !price || !stock || !image || !weight || !Category) { // check if any required field is missing
      res.status(400).send('Missing required fields');
      return;
    }
  
    pool.query('INSERT INTO `products` (`name`, `price`, `image`, `date`, `stock`,`weight`,`Category`) VALUES (?, ?, ?, ?, ?, ?)',
  [name, price, image, date, stock,weight,Category],
  (err, result) => {
    if (err) {
      console.error('Error creating product:', err);
      res.sendStatus(500);
      return;
    }
    console.log('Product created:', result);
    res.sendStatus(201);
  }
);

  });

//single product

app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  pool.query('SELECT `id`, `name`, `price`, `image`, `date`, `stock`, `weight`, `Category`, `reviews` FROM `products` WHERE `id` = ?', [productId], (err, results) => {
    if (err) {
      console.error('Error retrieving product:', err);
      res.sendStatus(500);
      return;
    }
    if (results.length === 0) {
      res.sendStatus(404); // return a 404 status code if the product is not found
      return;
    }
    res.json(results[0]); // return the first product in the array
  });
});



  ///update product
  app.put('/products/:id', (req, res) => {
    const id = req.params.id;
    console.log(req.params.id)
    const { name, price, stock, image, weight, category,reviews } = req.body;
    
    if (!name || !price || !stock || !image || !weight || !category || !reviews) { // check if any required field is missing
      res.status(400).send('Missing required fields');
      return;
    }
  
    let updateFields = '';
    const updateParams = [];
    
    if (name) {
      updateFields += 'name = ?, ';
      updateParams.push(name);
    }
    if (price) {
      updateFields += 'price = ?, ';
      updateParams.push(price);
    }
    if (image) {
      updateFields += 'image = ?, ';
      updateParams.push(image);
    }
    if (date) {
      updateFields += 'date = ?, ';
      updateParams.push(date);
    }
    if (stock) {
      updateFields += 'stock = ?, ';
      updateParams.push(stock);
    }
    if (weight) {
      updateFields += 'weight = ?, ';
      updateParams.push(weight);
    }
    if (category) {
      updateFields += 'category = ?, ';
      updateParams.push(category);
    }
    if (reviews) {
      updateFields += 'reviews = ?, ';
      updateParams.push(reviews);
    }
  
    // remove trailing comma
    updateFields = updateFields.slice(0, -2);
  
    // add id to the update params
    updateParams.push(id);
  
    const query = `UPDATE products SET ${updateFields} WHERE id = ?`;
  
    pool.query(query, updateParams, (err, result) => {
      if (err) {
        console.error('Error updating product:', err);
        res.sendStatus(500);
        return;
      }
      console.log('Product updated:', result);
      res.sendStatus(200);
    });
  });
  

  //get all products
  app.get('/products', (req, res) => {
    const { sort } = req.query;
  
    let order = '';
    if (sort === 'desc') {
      order = 'ORDER BY price DESC';
    } else if (sort === 'asc') {
      order = 'ORDER BY price ASC';
    } else if (sort === 'atoz') {
      order = 'ORDER BY name ASC';
    } else if (sort === 'ztoa') {
      order = 'ORDER BY name DESC';
    }
  
    pool.query(`SELECT * FROM products ${order}`, (err, results) => {
      if (err) {
        console.error('Error retrieving products:', err);
        res.sendStatus(500);
        return;
      }
      res.json(results);
    });
  });
  
//serach product
app.get('/search', (req, res) => {
  const { query } = req.query;
  pool.query(`SELECT * FROM products WHERE name LIKE '%${query}%'`, (err, results) => {
    if (err) {
      console.error('Error searching for products:', err);
      res.sendStatus(500);
      return;
    }
    res.json(results);
  });
  
  
});


// delete prodocut

app.delete('/products/:id', (req, res) => {
  const productId = req.params.id;

  pool.query('DELETE FROM `products` WHERE `id` = ?', [productId], (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      res.sendStatus(500,"there is some error");
      return;
    }
    res.sendStatus(200,"product deleted");
  });
});

// Register route
app.post('/register', (req, res) => {
  console.log(req.body)
  const { email, password, name} = req.body;

  // Hash password using bcrypt
  const saltRounds = 10;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      res.sendStatus(500);
      return;
    }

    const role="user"
    const orders="0";
    // Insert new user into MySQL database
    const sql = 'INSERT INTO users (email, password, name, role, orders) VALUES (?, ?, ?, ?, ?)';
    const values = [email, hash, name, role, orders];
    pool.query(sql, values, (error, results) => {
      if (error) {
        console.error('Error inserting user into database:', error);
        res.sendStatus(500);
        return;
      }

      // Generate token for user
      const token = generateToken(results.insertId);

      // Set token as cookie in response
      res.cookie('token', token);

      // Send success response
      res.send('User registered successfully');
    });
  });
});


// Login route
app.post('/login', (req, res) => {
  console.log(req.body)
  const { email, password } = req.body;

  // Retrieve user from MySQL database by email
  const sql = 'SELECT * FROM users WHERE email = ?';
  const values = [email];
  pool.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error retrieving user from database:', error);
      res.sendStatus(500);
      return;
    }

    if (results.length === 0) {
      res.sendStatus(401);
      return;
    }

    // Compare password with hashed password using bcrypt
    const user = results[0];
    console.log(password,user.password)

    try {
  bcrypt.compare(password, user.password, (err, passwordMatch) => {
    if (err || !passwordMatch) {
      console.error('Error comparing password:', err);
      res.sendStatus(401);
      return;
    }

      // Generate token for user
      const token = generateToken(user.id);

      // Set token as cookie in response
      res.cookie('token', token);

      // Send success response with user data and token
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      });
    });
} catch (err) {
  console.error('Error during bcrypt.compare:', err);
  res.sendStatus(500);
}
  });
});

//delete user
app.delete('/user/:id', (req, res) => {
  const userid = req.params.id;

  pool.query('DELETE FROM `users` WHERE `id` = ?', [userid], (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      res.sendStatus(500,"there is some error");
      return;
    }
    res.sendStatus(200,"product deleted");
  });
});

//single user
app.get('/user/:id', (req, res) => {
  const userid = req.params.id;
  pool.query('SELECT `id`, `name`, `email`, `password`, `role`, `orders` FROM `users` WHERE `id` = ?', [userid], (err, results) => {
    if (err) {
      console.error('Error retrieving product:', err);
      res.sendStatus(500);
      return;
    }
    if (results.length === 0) {
      res.sendStatus(404); // return a 404 status code if the product is not found
      return;
    }
    res.json(results[0]); // return the first product in the array
  });
});

//get all users

app.get('/users', (req, res) => {
  const { sort } = req.query;

  let order = '';
  if(sort === 'atoz') {
    order = 'ORDER BY name ASC';
  } else if (sort === 'ztoa') {
    order = 'ORDER BY name DESC';
  }

  pool.query(`SELECT * FROM users ${order}`, (err, results) => {
    if (err) {
      console.error('Error retrieving users:', err);
      res.sendStatus(500);
      return;
    }
    res.json(results);
  });
});



//order

app.post('/orders', (req, res) => {
  const { paymentOption, address, productIds } = req.body;

  // Get the user ID from the authenticated user's JWT token
  const userId = getUserIdFromToken(req.cookies.token);

  // Start a transaction to create the new order
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err);
      res.sendStatus(500);
      return;
    }

    connection.beginTransaction((err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        res.sendStatus(500);
        return;
      }

      // Insert the new order into the orders table
      const orderSql = 'INSERT INTO orders (payment_option, address, user_id) VALUES (?, ?, ?)';
      const orderValues = [paymentOption, address, userId];
      connection.query(orderSql, orderValues, (error, results) => {
        if (error) {
          console.error('Error inserting new order:', error);
          connection.rollback();
          res.sendStatus(500);
          return;
        }

        const orderId = results.insertId;

        // Insert the product IDs into the order_items table
        const orderItemsSql = 'INSERT INTO order_items (order_id, product_id) VALUES (?, ?)';
        const orderItemsValues = productIds.map(productId => [orderId, productId]);
        connection.query(orderItemsSql, orderItemsValues, (error, results) => {
          if (error) {
            console.error('Error inserting order items:', error);
            connection.rollback();
            res.sendStatus(500);
            return;
          }

          // Commit the transaction and send the response
          connection.commit((err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              connection.rollback();
              res.sendStatus(500);
              return;
            }

            res.json({ message: 'Order created successfully' });
          });
        });
      });
    });

    connection.release();
  });
});

//Reviews

app.post('/products/:id/reviews', (req, res) => {
  console.log(req.body)
  const { name, review, rating } = req.body;
  const productId = req.params.id;
  const reviewObj = { name, review, rating };
  
  pool.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving product from database');
    } else if (results.length === 0) {
      res.status(404).send(`Product with ID ${productId} not found`);
    } else {
      const product = results[0];
      const reviews = JSON.parse(product.reviews || '[]');
      reviews.push(reviewObj);
      
      pool.query('UPDATE products SET reviews = ? WHERE id = ?', [JSON.stringify(reviews), productId], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error updating product reviews in database');
        } else {
          res.status(200).send('Product reviews updated successfully');
        }
      });
    }
  });
});


// Generate token function
function generateToken(userId) {
  const token = jwt.sign({ userId }, 'secret_key', { expiresIn: '1h' });
  return token;
}


const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('Unhandled exception:', err);
  // gracefully shutdown the server
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  // gracefully shutdown the server
  server.close(() => {
    process.exit(1);
  });
});