import mongoose from "mongoose";
import {nanoid} from "nanoid";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  referralCode: { type: String, default: () => nanoid(8) },
  parentIdentifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  leftChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rightChild: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

const User = mongoose.model('User', userSchema);
export default User;