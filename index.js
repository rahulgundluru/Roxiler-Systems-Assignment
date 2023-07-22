const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const app = express();

app.use(express.json());

const databasePath = './database.db'; // Path to the SQLite database file

let database = null;

// Function to initialize the database
const initializeDatabase = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    // Create the necessary table(s) for the database
    await database.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        title TEXT,
        price REAL,
        description TEXT,
        category TEXT,
        image TEXT,
        sold BOOLEAN,
        dateOfSale TEXT
      )
    `);

    console.log('Database initialized.');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  }
};

// Sample JSON data
const productsData = [
  {
    "id": 1,
    "title": "Fjallraven  Foldsack No 1 Backpack Fits 15 Laptops",
    "price": 329.85,
    "description": "Your perfect pack for everyday use and walks in the forest. Stash your laptop up to 15 inches in the padded sleeve your everyday",
    "category": "men's clothing",
    "image": "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg",
    "sold": false,
    "dateOfSale": "2021-11-27T20:29:54+05:30"
  },
  {
    "id": 2,
    "title": "Mens Casual Premium Slim Fit TShirts ",
    "price": 44.6,
    "description": "Slimfitting style contrast raglan long sleeve threebutton henley placket light weight  soft fabric for breathable and comfortable wearing. And Solid stitched shirts with round neck made for durability and a great fit for casual fashion wear and diehard baseball fans. The Henley style round neckline includes a threebutton placket.",
    "category": "men's clothing",
    "image": "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg",
    "sold": false,
    "dateOfSale": "2021-10-27T20:29:54+05:30"
  },
  {
    "id": 3,
    "title": "Mens Cotton Jacket",
    "price": 615.89,
    "description": "great outerwear jackets for SpringAutumnWinter suitable for many occasions such as working hiking camping mountainrock climbing cycling traveling or other outdoors. Good gift choice for you or your family member. A warm hearted love to Father husband or son in this thanksgiving or Christmas Day.",
    "category": "men's clothing",
    "image": "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_.jpg",
    "sold": true,
    "dateOfSale": "2022-07-27T20:29:54+05:30"
  }
];

// Function to insert product data into the database
const insertProductsDataIntoDatabase = async () => {
  try {
    const apiUrl = 'https://s3.amazonaws.com/roxiler.com/product_transaction.json';
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const transactions = response.data;
      const insertQuery = `
        INSERT INTO products (id, title, price, description, category, image, sold, dateOfSale)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const product of productsData) {
            await database.run(insertQuery, [
                product.id,
                product.title,
                product.price,
                product.description,
                product.category,
                product.image,
                product.sold,
                product.dateOfSale,
        ]);
        }

        console.log('Product data inserted into the database.');
    }
    }    catch (error) {
    console.error('Error inserting product data:', error.message);
   }
};

// Initialize the database and insert product data
initializeDatabase();
insertProductsDataIntoDatabase();



// API 1: Statistics for the selected month
app.get('/statistics', async (req, res) => {
    try {
      const { month } = req.query;
      const totalSaleAmountQuery = 'SELECT SUM(price) AS totalSaleAmount FROM products WHERE strftime("%m", dateOfSale) = ?';
      const totalSoldItemsQuery = 'SELECT COUNT(*) AS totalSoldItems FROM products WHERE strftime("%m", dateOfSale) = ? AND sold = 1';
      const totalNotSoldItemsQuery = 'SELECT COUNT(*) AS totalNotSoldItems FROM products WHERE strftime("%m", dateOfSale) = ? AND sold = 0';
  
      const [totalSaleAmountResult, totalSoldItemsResult, totalNotSoldItemsResult] = await Promise.all([
        database.get(totalSaleAmountQuery, [month]),
        database.get(totalSoldItemsQuery, [month]),
        database.get(totalNotSoldItemsQuery, [month]),
      ]);
  
      const statistics = {
        totalSaleAmount: totalSaleAmountResult.totalSaleAmount || 0,
        totalSoldItems: totalSoldItemsResult.totalSoldItems || 0,
        totalNotSoldItems: totalNotSoldItemsResult.totalNotSoldItems || 0,
      };
  
      res.json(statistics);
    } catch (error) {
      console.error('Error retrieving statistics:', error.message);
      res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
  });
  
  // API 2: Bar chart data for the selected month
  app.get('/bar-chart', async (req, res) => {
    try {
      const { month } = req.query;
      const priceRanges = [
        { min: 0, max: 100 },
        { min: 101, max: 200 },
        { min: 201, max: 300 },
        { min: 301, max: 400 },
        { min: 401, max: 500 },
        { min: 501, max: 600 },
        { min: 601, max: 700 },
        { min: 701, max: 800 },
        { min: 801, max: 900 },
        { min: 901, max: Infinity },
      ];
  
      const barChartData = [];
      for (const range of priceRanges) {
        const { min, max } = range;
        const query = 'SELECT COUNT(*) AS count FROM products WHERE strftime("%m", dateOfSale) = ? AND price >= ? AND price <= ?';
        const result = await database.get(query, [month, min, max]);
        barChartData.push({
          priceRange: `${min} - ${max}`,
          count: result.count || 0,
        });
      }
  
      res.json(barChartData);
    } catch (error) {
      console.error('Error retrieving bar chart data:', error.message);
      res.status(500).json({ error: 'Failed to fetch bar chart data.' });
    }
  });
  
  // API 3: Pie chart data for the selected month
  app.get('/pie-chart', async (req, res) => {
    try {
      const { month } = req.query;
      const query = 'SELECT category, COUNT(*) AS count FROM products WHERE strftime("%m", dateOfSale) = ? GROUP BY category';
      const pieChartData = await database.all(query, [month]);
      res.json(pieChartData);
    } catch (error) {
      console.error('Error retrieving pie chart data:', error.message);
      res.status(500).json({ error: 'Failed to fetch pie chart data.' });
    }
  });
  
  // API 4: Combine data from all APIs
  app.get('/combined-data', async (req, res) => {
    try {
      const { month } = req.query;
      const [statistics, barChartData, pieChartData] = await Promise.all([
        axios.get(`http://localhost:3000/statistics?month=${month}`),
        axios.get(`http://localhost:3000/bar-chart?month=${month}`),
        axios.get(`http://localhost:3000/pie-chart?month=${month}`),
      ]);
  
      const combinedData = {
        statistics: statistics.data,
        barChartData: barChartData.data,
        pieChartData: pieChartData.data,
      };
  
      res.json(combinedData);
    } catch (error) {
      console.error('Error combining data:', error.message);
      res.status(500).json({ error: 'Failed to combine data.' });
    }
  });
  

// Start the server
const port = 2000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

