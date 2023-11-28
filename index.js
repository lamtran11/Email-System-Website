const express = require("express");
const app = express();
const mysql = require("mysql2");
const path = require("path");

const PORT = 8000;
// Set EJS as the view engine
app.set("view engine", "ejs");

// Specify the views folder
app.set("views", path.join(__dirname, "views"));

const connection = mysql.createConnection({
  host: "localhost",
  user: "wpr",
  password: "fit2023",
  database: "wpr2023",
});

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//SIGN UP PAGE -////////////////////////////////////////////////////////////////////////

// Function to check if email is valid format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

app.get("/signup", (req, res) => {
  res.render("signup", { data: {} });
});

app.post("/signup", (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  // console.log("processing sign up");
  // console.log(req.body);
  if (!isValidEmail(email)) {
    res.render("signup", { data: { errorMessage: "Invalid email format" } });
    return;
  }
  if (password != confirmPassword) {
    res.render("signup", { data: { errorMessage: "Passwords don't match" } });
    return;
  }
  const insertUserQuery = `INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)`;
  connection.query(insertUserQuery, [name, email, password], (err, result) => {
    if (err) {
      res.render("signup", {
        data: { errorMessage: "Email already exists" },
      });
      // Send JSON indicating failure
      return;
    } else {
      console.log("User inserted successfully");
      res.render("welcome"); // Send JSON indicating success
    }
  });
});

//SIGN UP PAGE -////////////////////////////////////////////////////////////////////////

//
//
//SIGN IN PAGE -////////////////////////////////////////////////////////////////////////

const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Home page
app.get("/", (req, res) => {
  res.send(
    "This is the homepage of the application. <a href='/signin'>Sign-up</a>"
  );
});

// Sign-in page
app.get("/signin", (req, res) => {
  // Check if user is already signed in
  if (req.cookies.user) {
    res.redirect("/inbox");
    return;
  }
  const errorMessage = req.cookies.invalidSignIn
    ? "Invalid username or password"
    : "";
  res.clearCookie("invalidSignIn"); // Clear the invalidSignIn cookie
  res.render("signin", { errorMessage });
});

app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  console.log("processing sign in");
  // Check if username and password are valid (replace this with your database check)
  // Assuming you have a function called `isValidUser` that checks the email and password in the database
  const selectUserQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;

  connection.query(selectUserQuery, [email, password], (err, result) => {
    if (err || result.length === 0) {
      res.cookie("invalidSignIn", true); // Set the invalidSignIn cookie
      res.redirect("/signin");
    } else {
      res.cookie("user_fullname", result[0].fullname);
      res.cookie("user_id", result[0].id);
      res.cookie("user_email", result[0].email);
      // Redirect to /inbox with a query parameter indicating successful sign-in
      res.redirect("/inbox?success=true");
    }
  });
});

// Assuming you have a database connection and a table named 'users'

async function isValidUser(email, password) {
  // Perform a database query to check if the email and password match a user record
  const selectUserQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;
  connection.query(selectUserQuery, [email, password], (err, result) => {
    if (err || result.length === 0) {
      return false; // Invalid user
    } else {
      return true; // Valid user
    }
  });
}

// Inbox page
app.get("/inbox", (req, res) => {
  // Check if the query parameter 'success' is present and true
  const success = req.query.success === "true";

  // Check if user is signed in
  if (!req.cookies.user_id) {
    res.render("access-denied");
    return;
  }

  // Query the database to get all mails with the specified conditions
  const selectMailsQuery = `
    SELECT mails.id, mails.subject, users.fullname AS sender_name, mails.send_at
    FROM mails
    JOIN users ON mails.sender_id = users.id
    WHERE mails.receiver_id = ? AND mails.receiverDeleted = false
    ORDER BY send_at DESC
  `;

  connection.query(selectMailsQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      // res.render("error");
      return;
    }

    // Render inbox page with emails data and success flag
    res.render("inbox", {
      emails: result,
      userFullName: req.cookies.user_fullname,
      success,
    });
  });
});

app.get("/email/:id", (req, res) => {
  const id = req.params.id;
  const selectMailQuery = `
    SELECT mails.id, mails.subject, mails.body, users.email AS sender_email, u2.email AS receiver_email, mails.send_at
    FROM mails
    JOIN users ON mails.sender_id = users.id
    JOIN users u2 ON mails.receiver_id = u2.id
    WHERE mails.id = ?
  `;

  connection.query(selectMailQuery, [id], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      // res.render("error");
      return;
    }

    // Render inbox page with emails data and success flag
    res.render("emailDetail", {
      email: result[0],
      userFullName: req.cookies.user_fullname,
    });
  });
});

//SIGN IN PAGE -////////////////////////////////////////////////////////////////////////

//
//
// INBOX PAGE -----------------------------------------------------------------------------

