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

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL!");

  const createUserTable = `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
  )`;

  const createEmailTable = `CREATE TABLE IF NOT EXISTS emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      subject VARCHAR(255),
      body TEXT,
      attachment VARCHAR(255),
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`;

  connection.query(createUserTable, (err) => {
    if (err) throw err;
    console.log("Users table created");

    connection.query(createEmailTable, (err) => {
      if (err) throw err;
      console.log("Emails table created");
    });
  });
});

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

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
  const insertUserQuery = `INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)`;
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
      res.cookie("user_fullname", result[0].full_name);
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
  // Render inbox page with emails data and success flag
  res.render("inbox", {
    emails: emails,
    userFullName: req.cookies.user_fullname,
    success,
  });
});

//SIGN IN PAGE -////////////////////////////////////////////////////////////////////////

//
//
// INBOX PAGE -----------------------------------------------------------------------------
// Mocked data for emails (replace this with actual data retrieval logic)
const emails = [
  // Sample email objects
  {
    id: 1,
    sender: "Sender Name 1",
    subject: "Subject 1",
    timeReceived: "2023-11-14 10:00:00",
  },
  {
    id: 2,
    sender: "Sender Name 2",
    subject: "Subject 2",
    timeReceived: "2023-11-14 09:30:00",
  },
  {
    id: 3,
    sender: "Sender Name 3",
    subject: "Subject 3",
    timeReceived: "2023-11-14 08:45:00",
  },
  // ...
];

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

// Apply the checkSignIn middleware to the inbox route
app.get("/inbox", checkSignIn, (req, res) => {
  // Check if the user is signed in
  console.log("Hello");
  if (!req.cookies.user_id) {
    res.render("access-denied");
    return;
  }
  // Render the inbox page or perform other actions for signed-in users
  res.render("inbox", { emails: emails, userFullName: "LAM" }); // Adjust this based on your templating engine and file structure
});

// POST route to handle deleting emails
app.post("/inbox/delete", (req, res) => {
  const selectedEmails = req.body.selectedEmails; // Array of selected email IDs to delete
  // Implement deletion logic here based on the selectedEmails array
  // Modify the emails array or perform deletion logic in the database
  // Example: emails = emails.filter(email => !selectedEmails.includes(email.id));

  // Respond with success message or updated email list
  res.json({ success: true, message: "Emails deleted successfully" });
});

app.get("/inbox", (req, res) => {
  // Check if the user is signed in
  if (!req.cookies.user_id) {
    res.redirect("/signin");
    return;
  }

  // Render the inbox page or perform other actions for signed-in users
  res.render("inbox", { emails: emails, userFullName: "LAM" }); // Adjust this based on your templating engine and file structure
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

// Route for handling the form submission
app.get("/inbox", (req, res) => {
  // Check if the user is signed in
  if (!req.cookies.user_id) {
    res.redirect("/signin");
    return;
  }
  // Render the inbox page or perform other actions for signed-in users
  res.render("inbox", { emails: emails, userFullName: "LAM" }); // Adjust this based on your templating engine and file structure
});

// Route for displaying the compose form
app.get("/compose", (req, res) => {
  const recipients = ["Recipient 1", "Recipient 2", "Recipient 3"];

  res.render("compose", { userFullName: req.cookies.user_fullname });

  res.redirect("/compose");
});

// Route for handling the form submission
app.post("/compose", (req, res) => {
  // Retrieve the form data
  const recipient = req.body.recipient;
  const subject = req.body.subject || "(no subject)";
  const body = req.body.body;
  const file = req.files ? req.files.file : null;

  // Validate the form data
  if (!recipient) {
    // Display an error message if recipient is not selected
    return res.render("compose", {
      recipients,
      errorMessage: "Please select a recipient",
    });
  }

  // Send the email and handle success/failure
  sendEmail(recipient, subject, body, file)
    .then(() => {
      // Display a success message if the email is sent successfully
      res.render("compose", {
        recipients,
        successMessage: "Email sent successfully",
      });
    })
    .catch((error) => {
      // Handle the error and display an appropriate message
      res.render("compose", {
        recipients,
        errorMessage: "Failed to send email. Please try again later.",
      });
    });
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
app.get("/outbox", (req, res) => {
  // Retrieve the outbox emails (replace this with your actual data retrieval logic)

  const outboxEmails = [
    {
      id: 1,
      recipient: "Recipient Name 1",
      subject: "Subject 1",
      timeSent: "2023-11-14 10:00:00",
    },
    {
      id: 2,
      recipient: "Recipient Name 2",
      subject: "Subject 2",
      timeSent: "2023-11-14 09:30:00",
    },
    {
      id: 3,
      recipient: "Recipient Name 3",
      subject: "Subject 3",
      timeSent: "2023-11-14 08:45:00",
    },
    // ...
  ];

  // Render the outbox.ejs template with the outbox emails data
  res.render("outbox", {
    emails: outboxEmails,
    userFullName: req.cookies.user_fullname,
  });
});

// POST route to handle deleting emails from the outbox
app.post("/outbox/delete", (req, res) => {
  // Retrieve the selected email IDs to be deleted from the request body
  const selectedEmails = req.body.selectedEmails;

  // Implement the logic to delete the selected emails from the outbox
  // ...

  // Redirect back to the outbox page after deleting the emails
  res.redirect("/outbox");
});

// OUTBOX PAGE //////////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
