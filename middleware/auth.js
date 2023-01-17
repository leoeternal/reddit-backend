const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

const auth = async (req, res, next) => {
  try {
    const token = req.headers["x-access-token"];
    const verifyUser = jwt.verify(token, process.env.SECRET_STRING);
    const userFind = await User.findOne({ _id: verifyUser._id });
    req.token = token;
    req.user = userFind;
    next();
  } catch (error) {
    res.status(401).send({
      status: "failed",
      message: "Authentication Failed. Please Log in.",
    });
  }
};

module.exports = auth;
