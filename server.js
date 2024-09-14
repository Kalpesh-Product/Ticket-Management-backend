if (process.env.NODE_ENV != "production") {
  // if the project is deployed for production, the environment variables from .env file will not be used (usually hosting services like heroku, aws, etc have process.env.NODE_ENV set equal to production)
  require("dotenv").config();
}

const Ticket = require("./models/ticketModel"); // importing ticket model (the blueprint)
const Admin = require("./models/adminModel");
const Member = require("./models/memberModel");
const User = require("./models/userModel");
const Message = require("./models/messageModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import dependencies
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectToDb = require("./config/connectToDb");

// Creating the express app
const app = express();

// app.use(cors());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());

// Configure express app to send & read json
app.use(express.json());

// Connect to the database
connectToDb();

// Test route
app.get("/", (req, res) => {
  res.json({ message: "hello world ticket management" });
});

// POST
app.post("/create-ticket", async (req, res) => {
  try {
    // Get the data from the request body
    const userNameFromRequestBody = req.body.userName;
    const userEmailFromRequestBody = req.body.userEmail;
    const creatorEmailFromRequestBody = req.body.creatorEmail;
    const userCompanyFromRequestBody = req.body.userCompany;
    const userDepartmentFromRequestBody = req.body.userDepartment;
    const userMessageFromRequestBody = req.body.userMessage;
    const status = req.body.status;
    // const assignedMember = req.body.assignedMember;
    const memberStatus = req.body.memberStatus;
    const memberTimeRequired = req.body.memberTimeRequired;
    const memberMessageToAdmin = req.body.memberMessageToAdmin;
    const memberMessageToUser = req.body.memberMessageToUser;
    const resolvedStatus = req.body.resolvedStatus;
    const deletedStatus = req.body.deletedStatus;
    // const date = req.body.date;
    // const time = req.body.time;

    // Find an available member from the members collection
    const availableMember = await Member.findOne({ availability: "Available" });

    // if (!availableMember) {
    //   return res.status(404).json({ error: "No available members found" });
    // }

    // If no available member, set default text
    const assignedMember = availableMember
      ? availableMember.email
      : "No available member";

    // Insert data into the database
    const ourCreatedTicket = await Ticket.create({
      userName: userNameFromRequestBody,
      userEmail: userEmailFromRequestBody,
      creatorEmail: creatorEmailFromRequestBody,
      userCompany: userCompanyFromRequestBody,
      userDepartment: userDepartmentFromRequestBody,
      userMessage: userMessageFromRequestBody,
      status: status,
      assignedMember: assignedMember,
      // assignedMember: availableMember.email,
      memberStatus: memberStatus,
      memberTimeRequired: memberTimeRequired,
      memberMessageToAdmin: memberMessageToAdmin,
      memberMessageToUser: memberMessageToUser,
      resolvedStatus: resolvedStatus,
      deletedStatus: deletedStatus,
      // date: date,
      // time: time,
      //   user: req.user._id,
    });

    // Respond to the frontend with entered ticket data
    res.json({ ticket: ourCreatedTicket });
  } catch (error) {
    console.log(error);
  }
});

// View All tickets (for admin)
app.get("/get-all-tickets", async (req, res) => {
  try {
    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find();

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Get today's tickets
app.get("/get-todays-tickets", async (req, res) => {
  try {
    // Get the current date in the desired format (e.g., 'YYYY-MM-DD')
    const today = new Date().toISOString().split("T")[0];

    // Find all tickets where the date matches today's date
    const todaysTickets = await Ticket.find({ date: today });

    // Respond with the filtered tickets for today
    res.json({ tickets: todaysTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

app.get("/get-all-tickets-sorted", async (req, res) => {
  try {
    // find all ticket objects from the db and sort them by createdAt in descending order
    const listOfAllTickets = await Ticket.find().sort({ createdAt: -1 });

    // respond with the ticket array containing ticket objects sorted by latest
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View users tickets (for user)
app.get("/get-all-tickets/:email", async (req, res) => {
  try {
    // Get the user email off the url
    const userEmailFromTheUrl = req.params.email;

    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find({
      creatorEmail: userEmailFromTheUrl,
    });

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Adding admin
app.post("/signup", async (req, res) => {
  try {
    // Get the email and password off the req body
    const nameFromRequestBody = req.body.name;
    const emailFromRequestBody = req.body.email;
    const passwordFromRequestBody = req.body.password;
    const RoleFromRequestBody = req.body.role;

    //   Hash password
    const hashedPassword = bcrypt.hashSync(passwordFromRequestBody, 8);

    // Create a admin with the data (in the DB)
    await Admin.create({
      name: nameFromRequestBody,
      email: emailFromRequestBody,
      password: hashedPassword,
      role: RoleFromRequestBody,
    });

    // respond with the new created admin
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Admin login & logout
app.post("/admin-login", async (req, res) => {
  try {
    // Get the email and password off the request body
    // const { email, password } = req.body;
    const emailFromRequestBody = req.body.email;
    const passwordFromRequestBody = req.body.password;

    // Find the admin with requested email
    const adminRowWithSameEmail = await Admin.findOne({
      email: emailFromRequestBody,
    }); // find one admin where email is equal to email from request body
    if (!adminRowWithSameEmail) return res.sendStatus(401); // if admin doesn't exist, send 401 (unauthorized)

    // Compare sent in password with found admin password hash
    const passwordMatch = bcrypt.compareSync(
      passwordFromRequestBody,
      adminRowWithSameEmail.password
    );
    if (!passwordMatch) return res.sendStatus(401); // unauthorised

    // (If everything matches,) Create a jwt token
    const expirationTime = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    // const expirationTime = Date.now() + 1000 * 10; // 10 seconds

    const token = jwt.sign(
      { sub: adminRowWithSameEmail._id, exp: expirationTime }, // first argument is the data we want to encrypt within out token, & the second argument is the secret key which will be used to encrypt it & decrypt it
      process.env.SECRET
    );

    //   Set the cookie
    res.cookie("Admincookie", token, {
      expires: new Date(expirationTime),
      httpOnly: true, // this makes sure that only the browser and server can read the cookie
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // in production, it will only work on https
    });

    // Send the jwt token
    //   res.json({ token }); // bad practice (what they show in most videos)
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// logout
app.get("/admin-logout", (req, res) => {
  try {
    // Delete the cookie
    res.clearCookie("Admincookie");

    // respond with 200
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

// Adding member
app.post("/signup-member", async (req, res) => {
  try {
    // Get the email and password off the req body
    const nameFromRequestBody = req.body.name;
    const emailFromRequestBody = req.body.email;
    const passwordFromRequestBody = req.body.password;
    const RoleFromRequestBody = req.body.role;
    const AvailabilityFromRequestBody = req.body.availability;

    //   Hash password
    const hashedPassword = bcrypt.hashSync(passwordFromRequestBody, 8);

    // Create a member with the data (in the DB)
    await Member.create({
      name: nameFromRequestBody,
      email: emailFromRequestBody,
      password: hashedPassword,
      role: RoleFromRequestBody,
      availability: AvailabilityFromRequestBody,
    });

    // respond with the new created member
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Member login & logout
app.post("/member-login", async (req, res) => {
  try {
    // Get the email and password off the request body
    // const { email, password } = req.body;
    const emailFromRequestBody = req.body.email;
    const passwordFromRequestBody = req.body.password;

    // Find the member with requested email
    const memberRowWithSameEmail = await Member.findOne({
      email: emailFromRequestBody,
    }); // find one member where email is equal to email from request body
    if (!memberRowWithSameEmail) return res.sendStatus(401); // if member doesn't exist, send 401 (unauthorized)

    // Compare sent in password with found member password hash
    const passwordMatch = bcrypt.compareSync(
      passwordFromRequestBody,
      memberRowWithSameEmail.password
    );
    if (!passwordMatch) return res.sendStatus(401); // unauthorised

    // (If everything matches,) Create a jwt token
    const expirationTime = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    // const expirationTime = Date.now() + 1000 * 10; // 10 seconds

    const token = jwt.sign(
      { sub: memberRowWithSameEmail._id, exp: expirationTime }, // first argument is the data we want to encrypt within out token, & the second argument is the secret key which will be used to encrypt it & decrypt it
      process.env.SECRET
    );

    //   Set the cookie
    res.cookie("Membercookie", token, {
      expires: new Date(expirationTime),
      httpOnly: true, // this makes sure that only the browser and server can read the cookie
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // in production, it will only work on https
    });

    // Send the jwt token
    //   res.json({ token }); // bad practice (what they show in most videos)
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// logout
app.get("/member-logout", (req, res) => {
  try {
    // Delete the cookie
    res.clearCookie("Membercookie");

    // respond with 200
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

// Adding user
app.post("/signup-user", async (req, res) => {
  try {
    // Get the email and password off the req body
    const nameFromRequestBody = req.body.name;
    const emailFromRequestBody = req.body.email;
    const companyFromRequestBody = req.body.company;
    const passwordFromRequestBody = req.body.password;

    //   Hash password
    const hashedPassword = bcrypt.hashSync(passwordFromRequestBody, 8);

    // Create a user with the data (in the DB)
    await User.create({
      name: nameFromRequestBody,
      email: emailFromRequestBody,
      company: companyFromRequestBody,
      password: hashedPassword,
    });

    // respond with the new created user
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// user login & logout
app.post("/user-login", async (req, res) => {
  try {
    // Get the email and password off the request body
    // const { email, password } = req.body;
    const emailFromRequestBody = req.body.email;
    const passwordFromRequestBody = req.body.password;

    // Find the user with requested email
    const userRowWithSameEmail = await User.findOne({
      email: emailFromRequestBody,
    }); // find one user where email is equal to email from request body
    if (!userRowWithSameEmail) return res.sendStatus(401); // if user doesn't exist, send 401 (unauthorized)

    // Compare sent in password with found user password hash
    const passwordMatch = bcrypt.compareSync(
      passwordFromRequestBody,
      userRowWithSameEmail.password
    );
    if (!passwordMatch) return res.sendStatus(401); // unauthorised

    // (If everything matches,) Create a jwt token
    const expirationTime = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    // const expirationTime = Date.now() + 1000 * 10; // 10 seconds

    const token = jwt.sign(
      { sub: userRowWithSameEmail._id, exp: expirationTime }, // first argument is the data we want to encrypt within out token, & the second argument is the secret key which will be used to encrypt it & decrypt it
      process.env.SECRET
    );

    //   Set the cookie
    res.cookie("Usercookie", token, {
      expires: new Date(expirationTime),
      httpOnly: true, // this makes sure that only the browser and server can read the cookie
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // in production, it will only work on https
    });

    // Send the jwt token
    //   res.json({ token }); // bad practice (what they show in most videos)
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// logout
app.get("/user-logout", (req, res) => {
  try {
    // Delete the cookie
    res.clearCookie("Usercookie");

    // respond with 200
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

// update assigned member - change to unavailable
app.put("/change-member-to-unavailable/:id", async (req, res) => {
  try {
    // Get the id off the url
    const memberIdFromTheUrl = req.params.id;

    // Get the data from the request body
    // const assignedMember = req.body.assignedMember;

    // Find the member in the DB & update
    await Member.findOneAndUpdate(
      { _id: memberIdFromTheUrl },
      {
        availability: "Unavailable",
      }
    );

    // Find the updated member using the ID
    const updatedMember = await Member.findById(memberIdFromTheUrl);

    // Respont with updated member
    res.json({ member: updatedMember });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// update assigned member - change to available
app.put("/change-member-to-available/:id", async (req, res) => {
  try {
    // Get the id off the url
    const memberIdFromTheUrl = req.params.id;

    // Get the data from the request body
    // const assignedMember = req.body.assignedMember;

    // Find the member in the DB & update
    await Member.findOneAndUpdate(
      { _id: memberIdFromTheUrl },
      {
        availability: "Available",
      }
    );

    // Find the updated member using the ID
    const updatedMember = await Member.findById(memberIdFromTheUrl);

    // Respont with updated member
    res.json({ member: updatedMember });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View All member assigned tickets
app.get("/get-member-assigned-tickets/:email", async (req, res) => {
  try {
    // Get the member email off the url
    const memberEmailFromTheUrl = req.params.email;

    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find({
      assignedMember: memberEmailFromTheUrl,

      memberAcceptedStatus: "Not Accepted",
    });

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View All member accepted tickets
app.get("/get-member-accepted-tickets/:email", async (req, res) => {
  try {
    // Get the member email off the url
    const memberEmailFromTheUrl = req.params.email;

    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find({
      assignedMember: memberEmailFromTheUrl,

      memberAcceptedStatus: "Accepted",
    });

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// // Member accepts ticket
// app.put("/member-accept-ticket/:id", async (req, res) => {
//   try {
//     // Get the id off the url
//     const ticketIdFromTheUrl = req.params.id;

//     // Get the data off the req body
//     // const titleFromRequestBody = req.body.title;
//     // const bodyFromRequestBody = req.body.body;

//     // Find and update the record
//     await Ticket.findOneAndUpdate(
//       { _id: ticketIdFromTheUrl },
//       {
//         memberAcceptedStatus: "Accepted",
//       }
//     );

//     //   Find updated ticket (using it's id)
//     const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

//     // Respond with the updated ticket (after finding it)
//     res.json({ ticket: updatedTicket });
//   } catch (error) {
//     console.log(error);
//     res.sendStatus(400);
//   }
// });

// Member accepts ticket
app.put("/member-accept-ticket/:id", async (req, res) => {
  try {
    // Get the id from the URL
    const ticketIdFromTheUrl = req.params.id;

    // Get the current date and time
    const currentDateTime = new Date();
    const memberAcceptedDate = currentDateTime.toLocaleDateString(); // Date in 'MM/DD/YYYY' format
    const memberAcceptedTime = currentDateTime.toLocaleTimeString(); // Time in 'HH:MM:SS AM/PM' format

    // Find and update the record
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        memberAcceptedStatus: "Accepted",
        memberAcceptedDate: memberAcceptedDate,
        memberAcceptedTime: memberAcceptedTime,
      }
    );

    // Find the updated ticket
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respond with the updated ticket
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Member closes ticket
app.put("/close-ticket/:id", async (req, res) => {
  try {
    // Get the id off the url
    const ticketIdFromTheUrl = req.params.id;

    // Get the data off the req body
    // const titleFromRequestBody = req.body.title;
    // const bodyFromRequestBody = req.body.body;

    // Find and update the record
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        status: "Closed",
        memberMessageToUser: "-",
      }
    );

    //   Find updated ticket (using it's id)
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respond with the updated ticket (after finding it)
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Member cannot resolve ticket
app.put("/member-cannot-resolve-ticket/:id", async (req, res) => {
  try {
    // Get the id off the url
    const ticketIdFromTheUrl = req.params.id;

    // Get the member's message off the req body
    const memberMessageFromRequestBody = req.body.memberMessageToAdmin;
    // const bodyFromRequestBody = req.body.body;

    // Find and update the record
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        status: "Pending",
        resolvedStatus: "Unresolved",
        memberMessageToAdmin: memberMessageFromRequestBody,
        memberMessageToUser:
          "Issue is raised & will require more 24 hr to get resolved",
      }
    );

    //   Find updated ticket (using it's id)
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respond with the updated ticket (after finding it)
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View All members ( admin)
app.get("/get-all-members", async (req, res) => {
  try {
    // find all member objects from the db
    const listOfAllMembers = await Member.find();

    // respond with the member array containing member objects
    res.json({ members: listOfAllMembers });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View closed tickets
app.get("/get-closed-tickets", async (req, res) => {
  try {
    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find({
      status: "Closed",
    });

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// View unresolved tickets
app.get("/get-unresolved-tickets", async (req, res) => {
  try {
    // find all ticket objects from the db
    const listOfAllTickets = await Ticket.find({
      resolvedStatus: "Unresolved",
    });

    // respond with the ticket array containing ticket objects
    res.json({ tickets: listOfAllTickets });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// // update assigned member
// app.put("/update-assign-member/:id", async (req, res) => {
//   try {
//     // Get the id off the url
//     const ticketIdFromTheUrl = req.params.id;

//     // Get the data from the request body
//     const assignedMember = req.body.assignedMember;

//     // Find the ticket in the DB & update
//     await Ticket.findOneAndUpdate(
//       { _id: ticketIdFromTheUrl },
//       {
//         assignedMember: assignedMember,
//       }
//     );

//     // Find the updated ticket using the ID
//     const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

//     // Respont with updated ticket
//     res.json({ ticket: updatedTicket });
//   } catch (error) {
//     console.log(error);
//     res.sendStatus(400);
//   }
// });

// update assigned member
app.put("/update-assign-member/:id", async (req, res) => {
  try {
    // Get the id off the url
    const ticketIdFromTheUrl = req.params.id;

    // Get the data from the request body
    const assignedMember = req.body.assignedMember;

    // Find the ticket in the DB & update
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        assignedMember: assignedMember,
      }
    );

    // Find the updated ticket using the ID
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respont with updated ticket
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// //////////

// // update assigned member
// app.put("/auto-assign-member", async (req, res) => {
//   try {
//     // Find the first member entry where availability is available
//     const foundAvailableMember = await Member.findOne({
//       availability: "available",
//     });

//     // Store the email in a variable
//     const membersEmail = foundAvailableMember?.email;
//     console.log(membersEmail);

//     // find a ticket entry where assigned member is "-" (no assigned member)
//     const foundEmptyTicket = await Ticket.findOne({
//       assignedMember: "-",
//     });

//     await Ticket.findOneAndUpdate(
//       { assignedMember: "-" },
//       // { assignedMember: membersEmail }
//       { $set: { assignedMember: membersEmail } }
//     );

//     // Respond with updated ticket
//     if (updatedTicket) {
//       // Respond with updated ticket
//       res.json({ ticket: updatedTicket });
//     } else {
//       res.status(404).json({ message: "No ticket found to update." });
//     }
//   } catch (error) {
//     console.log(error);
//     res.sendStatus(400);
//   }
// });

// // update assigned member
// app.put("/auto-assign-member", async (req, res) => {
//   try {
//     let foundAvailableMember = null;

//     // Loop until an available member is found
//     while (!foundAvailableMember) {
//       // 1. Find the first member entry where availability is "available"
//       foundAvailableMember = await Member.findOne({
//         availability: "available",
//       });
//       console.log(foundAvailableMember);

//       if (!foundAvailableMember) {
//         // Wait for 1 second before trying again
//         await delay(1000);
//         console.log(foundAvailableMember);
//       }
//     }

//     // 1. Find the first member entry where availability is "available"
//     const foundAvailableMember = await Member.findOne({
//       availability: "available",
//     });

//     if (!foundAvailableMember) {
//       // If no available member is found, respond with a 404 error
//       // return res.status(404).json({ message: "No available member found." });
//       return res.json({ message: "No available member found." });
//     }
//     console.log(foundAvailableMember);

//     // 2. Store the email in a variable
//     const membersEmail = foundAvailableMember.email;
//     console.log(`Assigned Member Email: ${membersEmail}`);

//     // 3. Find a ticket entry where assigned member is "-" (no assigned member)
//     const foundEmptyTicket = await Ticket.findOne({
//       assignedMember: "-",
//     });

//     if (!foundEmptyTicket) {
//       // If no empty ticket is found, respond with a 404 error
//       return res.status(404).json({ message: "No empty ticket found." });
//     }

//     // 4. Update the ticket to assign the available member
//     const updatedTicket = await Ticket.findOneAndUpdate(
//       { _id: foundEmptyTicket._id }, // Filter by the specific ticket ID
//       { $set: { assignedMember: membersEmail } }, // Update operation using $set
//       { new: true } // Option to return the updated document
//     );

//     if (updatedTicket) {
//       // 5. Respond with the updated ticket
//       res.json({ ticket: updatedTicket });
//     } else {
//       // If the update failed for some reason, respond with a 400 error
//       res.status(400).json({ message: "Failed to update the ticket." });
//     }

//     console.log("Updated");
//     res.json({ message: "Updated assign member" });
//   } catch (error) {
//     console.error("Error updating assigned member:", error);
//     res.sendStatus(500); // Use 500 for server errors
//   }
// });

// // api for search name
// app.get("/search/:key", async (req, res) => {
//   let result = await Ticket.find({
//     $or: [
//       {
//         userName: { $regex: req.params.key },
//       },
//       {
//         createdAt: { $regex: req.params.key },
//       },
//     ],
//   });
//   res.send(result);
// });

// api for search by date
app.get("/search-by-time/:key", async (req, res) => {
  // let result = await Ticket.find({
  //   $or: [
  //     {
  //       createdAt: { $regex: req.params.key },
  //     },
  //   ],
  // });
  // res.send(result);

  try {
    // Assuming the key is a date string like "2024-08-27"
    const dateKey = new Date(req.params.key);

    // Find records created on the same date
    let result = await Ticket.find({
      createdAt: {
        $gte: dateKey, // Start of the date
        $lt: new Date(dateKey.getTime() + 24 * 60 * 60 * 1000), // End of the date
      },
    });

    res.send(result);
  } catch (error) {
    console.error("Error while searching by date:", error);
    res.status(500).send("Error while searching by date");
  }
});

// api for search name
app.get("/search-company/:key", async (req, res) => {
  let result = await Ticket.find({
    $or: [
      {
        company: { $regex: req.params.key },
      },
    ],
  });
  res.send(result);
});

// api for fetching all companies from users

app.get("/get-all-users", async (req, res) => {
  try {
    // find all user objects from the db
    const listOfAllUsers = await User.find();

    // respond with the user array containing user objects
    res.json({ users: listOfAllUsers });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

app.get("/get-a-single-user/:email", async (req, res) => {
  try {
    // Get the id from the URL
    const userEmailFromTheUrl = req.params.email;

    // Find the client in the DB using the ID
    const userFromTheDb = await User.findOne({
      email: userEmailFromTheUrl,
    });

    // Respond with that client object
    res.json({ user: userFromTheDb });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// User's reason for deleting ticket
// app.put("/users-reason-for-deleting-ticket/:id", async (req, res) => {
//   try {
//     // Get the id off the url
//     const ticketIdFromTheUrl = req.params.id;

//     // Get the reason off the req body
//     const reasonForDeletingFromRequestBody = req.body.reasonForDeleting;
//     // const bodyFromRequestBody = req.body.body;

//     // Find and update the record
//     await Ticket.findOneAndUpdate(
//       { _id: ticketIdFromTheUrl },
//       {
//         // deletedStatus: "Deleted",
//         reasonForDeleting: reasonForDeletingFromRequestBody,
//       }
//     );

//     //   Find updated ticket (using it's id)
//     const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

//     // Respond with the updated ticket (after finding it)
//     res.json({ ticket: updatedTicket });
//   } catch (error) {
//     console.log(error);
//     res.sendStatus(400);
//   }
// });

// User edits ticket
app.put("/user-edit-ticket/:id", async (req, res) => {
  try {
    // Get the id off the url
    const ticketIdFromTheUrl = req.params.id;

    // Get the edit details off the req body
    const userDepartmentFromRequestBody = req.body.userDepartment;
    const userMessageFromRequestBody = req.body.userMessage;
    // const bodyFromRequestBody = req.body.body;

    // Find and update the record
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        // deletedStatus: "Deleted",
        userDepartment: userDepartmentFromRequestBody,
        userMessage: userMessageFromRequestBody,
      }
    );

    //   Find updated ticket (using it's id)
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respond with the updated ticket (after finding it)
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// User deletes ticket
app.put("/delete-ticket/:id", async (req, res) => {
  try {
    // Get the id off the url
    const ticketIdFromTheUrl = req.params.id;

    // Get the reason off the req body
    const reasonForDeletingFromRequestBody = req.body.reasonForDeleting;
    // const bodyFromRequestBody = req.body.body;

    // Find and update the record
    await Ticket.findOneAndUpdate(
      { _id: ticketIdFromTheUrl },
      {
        deletedStatus: "Deleted",
        reasonForDeleting: reasonForDeletingFromRequestBody,
      }
    );

    //   Find updated ticket (using it's id)
    const updatedTicket = await Ticket.findById(ticketIdFromTheUrl);

    // Respond with the updated ticket (after finding it)
    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// api for search by name
app.get("/search-by-name/:key", async (req, res) => {
  let result = await Ticket.find({
    $or: [
      {
        userName: { $regex: req.params.key, $options: "i" },
      },
    ],
  });
  res.send(result);
});

// api for search by company
app.get("/search-by-company/:key", async (req, res) => {
  let result = await Ticket.find({
    $or: [
      {
        userCompany: { $regex: req.params.key, $options: "i" },
      },
    ],
  });
  res.send(result);
});

// api for search by company
app.get("/search-by-department/:key", async (req, res) => {
  let result = await Ticket.find({
    $or: [
      {
        userDepartment: { $regex: req.params.key, $options: "i" },
      },
    ],
  });
  res.send(result);
});

// api for search by member
app.get("/search-by-member/:key", async (req, res) => {
  let result = await Ticket.find({
    $or: [
      {
        assignedMember: { $regex: req.params.key, $options: "i" },
      },
    ],
  });
  res.send(result);
});

// API to handle multiple filters
app.get("/search-tickets", async (req, res) => {
  let query = {};

  if (req.query.name) {
    query.userName = { $regex: req.query.name, $options: "i" };
  }
  if (req.query.company) {
    query.userCompany = { $regex: req.query.company, $options: "i" };
  }
  if (req.query.department) {
    query.userDepartment = { $regex: req.query.department, $options: "i" };
  }
  if (req.query.member) {
    query.assignedMember = { $regex: req.query.member, $options: "i" };
  }
  if (req.query.date) {
    query.createdAt = {
      $gte: new Date(req.query.date).setHours(00, 00, 00),
      $lt: new Date(req.query.date).setHours(23, 59, 59),
    };
  }

  let result = await Ticket.find(query);
  res.send(result);
});

// // API to search company on typing in registration form
// app.get("/company-suggestions", async (req, res) => {
//   const { query } = req.query;
//   const companies = await User.find({
//     company: { $regex: query, $options: "i" },
//   }).limit(10);
//   res.json(companies);
// });

// API for searching by company name
app.get("/company-suggestions/:key", async (req, res) => {
  try {
    // const result = await User.find({
    //   company: { $regex: req.params.key, $options: "i" },
    // });

    // Ensure the input is properly sanitized
    const key = req.params.key.trim();

    // Fetch distinct company names that match the prefix
    const result = await User.distinct("company", {
      company: { $regex: `^${key}`, $options: "i" },
    });

    res.json(result);
  } catch (error) {
    res
      .status(500)
      .send({ error: "An error occurred while searching for companies" });
  }
});

// API for deleting a member using the id
app.delete("/delete-member/:id", async (req, res) => {
  try {
    // get the id off the url
    const memberIdFromTheUrl = req.params.id;

    // delete the member using the id
    await Member.deleteOne({ _id: memberIdFromTheUrl });

    // Respond with a message
    res.json({ success: "Member Deleted" });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

app.get("/view-member-availability/:email", async (req, res) => {
  try {
    // get email from the url
    const memberEmailFromTheUrl = req.params.email;

    // find in DB where email from params == email in DB
    const memberObject = await Member.findOne({
      email: memberEmailFromTheUrl,
    });

    // Respond with the member object
    res.json({ member: memberObject });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// member changes to unavailable
app.put("/member-changes-to-unavailable/:email", async (req, res) => {
  try {
    // Get the email off the url
    const memberemailFromTheUrl = req.params.email;

    // Get the data from the request body
    // const assignedMember = req.body.assignedMember;

    // Find the member in the DB & update
    await Member.findOneAndUpdate(
      { email: memberemailFromTheUrl },
      {
        availability: "Unavailable",
      }
    );

    // Find the updated member using the email
    const updatedMember = await Member.findOne({
      email: memberemailFromTheUrl,
    });

    // Respont with updated member
    res.json({ member: updatedMember });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// member changes to available
app.put("/member-changes-to-available/:email", async (req, res) => {
  try {
    // Get the id off the url
    const memberemailFromTheUrl = req.params.email;

    // Get the data from the request body
    // const assignedMember = req.body.assignedMember;

    // Find the member in the DB & update
    await Member.findOneAndUpdate(
      { email: memberemailFromTheUrl },
      {
        availability: "Available",
      }
    );

    // Find the updated member using the ID
    const updatedMember = await Member.findOne({
      email: memberemailFromTheUrl,
    });

    // Respont with updated member
    res.json({ member: updatedMember });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// POST - Create a new message
app.post("/create-message", async (req, res) => {
  try {
    // Get the sent in data off request body
    const messageFromRequestBody = req.body.message;
    const messageDepertmentFromRequestBody = req.body.messageDepertment;

    // Create a message with it (take the values from the request body / frontend and insert in the database)
    const ourCreatedMessage = await Message.create({
      message: messageFromRequestBody,
      messageDepertment: messageDepertmentFromRequestBody,
      // user: req.user._id,
    });

    // respond with the new message (this will be our response in messageman / developer tools)
    res.json({ message: ourCreatedMessage });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

app.get("/view-selected-messages/:department", async (req, res) => {
  try {
    // get email from the url
    const departmentNameFromTheUrl = req.params.department;

    // find in DB where email from params == email in DB
    const messagesArray = await Message.find({
      messageDepertment: departmentNameFromTheUrl,
    });

    // Respond with the messages object
    res.json({ messages: messagesArray });
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// Starting the server
// app.listen(process.env.PORT);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
