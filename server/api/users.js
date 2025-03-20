import express from "express"; 
import { config } from 'dotenv'; // Ensure environment variables are loaded
config({ path: '../../.env' }); // Load environment variables

import requireUser from "./utils.js"; 

import jwt from "jsonwebtoken"; // Change to ES Module import
import bcrypt from 'bcrypt';

const usersRouter = express.Router();
usersRouter.use(express.json());

import {
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  // updateUser,
  deleteUser,
} from "../db/index.js"; // Change to ES Module import

// GET ALL USERS http://localhost:3000/api/users/
usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await getAllUsers();

    res.send({
      users,
    });
  } catch ({ ex }) {
    next({ ex });
  }
});

// GET USER DETAILS /users/me
usersRouter.get("/me", requireUser, async (req, res, next) => {
  try {
    const userId = req.user.id; // Get user ID from the decoded token in req.user
    const user = await getUserById(userId); // Fetch user details from DB

    if (!user) {
      return res.status(404).send({ message: "User not found" }); // Handle case where user does not exist
    }

    res.send({ user }); // Send the user data back as a response
  } catch (error) {
    console.error("Error occurred while fetching user details:", error);
    next(error); // Pass any errors to the error handler
  }
});

// GET USER BY ID http://localhost:3000/api/users/:userId
usersRouter.get("/:userId", async (req, res, next) => {
  const { userId } = req.params; //access userId from req.params

  try {
    const user = await getUserById(userId);

    res.send({
      user,
    });
  } catch ({ ex }) {
    next({ ex });
  }
});

// POST http://localhost:3000/api/users/login tested using {"username": "albert","password": "bertie99"}
usersRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({
          name: "MissingCredentialsError",
          message: "Please supply both a username and password",
      });
  }

  try {
      const user = await getUserByUsername(username);

      if (user && (await bcrypt.compare(password, user.password))) {
          // Check if JWT_SECRET is defined
          // if (!process.env.JWT_SECRET) {
          //     return res.status(500).json({ message: 'Server configuration error: Missing JWT_SECRET.' });
          // }
          
          const token = jwt.sign(
              { id: user.id, username },
              process.env.JWT_SECRET || "secret",
              { expiresIn: '1w' }
          );

          res.send({
              message: "You're logged in!",
              token,
          });
      } else {
          return res.status(401).json({
              name: "IncorrectCredentialsError",
              message: "Username or password is incorrect",
          });
      }
  } catch (error) {
      console.log(error);
      next(error);
  }
});


// functional!! yay!! GET USER via auth (through token)
usersRouter.get("/auth/me", requireUser, async (req, res, next) => {
  try {
      const user = await getUserById(req.user.id); // Use the user ID from the decoded token
      if (!user) {
          return res.status(404).send({ message: "User not found" });
      }
      res.send({ user }); // Send user data back
  } catch (ex) {
      next(ex); // Handle error
  }
});



// POST USER (CREATE USER) http://localhost:3000/api/users/register
// removed display_name,email
usersRouter.post("/register", async (req, res, next) => {
  const { username, password,  dimension,  } = req.body;

  // Validate user input
  if (!username || !password || !dimension) {
    return res.status(400).json({
      // changed send to json to see if server can return JSON response, not HTML content type
      name: "Missing Fields Error",
      message:
        "Please provide all required fields: username, password, dimension",
    });
  }

  try {
    // check if user already exists
    const existingUser = await getUserByUsername(username);

    if (existingUser) {
      return res.status(409).json({
        name: "User Exists Error",
        message: "A user by that username already exists",
      });
    }

    // create new user
    //removed display_name, email
    const user = await createUser(
      {
      username,
      password, // check if hased the pw in createUser
      dimension

    });

    // generate token
    const token = jwt.sign(
      {
        id: user.id,
        username,
        dimension
      },
      process.env.JWT_SECRET || "shhh",
      {
        expiresIn: "1w",
      }
    );

    res.status(201).json({
      message: "Thank you for signing up",
      token,
    });
  } catch (error) {
    console.error(error); // logging error for debugging
    res.status(500).json({
      // Ensure any error returns JSON
      name: error.name || "Internal Error",
      message: error.message || "An unexpected error occurred",
    }); // improve error handling
  }
});

export default usersRouter; // Export the usersRouter
