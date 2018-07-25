var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectID;
if (! process.env.MONGODB_URI) {
  console.log('Error: MONGODB_URI is not set. Did you run source env.sh ?');
  process.exit(1);
}
var connect = process.env.MONGODB_URI;
mongoose.connect(connect, { useNewUrlParser: true });


var userSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: false
  }
});

var User = mongoose.model('User', userSchema);

module.exports = {
  User: User
}
