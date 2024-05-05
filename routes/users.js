require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI);

const userSchema = mongoose.Schema({
  userdetails: Object,
});

module.exports = mongoose.model("user", userSchema);
