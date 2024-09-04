const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
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
  company: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
