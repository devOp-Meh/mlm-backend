import User from "../Models/UserModel.js";

export const addUser = async (req, res) => {
  const { name, email, parentIdentifier, side } = req.body;

  try {
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }
    if (name.length > 32) {
      return res.status(400).json({ message: "Name should not be more than 32 characters." });
    }
    if (email.length > 240) {
      return res.status(400).json({ message: "Email should not be more than 240 characters." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email already exists." });
    }

    let newUser;

    if (!parentIdentifier) {
      const existingRoot = await User.findOne({ parentIdentifier: null });
      if (existingRoot) {
        return res.status(400).json({
          message: "Root user already exists. Use the parentIdentifier to add users to the tree.",
        });
      }

      newUser = new User({ name, email, parentIdentifier: null });
      await newUser.save();
      return res.status(201).json({ message: "Root user added successfully!", user: newUser });
    }

    const parent = await User.findOne({
      $or: [
        { email: parentIdentifier },
        { referralCode: parentIdentifier },
      ],
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent user not found." });
    }

    if (side === "left" && parent.leftChild) {
      return res.status(400).json({ message: "Left node is already occupied." });
    }

    if (side === "right" && parent.rightChild) {
      return res.status(400).json({ message: "Right node is already occupied." });
    }

    newUser = new User({ name, email, parentIdentifier: parent._id });

    if (side === "left") {
      parent.leftChild = newUser._id;
    } else if (side === "right") {
      parent.rightChild = newUser._id;
    }

    await parent.save();
    await newUser.save();

    return res.status(201).json({ message: "User added successfully!", user: newUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// To fetch all the data in excel sheet 
export const getAllUsers = async (req, res) => {
  try {
    const fetchTreeWithCount = async (user) => {
      if (!user) return null;

      const leftChild = user.leftChild ? await User.findById(user.leftChild) : null;
      const rightChild = user.rightChild ? await User.findById(user.rightChild) : null;

      const leftTree = await fetchTreeWithCount(leftChild);
      const rightTree = await fetchTreeWithCount(rightChild);

      const downlineCount =
        (leftTree?.downlineCount || 0) + (rightTree?.downlineCount || 0) + 1;

      return {
        ...user.toObject(),
        leftChild: leftTree,
        rightChild: rightTree,
        downlineCount,
        leftChildName: leftTree ? leftTree.name : null,
        rightChildName: rightTree ? rightTree.name : null,
      };
    };

    const users = await User.find().sort({ _id: 1 });

    const usersWithChildren = await Promise.all(
      users.map(async (user) => await fetchTreeWithCount(user))
    );

    res.status(200).json({ users: usersWithChildren });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "An error occurred while fetching users." });
  }
};


export const getRootUsers = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const fetchTreeWithCount = async (user) => {
      if (!user) return null;

      const leftChild = user.leftChild ? await User.findById(user.leftChild) : null;
      const rightChild = user.rightChild ? await User.findById(user.rightChild) : null;

      const leftTree = await fetchTreeWithCount(leftChild);
      const rightTree = await fetchTreeWithCount(rightChild);

      const downlineCount =
        (leftTree?.downlineCount || 0) + (rightTree?.downlineCount || 0)+1;

      return {
        ...user.toObject(),
        leftChild: leftTree,
        rightChild: rightTree,
        downlineCount,
        leftChildName: leftTree ? leftTree.name : null,
        rightChildName: rightTree ? rightTree.name : null, 
      };
    };

    const rootUsers = await User.find({ parentIdentifier: null })
      .sort({ _id: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const usersWithChildren = await Promise.all(
      rootUsers.map(async (user) => await fetchTreeWithCount(user))
    );

    const total = await User.countDocuments({ parentIdentifier: null });

    res.status(200).json({ users: usersWithChildren, total });
  } catch (error) {
    console.error("Error fetching root users:", error);
    res.status(500).json({ message: "An error occurred while fetching root users." });
  }
};

export const getDownline = async (req, res) => {
  const { userEmail } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const user = await User.findOne({ email: userEmail })
      .populate("leftChild")
      .populate("rightChild");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const buildTree = async (node, page, limit) => {
      if (!node || limit === 0) return null;

      const leftChild = node.leftChild
        ? await User.findById(node.leftChild)
            .populate("leftChild")
            .populate("rightChild")
        : null;
      const rightChild = node.rightChild
        ? await User.findById(node.rightChild)
            .populate("leftChild")
            .populate("rightChild")
        : null;

      const treeNode = {
        userId: node._id,
        userName: node.name,
        referralCode: node.referralCode,
        left: leftChild ? await buildTree(leftChild, page, limit - 1) : null,
        right: rightChild ? await buildTree(rightChild, page, limit - 1) : null,
      };

      return treeNode;
    };

    const tree = await buildTree(user, page, limit);

    res.status(200).json({
      users: tree,
      hasMore: limit > 0, 
    });
  } catch (err) {
    console.error("Error fetching downline:", err.message);
    res.status(500).json({ message: "An error occurred while fetching the downline." });
  }
};




export const getByUserIp = async (req, res) => {
  const { userIp } = req.params;

  try {
    const findUser = await User.findOne({
      $or: [
        { name: { $regex: userIp, $options: "i" } },
        { email: { $regex: userIp, $options: "i" } },
        { referralCode: { $regex: userIp, $options: "i" } },
      ],
    });

    if (!findUser) {
      return res.status(404).json({ message: "No user found with the given query!" });
    }

    const leftChild = findUser.leftChild ? await User.findById(findUser.leftChild) : null;
    const rightChild = findUser.rightChild ? await User.findById(findUser.rightChild) : null;

    const totalUsers = [leftChild, rightChild].filter((child) => child !== null).length;

    res.status(200).json({
      name: findUser.name,
      email: findUser.email,
      referralCode: findUser.referralCode,
      totalUsers,
      leftChild: leftChild
        ? { name: leftChild.name, email: leftChild.email, referralCode: leftChild.referralCode }
        : null,
      rightChild: rightChild
        ? { name: rightChild.name, email: rightChild.email, referralCode: rightChild.referralCode }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Error searching user!" });
  }
};