import express from "express";
import { addUser, getAllUsers, getByUserIp, getDownline, getRootUsers } from "../Controller/UserController.js";

const router = express.Router();

// Register a new user
router.post('/create', addUser);

// Fetch rootusers tree
router.get("/root-users",getRootUsers);

// Fetch all data for excel sheet
router.get("/all-users",getAllUsers);

// Fetch tree using userID
router.get('/tree/:userEmail', getDownline);

// Get by referral code
router.get('/search/:userIp',getByUserIp)


export default router;
