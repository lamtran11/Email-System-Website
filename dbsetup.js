const mysql = require("mysql2");

// Create a connection to the database
const connection = mysql.createConnection({
  host: "localhost",
  user: "wpr",
  password: "fit2023",
});

// Connect to the database
connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to the database");

  // Create the database
  connection.query("CREATE DATABASE IF NOT EXISTS wpr2023", (err, result) => {
    if (err) throw err;
    console.log("Database created");

    // Use the database
    connection.query("USE wpr2023", (err, result) => {
      if (err) throw err;
      console.log("Using database");

      // Continue with the rest of the code...
      // BEGIN: be15d9bcejpp
      // Create the users table
      const createUsersTable = `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullname VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      )`;
      connection.query(createUsersTable, (err, result) => {
        if (err) throw err;
        console.log("Users table created");

        // Insert 3 users
        const insertUsers = `INSERT INTO users (fullname, email, password) VALUES
          ('User 1', 'a@a.com', '123456'),
          ('User 2', 'b@b.com', 'abcdef'),
          ('User 3', 'c@c.com', 'uvwxyz')`;
        connection.query(insertUsers, (err, result) => {
          if (err) throw err;
          console.log("3 users inserted");

          // Create the mails table
          const createMailsTable = `CREATE TABLE IF NOT EXISTS mails (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            send_at DATETIME NOT NULL,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            senderDeleted BOOLEAN DEFAULT false,
            receiverDeleted BOOLEAN DEFAULT false,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
          )`;
          connection.query(createMailsTable, (err, result) => {
            if (err) throw err;
            console.log("Mails table created");

            // Insert at least 8 mails
            const insertMails = `INSERT INTO mails (subject, body, send_at, sender_id, receiver_id) VALUES
              ('Mail 1', 'Body 1', NOW(), 1, 2),
              ('Mail 2', 'Body 2', NOW(), 2, 1),
              ('Mail 3', 'Body 3', NOW(), 1, 3),
              ('Mail 4', 'Body 4', NOW(), 3, 1),
              ('Mail 5', 'Body 5', NOW(), 2, 3),
              ('Mail 6', 'Body 6', NOW(), 3, 2),
              ('Mail 7', 'Body 7', NOW(), 1, 2),
              ('Mail 8', 'Body 8', NOW(), 2, 1)`;
            connection.query(insertMails, (err, result) => {
              if (err) throw err;
              console.log("Mails inserted");
            });
          });
        });
      });
      // END: be15d9bcejpp
    });
  });
});
