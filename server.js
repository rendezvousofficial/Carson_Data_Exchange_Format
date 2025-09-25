const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");
const xml2js = require("xml2js");

const app = express();
const PORT = 3000;

// Database file path
//let currentDBFile = path.join(__dirname, "db_files", "db.json");
//let currentDBFile = path.join(__dirname, "db_files", "db.xml");
let currentDBFile = path.join(__dirname, "db_files", "db.yaml");
app.use(express.json());

// --- Utility: Check if file exists ---
async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

// --- Utility: Load DB - Updated for your nested structure ---
async function loadDB(file) {
  // Create directory if it doesn't exist
  const dir = path.dirname(file);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  if (!(await fileExists(file))) {
    // Create database with your exact nested structure
    const defaultDB = {
      "Library Management System": {
        "borrow": {
          "borrow_transactionid": "AB31D",
          "borrow_date": "Sept 15, 2023",
          "borrow_duedate": "Sept 25, 2023",
          "borrow_returndate": " ",
          "borrow_bookbatch": [
            {
              "batch_id": 10,
              "batch_books": {
                "books": [
                  {
                    "book_id": 1003,
                    "book_title": "Deep Work",
                    "book_authors": [
                      {
                        "Authors": [
                          {
                            "aut_id": 1,
                            "aut_firstname": "Cal",
                            "aut_lastname": "Newport"
                          },
                          {
                            "aut_id": 2,
                            "aut_firstname": "Ben",
                            "aut_lastname": "Horowitz"  
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "book_id": 1001,
                    "book_title": "Shoe Dog",
                    "book_authors": [
                      {
                        "Authors": [
                          {
                            "aut_id": 4,
                            "aut_firstname": "Nick",
                            "aut_lastname": "Bostrom"
                          },
                          {
                            "aut_id": 5,
                            "aut_firstname": "Jim",
                            "aut_lastname": "Bouton"
                          },
                          {
                            "aut_id": 6,
                            "aut_firstname": "Josh",
                            "aut_lastname": "Malerman"
                          },
                          {
                            "aut_id": 7,
                            "aut_firstname": "Rober",
                            "aut_lastname": "Kiyosaki"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "book_id": 1002,
                    "book_title": "The Hard Thing About Hard Things",
                    "book_authors": [
                      {
                        "Authors": [
                          {
                            "aut_id": 3,
                            "aut_firstname": "Phil",
                            "aut_lastname": "Knight"
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              "batch_studentid": {
                "Student": [
                  {
                    "stud_id": "STUD-21378",
                    "stud_firstname": "JUAN",
                    "stud_middlename": "NAVARRO",
                    "stud_lastname": "DELA CRUZ",
                    "stud_address": "MALAYBALAY CITY, BUKIDNON",
                    "stud_gender": "MALE",
                    "stud_age": 20
                  }
                ]
              }
            }
          ],
          "borrow_fines": null,
          "borrow_status": "Not Yet Returned"
        }
      }
    };
    await saveDB(file, defaultDB);
    return defaultDB;
  }

  const data = await fs.readFile(file, "utf-8");
  const ext = path.extname(file);

  if (ext === ".json") {
    return JSON.parse(data);
  } else if (ext === ".yml" || ext === ".yaml") {
    return yaml.load(data);
  } else if (ext === ".xml") {
    const parser = new xml2js.Parser({
      explicitArray: true,
      explicitRoot: false,
      mergeAttrs: true,
    });
    const result = await parser.parseStringPromise(data);
    return result;
  } else {
    throw new Error("Unsupported file format");
  }
}

// --- Utility: Save DB ---
async function saveDB(file, data) {
  const ext = path.extname(file);

  if (ext === ".json") {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  } else if (ext === ".yml" || ext === ".yaml") {
    await fs.writeFile(file, yaml.dump(data));
  } else if (ext === ".xml") {
    const builder = new xml2js.Builder({ rootName: "database" });
    const xml = builder.buildObject(data);
    await fs.writeFile(file, xml);
  } else {
    throw new Error("Unsupported file format");
  }
}

// --- GET the entire library data ---
app.get("/", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET borrow data (root level) ---
app.get("/borrow", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    res.json({
      success: true,
      data: borrowData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET book batches with books ---
app.get("/book_batches/books", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    const bookBatches = borrowData.borrow_bookbatch.map(batch => {
      return {
        batch_id: batch.batch_id,
        books: batch.batch_books.books.map(book => ({
          book_id: book.book_id,
          book_title: book.book_title,
          authors: book.book_authors[0].Authors.map(author => ({
            aut_id: author.aut_id,
            name: `${author.aut_firstname} ${author.aut_lastname}`
          }))
        })),
        student: batch.batch_studentid.Student[0]
      };
    });

    res.json({
      success: true,
      data: bookBatches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET all authors ---
app.get("/book_batches/aut_id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    // Extract all unique authors from all books
    const allAuthors = [];
    const seenAuthors = new Set();

    borrowData.borrow_bookbatch.forEach(batch => {
      batch.batch_books.books.forEach(book => {
        book.book_authors.forEach(authorGroup => {
          authorGroup.Authors.forEach(author => {
            const authorKey = `${author.aut_id}-${author.aut_firstname}-${author.aut_lastname}`;
            if (!seenAuthors.has(authorKey)) {
              seenAuthors.add(authorKey);
              allAuthors.push({
                aut_id: author.aut_id,
                aut_firstname: author.aut_firstname,
                aut_lastname: author.aut_lastname,
                full_name: `${author.aut_firstname} ${author.aut_lastname}`
              });
            }
          });
        });
      });
    });

    res.json({
      success: true,
      count: allAuthors.length,
      data: allAuthors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET specific batch by ID ---
app.get("/book_batches/:batch_id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    const { batch_id } = req.params;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    const batch = borrowData.borrow_bookbatch.find(b => b.batch_id == batch_id);
    
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    res.json({
      success: true,
      data: batch
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET all books ---
app.get("/books", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    const allBooks = [];
    borrowData.borrow_bookbatch.forEach(batch => {
      batch.batch_books.books.forEach(book => {
        allBooks.push({
          book_id: book.book_id,
          book_title: book.book_title,
          authors: book.book_authors[0].Authors
        });
      });
    });

    res.json({
      success: true,
      count: allBooks.length,
      data: allBooks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET all students ---
app.get("/students", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const borrowData = db["Library Management System"]?.borrow;
    
    if (!borrowData) {
      return res.status(404).json({ error: "Borrow data not found" });
    }

    const allStudents = [];
    borrowData.borrow_bookbatch.forEach(batch => {
      batch.batch_studentid.Student.forEach(student => {
        allStudents.push(student);
      });
    });

    res.json({
      success: true,
      count: allStudents.length,
      data: allStudents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST new book to a batch ---
app.post("/book_batches/:batch_id/books", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { batch_id } = req.params;
    const newBook = req.body;
    
    const batch = db["Library Management System"].borrow.borrow_bookbatch
      .find(b => b.batch_id == batch_id);
    
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Add the new book to the batch
    batch.batch_books.books.push(newBook);
    await saveDB(currentDBFile, db);

    res.status(201).json({
      success: true,
      data: newBook
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`- GET http://localhost:${PORT}/ (complete database)`);
  console.log(`- GET http://localhost:${PORT}/borrow (borrow data)`);
  console.log(`- GET http://localhost:${PORT}/book_batches/books (books with batches)`);
  console.log(`- GET http://localhost:${PORT}/book_batches/aut_id (all authors)`);
  console.log(`- GET http://localhost:${PORT}/book_batches/10 (specific batch)`);
  console.log(`- GET http://localhost:${PORT}/books (all books)`);
  console.log(`- GET http://localhost:${PORT}/students (all students)`);
});