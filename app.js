const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

// Resister a new user

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const userSelectQuery = `
    SELECT
    *
    FROM
    user
    WHERE username = '${username}';
    `;
  const dbUser = await db.get(userSelectQuery);

  if (dbUser === undefined) {
    // Create new user
    if (password.length < 5) {
      //registrant provides a password with less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      //Successful registration of the registrant
      const createUserQuery = `
                INSERT INTO
                user (username, name, password, gender, location)
                VALUES
                (
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                );`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    //Username already exists
    response.status(400);
    response.send("User already exists");
  }
});

// User login

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userLoginQuery = `
    SELECT 
    * 
    FROM
    user
    WHERE 
    username = '${username}';`;
  const dbUser = await db.get(userLoginQuery);
  if (dbUser === undefined) {
    // User not registered
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      // valid user
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change user password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userLoginQuery = `
    SELECT 
    * 
    FROM
    user
    WHERE 
    username = '${username}';`;
  const dbUser = await db.get(userLoginQuery);
  if (dbUser === undefined) {
    //Invalid User
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const userUpdateQuery = `
           UPDATE 
           user
           SET password = '${hashedPassword}'
           WHERE username = '${username}';
           `;
        const user = await db.run(userUpdateQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
