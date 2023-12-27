const express = require("express");
const { open } = require("sqlite");
const { format } = require("date-fns");
const sqlite3 = require("sqlite3");
const path = require("path");
const databasePath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());
let database = null;
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error ${error.message}`);
  }
};
initializeDbAndServer();

const isValidDateFormat = (dateString) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

const validateInput = (request, response, next) => {
  const { status, priority, category, due_date } = request.query;
  if (status && !["TO DO", "DONE", "IN PROGRESS"].includes(status)) {
    return response.status(400).json({ error: "Invalid Todo Status" });
  }
  if (priority && !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    return response.status(400).json({ error: "Invalid Todo Priority" });
  }
  if (category && !["WORK", "HOME", "LEARNING"].includes(category)) {
    return response.status(400).json({ error: "Invalid Todo Category" });
  }
  if (due_date && !isValidDateFormat(due_date)) {
    return response.status(400).json({ error: "Invalid Due Date" });
  }

  next();
};
app.use(["/todos/", "/agenda/"], validateInput);

app.get("/todos/", async (req, res) => {
  const { status, priority, search_q, category } = req.query;
  let query = "SELECT * FROM todo WHERE 1";

  if (status) query += ` AND status = '${status}'`;
  if (priority) query += ` AND priority = '${priority}'`;
  if (search_q) query += ` AND todo LIKE '%${search_q}%'`;
  if (category) query += ` AND category = '${category}'`;

  const todos = await database.all(query);
  res.send(todos);
});

app.get("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;

  const todos = await database.get("SELECT * FROM todo WHERE id=?", [todoId]);
  res.send(todos);
});

app.get("/agenda/", async (req, res) => {
  const { date } = req.query;
  const formattedDate = format(new Date(date), "yyyy-MM-dd");
  const agenda = await database.all("SELECT * FROM todo WHERE due_date=?", [
    formattedDate,
  ]);
  res.send(agenda);
});

app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
  await database.run(
    "INSERT INTO todo (id,todo,priority,status,category,due_date) VALUES(?,?,?,?,?,?)",
    [id, todo, priority, status, category, dueDate]
  );
  res.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { status, priority, todo: newTodo, category, dueDate } = req.body;

  let updateColumn = "";

  if (status !== undefined) {
    updateColumn = "Status";
    await database.run("UPDATE todo SET status = ? WHERE id = ?", [
      status,
      todoId,
    ]);
  } else if (priority !== undefined) {
    updateColumn = "Priority";
    await database.run("UPDATE todo SET priority = ? WHERE id = ?", [
      priority,
      todoId,
    ]);
  } else if (newTodo !== undefined) {
    updateColumn = "Todo";
    await database.run("UPDATE todo SET todo = ? WHERE id = ?", [
      newTodo,
      todoId,
    ]);
  } else if (category !== undefined) {
    updateColumn = "Category";
    await database.run("UPDATE todo SET category = ? WHERE id = ?", [
      category,
      todoId,
    ]);
  } else if (dueDate !== undefined) {
    updateColumn = "Due Date";
    const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
    await database.run("UPDATE todo SET due_date = ? WHERE id = ?", [
      formattedDate,
      todoId,
    ]);
  }

  res.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;

  await database.run("DELETE FROM todo WHERE id = ?", [todoId]);

  res.send("Todo Deleted");
});
