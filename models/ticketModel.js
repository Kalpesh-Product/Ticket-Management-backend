const mongoose = require("mongoose");

// const ticketSchema = new mongoose.Schema({
//   userName: String,
//   userEmail: String,
//   userCompany: String,
//   userDepartment: String,
//   userMessage: String,
//   status: String,
// });

const ticketSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    creatorEmail: { type: String, required: true },
    userCompany: { type: String, required: true },
    userDepartment: { type: String, required: true },
    userMessage: { type: String, required: true },
    status: { type: String, default: "Pending" }, // This sets the default value of status to "Pending"
    assignedMember: { type: String, default: "No Available Member" },
    memberAcceptedStatus: { type: String, default: "Not Accepted" },
    memberAcceptedTime: { type: String, default: "-" },
    memberStatus: { type: String, default: "In Progress" },
    memberTimeRequired: { type: String, default: "-" },
    memberMessageToAdmin: { type: String, default: "" },
    memberMessageToUser: { type: String, default: "-" },
    resolvedStatus: { type: String, default: "-" },
    reasonForDeleting: { type: String, default: "-" },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    time: {
      type: String,
      default: () => new Date().toTimeString().split(":").slice(0, 2).join(":"),
    },
    deletedStatus: { type: String, default: "Not Deleted" },
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;

// const Ticket = mongoose.model("Ticket", ticketSchema);

// // Function to convert timestamps to IST
// const convertToIST = (date) =>
//   moment(date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

// // Example function to get a ticket with IST timestamps
// const getTicketWithISTTimestamps = async (ticketId) => {
//   const ticket = await Ticket.findById(ticketId);
//   if (!ticket) throw new Error("Ticket not found");
//   return {
//     ...ticket.toObject(),
//     createdAtIST: convertToIST(ticket.createdAt),
//     updatedAtIST: convertToIST(ticket.updatedAt),
//   };
// };

// module.exports = { Ticket, getTicketWithISTTimestamps };
