const express = require('express');
const multer = require('multer');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const cors = require('cors');
const dotenv = require("dotenv");

dotenv.config({path:"./config.env"})

app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  });
  const upload = multer({ storage: storage });


const pool = mysql.createPool({
connectionLimit: 10,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

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
  app.post('/products/new', upload.single('image'), (req, res) => {

    console.log('Request Body:', req.body);

    const { name, price, stock, image } = req.body;
    const date = Date.now();
    console.log(date)
    if (!name || !price || !stock || !image) { // check if any required field is missing
        res.status(400).send('Missing required fields');
        return;
    }

    pool.query('INSERT INTO `products` (`name`, `price`, `image`, `date`, `stock`) VALUES (?, ?, ?, ?, ?)',
        [name, price, image, date, stock],
        (err, result) => {
            if (err) {
                console.error('Error creating product:', err);
                res.sendStatus(500);
                return;
            }
            console.log('Product created:', result);

            // set CORS headers
            res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5501');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            res.sendStatus(201);
        }
    );
});


//single product

app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  pool.query('SELECT `id`, `name`, `price`, `image`, `date`, `stock` FROM `products` WHERE `id` = ?', [productId], (err, results) => {
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
  app.put('/products/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    console.log(req.params.id)
    const { name, price, stock, date } = req.body;
    const imageUrl = req.file ? req.file.path : null; // check if file was uploaded
    
    if (!name || !price || !stock || !date) { // check if any required field is missing
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
    if (imageUrl) {
      updateFields += 'image = ?, ';
      updateParams.push(imageUrl);
    }
    if (date) {
      updateFields += 'date = ?, ';
      updateParams.push(date);
    }
    if (stock) {
      updateFields += 'stock = ?, ';
      updateParams.push(stock);
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
    pool.query('SELECT * FROM products', (err, results) => {
      if (err) {
        console.error('Error retrieving products:', err);
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


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
