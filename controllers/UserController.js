const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const { gfs } = require("../connection/db");
const Notification = require("../models/NotificationModel");
const Community = require("../models/CommunityModel");

const loginUser = async (req, res) => {
  try {
    const userFind = await User.findOne({ username: req.body.username });
    if (userFind === null) {
      return res.status(400).send({
        status: "failed",
        message: "username invalid",
      });
    }
    const isMatch = await bcrypt.compare(req.body.password, userFind.password);
    if (isMatch) {
      const token = await userFind.generateToken();
      userFind.active = true;
      await userFind.save();
      return res.status(200).send({
        status: "success",
        data: userFind,
        token: token,
        message: "User login successfully",
      });
    } else {
      return res.status(400).send({
        status: "failed",
        message: "Password invalid",
      });
    }
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot login user",
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const users = await User.find();
    const findUserByUsername = users.find((user) => {
      return user.username === req.body.username;
    });
    if (findUserByUsername !== undefined) {
      return res.status(400).send({
        status: "failed",
        message: "A user with this username already exist",
      });
    }
    const findUserByEmail = users.find((user) => {
      return user.email === req.body.email;
    });
    if (findUserByEmail !== undefined) {
      return res.status(400).send({
        status: "failed",
        message: "A user with this email already exist",
      });
    }
    const userDetails = new User(req.body);
    const detailsSaved = await userDetails.save();
    return res.status(201).send({
      status: "success",
      data: userDetails,
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot register user. Please try again.",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((currToken) => {
      return currToken.token !== req.token;
    });
    await req.user.save();
    const userUpdate = await User.updateOne(
      { username: req.user.username },
      { $set: { active: false } }
    );
    res.status(200).send({
      status: "success",
      message: "User Logged Out Successfully",
    });
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot log out user. Please try again.",
    });
  }
};

const loggedInUserInformation = async (req, res) => {
  try {
    const user = await User.findById({ _id: req.user._id });
    await user.populate({
      path: "notifications",
      populate: [
        {
          path: "userTo",
        },
        {
          path: "communityId",
        },
        {
          path: "userBy",
        },
        {
          path: "postId",
          populate: [
            {
              path: "postedForUser.id",
            },
            {
              path: "postedForCommunity.id",
            },
          ],
        },
      ],
    });
    return res.status(200).send({
      status: "success",
      data: user,
      message: "Fetched Logged In User Information Successfully",
    });
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot get logged in user information. Please try again.",
    });
  }
};

const getUserByName = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.name,
    });
    if (user === null) {
      res.status(400).send({
        status: "failed",
        message: "No user with this name exist",
      });
    } else {
      await user.populate({
        path: "posts.id",
        populate: [
          {
            path: "postedBy.id",
          },
          {
            path: "postedForCommunity.id",
          },
          {
            path: "postedForUser.id",
          },
        ],
      });
      res.status(200).send({
        status: "success",
        data: user,
        message: "User found successfully",
      });
    }
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot found user. Please try again.",
    });
  }
};

const userFollow = async (req, res) => {
  let count = 0;
  try {
    const updateLoggedInUser = await User.findByIdAndUpdate(
      { _id: req.user._id },
      { $push: { usersFollow: { id: req.body.userFollowedId } } }
    );
    const followedUserUpdate = await User.findByIdAndUpdate(
      { _id: req.body.userFollowedId },
      { $push: { usersFollowers: { id: req.user._id } } }
    );
    const getPostsOfFollowedUser = await User.findById(
      { _id: req.body.userFollowedId },
      "posts"
    );

    for (let i = getPostsOfFollowedUser.posts.length - 1; i >= 0; i--) {
      count++;
      const status = updateLoggedInUser.postsForUser.find((post) => {
        return (
          post.toString() === getPostsOfFollowedUser.posts[i].id.toString()
        );
      });
      count <= 3 &&
        status === undefined &&
        updateLoggedInUser.postsForUser.unshift(
          getPostsOfFollowedUser.posts[i].id
        );
    }
    const data = {
      notificationType: "followUser",
      userBy: req.user._id,
      userTo: followedUserUpdate._id,
      postId: null,
      notificationInfo: {
        userByPicture: req.user.picture,
        postPicture: null,
        text: `started following you`,
        userByName: req.user.username,
        communityName: null,
      },
    };
    const notificationCreated = new Notification(data);
    await notificationCreated.save();
    await User.updateOne(
      { _id: followedUserUpdate._id },
      {
        $push: { notifications: notificationCreated._id },
        $inc: { newNotification: 1 },
      }
    );
    await updateLoggedInUser.save();
    res.status(204).send({
      status: "success",
      message: "user followed successfully",
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot follow user. Please try again.",
    });
  }
};

