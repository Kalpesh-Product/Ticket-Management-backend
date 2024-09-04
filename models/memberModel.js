const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
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
    default: "Member",
  },
  availability: {
    type: String,
    required: true,
    default: "Available",
  },
});

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
