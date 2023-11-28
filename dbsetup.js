const mysql = require("mysql2");

// Create a connection to the database
const connection = mysql.createConnection({
  host: "localhost",
  user: "your_username",
  password: "your_password",
  database: "your_database_name",
});

// Connect to the database
connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to the database");

  // Create the users table
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `;
  connection.query(createUsersTableQuery, (err) => {
    if (err) throw err;
    console.log("Users table created");

    // Insert users data
    const insertUsersQuery = `
      INSERT INTO users (email, name)
      VALUES
        ('a@a.com', 'User A'),
        ('b@b.com', 'User B'),
        ('c@c.com', 'User C')
    `;
    connection.query(insertUsersQuery, (err) => {
      if (err) throw err;
      console.log("Users data inserted");

      // Create the emails table
      const createEmailsTableQuery = `
        CREATE TABLE IF NOT EXISTS emails (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
      `;
      connection.query(createEmailsTableQuery, (err) => {
        if (err) throw err;
        console.log("Emails table created");

        // Insert emails data
        const insertEmailsQuery = `
          INSERT INTO emails (sender_id, receiver_id, subject, message)
          VALUES
            (1, 2, 'Subject 1', 'Message 1'),
            (2, 1, 'Subject 2', 'Message 2'),
            (1, 3, 'Subject 3', 'Message 3'),
            (3, 1, 'Subject 4', 'Message 4'),
            (2, 3, 'Subject 5', 'Message 5'),
            (3, 2, 'Subject 6', 'Message 6'),
            (1, 2, 'Subject 7', 'Message 7'),
            (2, 1, 'Subject 8', 'Message 8')
        `;
        connection.query(insertEmailsQuery, (err) => {
          if (err) throw err;
          console.log("Emails data inserted");

          // Close the database connection
          connection.end((err) => {
            if (err) throw err;
            console.log("Database connection closed");
          });
        });
      });
    });
  });
});