// / Middleware function to check if the user is signed in
const checkSignIn = (req, res, next) => {
  const allowedPaths = ["/signin", "/signup"]; // Paths allowed for unsigned users

  if (req.cookies.user_id) {
    // User is signed in, allow access to the next middleware or route handler
    next();
  } else {
    // User is not signed in
    if (allowedPaths.includes(req.path)) {
      // Allow access to sign-in and sign-up pages
      next();
    } else {
      // Redirect to the sign-in page for other pages
      res.status(403).send("Access Denied");
      // res.redirect("/signin");
      res.render("access-denied");
    }
  }
};

app.use(checkSignIn);

// POST route to handle deleting emails
app.post("/delete", (req, res) => {
  console.log(req.body);
  const deletedIds = req.body.deletedIds; // Array of selected email IDs to delete
  const deletedBy = req.body.deletedBy;

  const arrayidString = deletedIds.join(", ");

  const updateMailsQuery = `UPDATE mails SET ${deletedBy}Deleted = true WHERE id IN (${deletedIds})`;

  console.log(updateMailsQuery);

  connection.query(updateMailsQuery, (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      // res.render("error");
      return;
    }
    // Handle the success
    console.log("Emails deleted successfully");
    // res.render("success");
    // res.redirect("/inbox");
  });

  // Implement deletion logic here based on the selectedEmails array
  // Modify the emails array or perform deletion logic in the database
  // Example: emails = emails.filter(email => !selectedEmails.includes(email.id));

  // Respond with success message or updated email list
  res.json({ success: true, message: "Emails deleted successfully" });
});

app.get("/signout", (req, res) => {
  // Delete the user cookie
  res.clearCookie("user_id", "user_fullname", "user_email");

  // Redirect to the sign-in page
  res.redirect("/signin");
});

// INBOX PAGE -----------------------------------------------------------------------------

// Compose PAGE ---------------------------------------------------------------------------
// Import necessary modules and dependencies
const bodyParser = require("body-parser");

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Route for displaying the compose form
app.get("/compose", (req, res) => {
  const recipients = ["Recipient 1", "Recipient 2", "Recipient 3"];

  const getALlUserQuery = `SELECT * FROM users WHERE id != ?`;

  connection.query(getALlUserQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      // res.render("error");
      return;
    }
    res.render("compose", {
      recipients: result,
      userFullName: req.cookies.user_fullname,
    });
  });

  // res.render("compose", { userFullName: req.cookies.user_fullname });

  // res.redirect("/compose");
});

// Route for handling the form submission
app.post("/compose", (req, res) => {
  console.log(req.body);
  // Retrieve the form data
  const senderId = req.cookies.user_id;
  const receiverId = req.body.recipient;
  const subject = req.body.subject || "(no subject)";
  const body = req.body.body;
  const sendAt = new Date(); // Current timestamp

  // Insert the new record into the mails table
  const insertMailQuery = `INSERT INTO mails (sender_id, receiver_id, subject, body, send_at) VALUES (?, ?, ?, ?, ?)`;
  connection.query(
    insertMailQuery,
    [senderId, receiverId, subject, body, sendAt],
    (err, result) => {
      if (err) {
        // Handle the error
        console.error(err);
        // res.render("error");
        return;
      }
      // Handle the success
      console.log("New mail record inserted successfully");
      // res.render("success");
      res.redirect("/outbox");
    }
  );
});

// Function to send the email
function sendEmail(recipient, subject, body, file) {
  return new Promise((resolve, reject) => {
    // Implement the logic to send the email here
    // You can use any email sending library or service of your choice

    // Simulate sending the email with a delay of 2 seconds
    setTimeout(() => {
      if (Math.random() < 0.8) {
        resolve(); // Email sent successfully
      } else {
        reject(); // Failed to send email
      }
    }, 2000);
  });
}
// Compose PAGE ---------------------------------------------------------------------------

//
//
// OUTBOX PAGE //////////////////////////////////////////////////////////////////////////////
// GET route for displaying the outbox page
// Inbox page
app.get("/outbox", (req, res) => {
  // Check if the query parameter 'success' is present and true
  const success = req.query.success === "true";

  // Check if user is signed in
  if (!req.cookies.user_id) {
    res.render("access-denied");
    return;
  }

  // Query the database to get all mails with the specified conditions
  const selectMailsQuery = `
    SELECT mails.id, mails.subject, users.fullname AS receiver_name, mails.send_at
    FROM mails
    JOIN users ON mails.receiver_id = users.id
    WHERE mails.sender_id = ? AND mails.senderDeleted = false
    ORDER BY send_at DESC
  `;

  connection.query(selectMailsQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      // Handle the error
      console.error(err);
      // res.render("error");
      return;
    }

    // Render inbox page with emails data and success flag
    res.render("outbox", {
      emails: result,
      userFullName: req.cookies.user_fullname,
      success,
    });
  });
});

// OUTBOX PAGE //////////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
