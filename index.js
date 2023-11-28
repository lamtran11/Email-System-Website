const express = require("express");
const app = express();
const mysql = require("mysql2");
const path = require("path");

const PORT = 8000;

app.set("view engine", "ejs");

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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

app.get("/signup", (req, res) => {
  res.render("signup", { data: {} });
});

app.post("/signup", (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
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
      return;
    } else {
      console.log("User inserted successfully");
      res.render("welcome");
    }
  });
});

const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send(
    "This is the homepage of the application. <a href='/signin'>Sign-up</a>"
  );
});

app.get("/signin", (req, res) => {
  if (req.cookies.user) {
    res.redirect("/inbox");
    return;
  }
  const errorMessage = req.cookies.invalidSignIn
    ? "Invalid username or password"
    : "";
  res.clearCookie("invalidSignIn");
  res.render("signin", { errorMessage });
});

app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  console.log("processing sign in");

  const selectUserQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;

  connection.query(selectUserQuery, [email, password], (err, result) => {
    if (err || result.length === 0) {
      res.cookie("invalidSignIn", true);
      res.redirect("/signin");
    } else {
      res.cookie("user_fullname", result[0].fullname);
      res.cookie("user_id", result[0].id);
      res.cookie("user_email", result[0].email);
      res.redirect("/inbox?success=true");
    }
  });
});

async function isValidUser(email, password) {
  const selectUserQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;
  connection.query(selectUserQuery, [email, password], (err, result) => {
    if (err || result.length === 0) {
      return false;
    } else {
      return true;
    }
  });
}

app.get("/inbox", (req, res) => {
  const success = req.query.success === "true";

  if (!req.cookies.user_id) {
    res.render("access-denied");
    return;
  }

  const selectMailsQuery = `
    SELECT mails.id, mails.subject, users.fullname AS sender_name, mails.send_at
    FROM mails
    JOIN users ON mails.sender_id = users.id
    WHERE mails.receiver_id = ? AND mails.receiverDeleted = false
    ORDER BY send_at DESC
  `;

  connection.query(selectMailsQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      console.error(err);
      return;
    }

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
      console.error(err);
      return;
    }

    res.render("emailDetail", {
      email: result[0],
      userFullName: req.cookies.user_fullname,
    });
  });
});

const checkSignIn = (req, res, next) => {
  const allowedPaths = ["/signin", "/signup"];

  if (req.cookies.user_id) {
    next();
  } else {
    if (allowedPaths.includes(req.path)) {
      next();
    } else {
      res.status(403).send("Access Denied");
      res.render("access-denied");
    }
  }
};

app.use(checkSignIn);

app.post("/delete", (req, res) => {
  console.log(req.body);
  const deletedIds = req.body.deletedIds;
  const deletedBy = req.body.deletedBy;

  const arrayidString = deletedIds.join(", ");

  const updateMailsQuery = `UPDATE mails SET ${deletedBy}Deleted = true WHERE id IN (${deletedIds})`;

  console.log(updateMailsQuery);

  connection.query(updateMailsQuery, (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Emails deleted successfully");
  });

  res.json({ success: true, message: "Emails deleted successfully" });
});

app.get("/signout", (req, res) => {
  res.clearCookie("user_id", "user_fullname", "user_email");

  res.redirect("/signin");
});

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/compose", (req, res) => {
  const recipients = ["Recipient 1", "Recipient 2", "Recipient 3"];

  const getALlUserQuery = `SELECT * FROM users WHERE id != ?`;

  connection.query(getALlUserQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    res.render("compose", {
      recipients: result,
      userFullName: req.cookies.user_fullname,
    });
  });
});

app.post("/compose", (req, res) => {
  console.log(req.body);
  const senderId = req.cookies.user_id;
  const receiverId = req.body.recipient;
  const subject = req.body.subject || "(no subject)";
  const body = req.body.body;
  const sendAt = new Date();

  const insertMailQuery = `INSERT INTO mails (sender_id, receiver_id, subject, body, send_at) VALUES (?, ?, ?, ?, ?)`;
  connection.query(
    insertMailQuery,
    [senderId, receiverId, subject, body, sendAt],
    (err, result) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("New mail record inserted successfully");
      res.redirect("/outbox");
    }
  );
});

app.get("/outbox", (req, res) => {
  const success = req.query.success === "true";

  if (!req.cookies.user_id) {
    res.render("access-denied");
    return;
  }

  const selectMailsQuery = `
    SELECT mails.id, mails.subject, users.fullname AS receiver_name, mails.send_at
    FROM mails
    JOIN users ON mails.receiver_id = users.id
    WHERE mails.sender_id = ? AND mails.senderDeleted = false
    ORDER BY send_at DESC
  `;

  connection.query(selectMailsQuery, [req.cookies.user_id], (err, result) => {
    if (err) {
      console.error(err);
      return;
    }

    res.render("outbox", {
      emails: result,
      userFullName: req.cookies.user_fullname,
      success,
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
