const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");
const xml2js = require("xml2js");

const app = express();
const PORT = 3000;

// Choose which DB file to use: "db.json", "db.yml", or "db.xml"
//let currentDBFile = path.join(__dirname, "db_files", "db.json");
 let currentDBFile = path.join(__dirname, "db_files", "db.yml");
// let currentDBFile = path.join(__dirname, "db_files", "db.xml");

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

// --- Utility: Load DB ---
async function loadDB(file) {
  if (!(await fileExists(file))) {
    throw new Error(`Database file not found: ${file}`);
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

    // Normalize so that db[collection] is always an array
    for (const key of Object.keys(result)) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }
    }
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

// --- GET all items from a collection ---
app.get("/:collection", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    res.json(db[collection]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- GET single item by ID ---
app.get("/:collection/:id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection, id } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    const item = db[collection].find((i) => i.id == id);
    if (!item) return res.status(404).send("Item not found");

    res.json(item);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- POST new item (auto-increment ID) ---
app.post("/:collection", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    const newItem = req.body;
    const maxId =
      db[collection].length > 0
        ? Math.max(...db[collection].map((i) => i.id))
        : 0;
    newItem.id = maxId + 1;

    db[collection].push(newItem);
    await saveDB(currentDBFile, db);

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- PUT update item by ID (replace) ---
app.put("/:collection/:id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection, id } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    const index = db[collection].findIndex((i) => i.id == id);
    if (index === -1) return res.status(404).send("Item not found");

    db[collection][index] = { ...req.body, id: parseInt(id) };

    await saveDB(currentDBFile, db);

    res.json(db[collection][index]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- PATCH update item by ID (partial update) ---
app.patch("/:collection/:id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection, id } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    const index = db[collection].findIndex((i) => i.id == id);
    if (index === -1) return res.status(404).send("Item not found");

    db[collection][index] = {
      ...db[collection][index],
      ...req.body,
      id: parseInt(id),
    };

    await saveDB(currentDBFile, db);

    res.json(db[collection][index]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- DELETE item by ID ---
app.delete("/:collection/:id", async (req, res) => {
  try {
    const db = await loadDB(currentDBFile);
    const { collection, id } = req.params;

    if (!db[collection]) return res.status(404).send("Collection not found");

    const index = db[collection].findIndex((i) => i.id == id);
    if (index === -1) return res.status(404).send("Item not found");

    const deleted = db[collection].splice(index, 1);
    await saveDB(currentDBFile, db);

    res.json(deleted[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
