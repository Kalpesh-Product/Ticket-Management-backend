const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String },
  email: {
    type: String,
    required: true, // this makes the field required
    unique: true, // every email in our DB has to be unique
    lowercase: true, // this will convert any email that comes into lowercase
    index: true, // this makes quering by email a lot faster, but it also makes the DB a little bit bigger
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