const userUnfollow = async (req, res) => {
  try {
    const updateLoggedInUser = await User.findByIdAndUpdate(
      { _id: req.user._id },
      { $pull: { usersFollow: { id: req.body.userUnfollowedId } } }
    );
    const followedUserUpdate = await User.findByIdAndUpdate(
      { _id: req.body.userUnfollowedId },
      { $pull: { usersFollowers: { id: req.user._id } } }
    );
    const userPosts = await User.findById({ _id: req.user._id }).populate(
      "postsForUser"
    );
    userPosts.postsForUser = userPosts.postsForUser.filter((post) => {
      return (
        post?.postedForType === "community" ||
        (post?.postedForType === "user" &&
          post?.postedForUser?.id.toString() !==
            req.body.userUnfollowedId.toString())
      );
    });
    await userPosts.save();
    res.status(204).send({
      status: "success",
      message: "user unfollowed successfully",
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot unfollow user. Please try again.",
    });
  }
};

const userUpdateInfo = async (req, res) => {
  try {
    const userUpdate = await User.findByIdAndUpdate(
      { _id: req.user._id },
      req.body
    );
    const findUser = await User.findById({ _id: req.user._id });
    res.status(200).send({
      status: "success",
      message: "user updated successfully",
      data: findUser,
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot update user. Please try again.",
    });
  }
};

const userUploadTempImage = async (req, res) => {
  try {
    return res.status(200).send({
      status: "success",
      data: req.file,
      message: "file uploaded temporarily",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot be uploaded. Please try again later.",
    });
  }
};

const userRemoveImage = async (req, res) => {
  try {
    const deletedFile = await gfs.grid.files.deleteOne({
      filename: req.params.filename,
    });
    res.status(204).send({
      status: "success",
      message: "Image deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot delete image. Please try again later.",
    });
  }
};

const searchUsersAndCommunities = async (req, res) => {
  try {
    const findUsers = await User.find({
      username: { $regex: `${req.params.query}` },
    });
    const findCommunities = await Community.find({
      communityName: { $regex: `${req.params.query}` },
    });
    res.status(200).send({
      status: "success",
      message: "users and communities fetched",
      data: {
        findUsers,
        findCommunities,
      },
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot fetch users and communities. Please try again later.",
    });
  }
};

const answerInviteRequest = async (req, res) => {
  try {
    const findNotification = await Notification.findOne({
      _id: req.body.notificationId,
    });
    if (findNotification === null) {
      return res.status(400).send({
        status: "failed",
        message: "This request does not exist anymore",
      });
    }
    const communityFind = await Community.findOne({
      _id: findNotification.communityId,
    });
    const findModIndex = communityFind.invitedUsersForMod.findIndex((mod) => {
      return mod.notificationId.toString() === findNotification._id.toString();
    });
    if (req.body.status === "reject") {
      communityFind.invitedUsersForMod =
        communityFind.invitedUsersForMod.filter((mod) => {
          return (
            mod.notificationId.toString() !== findNotification._id.toString()
          );
        });
      await communityFind.save();
    } else {
      const data = {
        notificationType: "communityAcceptOrDeclineRequest",
        userBy: req.user._id,
        userTo: findNotification.userBy,
        communityId: findNotification.communityId,
        notificationInfo: {
          userByPicture: req.user.picture,
          postPicture: null,
          text: `accepted your request to join ${findNotification.notificationInfo.communityName} community`,
          userByName: req.user.username,
          communityName: findNotification.notificationInfo.communityName,
        },
      };
      const notificationCreated = new Notification(data);
      await notificationCreated.save();
      await User.updateOne(
        { _id: findNotification.userBy },
        {
          $push: { notifications: notificationCreated._id },
          $inc: { newNotification: 1 },
        }
      );
      const communityUpdate = await Community.updateOne(
        { _id: findNotification.communityId },
        {
          $push: {
            moderators: {
              id: req.user._id,
              permissions:
                communityFind.invitedUsersForMod[findModIndex].permissions,
            },
          },
        }
      );
      communityFind.invitedUsersForMod =
        communityFind.invitedUsersForMod.filter((mod) => {
          return (
            mod.notificationId.toString() !== findNotification._id.toString()
          );
        });
      await communityFind.save();
    }
    const removeNotification = await Notification.deleteOne({
      _id: findNotification._id,
    });
    const userUpdate = await User.updateOne(
      { _id: req.user._id },
      { $pull: { notifications: findNotification._id } }
    );
    if (req.body.status === "reject") {
      return res.status(200).send({
        status: "success",
        message: "Request Rejected",
      });
    } else {
      return res.status(200).send({
        status: "success",
        message: "Request Accepted",
      });
    }
  } catch (eror) {
    res.status(500).send({
      status: "failed",
      message: `cannot ${req.body.status} request. Please try again later.`,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  loggedInUserInformation,
  logoutUser,
  getUserByName,
  userFollow,
  userUnfollow,
  userUploadTempImage,
  userRemoveImage,
  userUpdateInfo,
  searchUsersAndCommunities,
  answerInviteRequest,
};
