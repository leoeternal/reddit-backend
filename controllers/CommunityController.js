const Community = require("../models/CommunityModel");
const Notification = require("../models/NotificationModel");
const { gfs } = require("../connection/db");
const User = require("../models/UserModel");

const createCommunity = async (req, res) => {
  const data = {
    communityName: req.body.communityName,
    type: req.body.type,
    createdBy: {
      id: req.user._id,
    },
  };
  try {
    const communities = await Community.find();
    const findCommunityByname = communities.find((community) => {
      return community.communityName === req.body.communityName;
    });
    if (findCommunityByname !== undefined) {
      return res.status(400).send({
        status: "failed",
        message: "A community with this name already exist",
      });
    }
    const communityCreated = new Community(data);
    const communitySaved = await communityCreated.save();
    const communityUpdate = await Community.findByIdAndUpdate(
      { _id: communityCreated._id },
      {
        $push: {
          members: { id: req.user._id },
        },
      }
    );
    const userUpdate = await User.findByIdAndUpdate(
      { _id: req.user._id },
      {
        $push: {
          communities: { id: communityCreated._id },
          communitiesFollow: { id: communityCreated._id },
        },
      }
    );
    res.status(201).send({
      status: "success",
      data: communitySaved,
      message: "Community created successfully",
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot create community. Please try again.",
    });
  }
};

const getCommunityByName = async (req, res) => {
  try {
    const community = await Community.findOne({
      communityName: req.params.name,
    });
    if (community === null) {
      res.status(400).send({
        status: "failed",
        message: "No community with this name exist",
      });
    } else {
      await community.populate("moderators.id");
      await community.populate("members.id");
      await community.populate("createdBy.id");
      await community.populate("invitedUsersForMod.id");
      await community.populate({
        path: "posts.postId",
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
        data: community,
        message: "Community found successfully",
      });
    }
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot found community. Please try again.",
    });
  }
};

const getAllCommunitiesOfUser = async (req, res) => {
  try {
    const memberCommunities = await Community.find({
      "members.id": req.user._id,
    }).populate();
    const modCommunities = await Community.find({
      "moderators.id": req.user._id,
    }).populate();
    const createdCommunities = await Community.find({
      "createdBy.id": req.user._id,
    }).populate();
    res.status(200).send({
      status: "success",
      data: { memberCommunities, modCommunities, createdCommunities },
      message: "Communities fetched successfully",
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot found communities. Please try again.",
    });
  }
};

const communityFollow = async (req, res) => {
  let count = 0;
  try {
    const communityUpdate = await Community.findByIdAndUpdate(
      { _id: req.body.communityId },
      { $push: { members: { id: req.user._id } } }
    );
    const userUpdate = await User.findByIdAndUpdate(
      { _id: req.user._id },
      { $push: { communitiesFollow: { id: req.body.communityId } } }
    );
    const getPostsOfCommunity = await Community.findById(
      { _id: req.body.communityId },
      "posts"
    );

    for (let i = getPostsOfCommunity.posts.length - 1; i >= 0; i--) {
      count++;
      const status = userUpdate.postsForUser.find((post) => {
        return (
          post.toString() === getPostsOfCommunity.posts[i].postId.toString()
        );
      });
      count <= 3 &&
        status === undefined &&
        userUpdate.postsForUser.unshift(getPostsOfCommunity.posts[i].postId);
    }
    await userUpdate.save();
    res.status(204).send({
      status: "success",
      message: "member added in this community",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot add member in this community",
    });
  }
};

const communityUnfollow = async (req, res) => {
  try {
    const communityUpdate = await Community.findByIdAndUpdate(
      { _id: req.body.communityId },
      { $pull: { members: { id: req.user._id } } }
    );
    const userUpdate = await User.findByIdAndUpdate(
      { _id: req.user._id },
      { $pull: { communitiesFollow: { id: req.body.communityId } } }
    );
    // const communityFind = await Community.findById({
    //   _id: req.body.communityId,
    // });
    // const userFind = await User.findById({ _id: req.user._id });
    const userPosts = await User.findById({ _id: req.user._id }).populate(
      "postsForUser"
    );
    userPosts.postsForUser = userPosts.postsForUser.filter((post) => {
      const followStatus = userPosts.usersFollow.find((user) => {
        return user.id.toString() === post.postedBy.id.toString();
      });
      return (
        post?.postedForType === "user" ||
        followStatus !== undefined ||
        (post?.postedForType === "community" &&
          post?.postedForCommunity?.id.toString() !==
            req.body.communityId.toString())
      );
    });
    await userPosts.save();

    res.status(204).send({
      status: "success",
      message: "member removed from this community",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot remove member from this community",
    });
  }
};

const topCommunities = async (req, res) => {
  try {
    const communities = await Community.aggregate([
      {
        $project: {
          communityName: 1,
          type: 1,
          createdBy: 1,
          communityPicture: 1,
          postsQuantity: 1,
          posts: 1,
          description: 1,
          moderators: 1,
          members: 1,
          length: { $size: "$members" },
        },
      },
      { $sort: { length: -1 } },
      { $limit: 5 },
    ]);
    res.status(200).send({
      data: communities,
      status: "success",
      message: "fetched top 5 communities",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot fetch top 5 communities",
    });
  }
};

const communityUpdateInfo = async (req, res) => {
  const communityId = req.params.communityId;
  const updateData = req.body;
  try {
    const communityUpdate = await Community.findByIdAndUpdate(
      { _id: communityId },
      updateData
    );
    const findCommunity = await Community.findById({
      _id: communityId,
    });
    await findCommunity.populate("moderators.id");
    await findCommunity.populate("members.id");
    await findCommunity.populate("createdBy.id");
    await findCommunity.populate({
      path: "posts.postId",
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
      message: "community updated successfully",
      data: findCommunity,
    });
  } catch (eror) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot update community. Please try again.",
    });
  }
};

const inviteUserForMod = async (req, res) => {
  const { inviteUsername, accessList, communityName } = req.body;
  const permissions = [];
  accessList.map((list) => {
    permissions.push(list.permission);
  });
  try {
    const userFind = await User.findOne({ username: inviteUsername });
    const communityFind = await Community.findOne({ communityName });

    if (userFind === null) {
      return res.status(400).send({
        status: "failed",
        message: "No user with this username exist",
      });
    }

    if (userFind._id.toString() === req.user._id.toString()) {
      return res.status(400).send({
        status: "failed",
        message: "That user is already a moderator",
      });
    }
    const alreadyModerator = communityFind.moderators.find((mod) => {
      return mod.id.toString() === userFind._id.toString();
    });
    if (alreadyModerator !== undefined) {
      return res.status(400).send({
        status: "failed",
        message: "That user is already a moderator",
      });
    }
    const alreadyInvited = communityFind.invitedUsersForMod.find((mod) => {
      return (
        mod.id.toString() === userFind._id.toString() &&
        mod.status !== "rejected"
      );
    });
    if (alreadyInvited !== undefined) {
      return res.status(400).send({
        status: "failed",
        message: "A request has already been sent to this user",
      });
    }
    const data = {
      notificationType: "inviteUserForCommunity",
      userBy: req.user._id,
      userTo: userFind._id,
      communityId: communityFind._id,
      notificationInfo: {
        userByPicture: req.user.picture,
        postPicture: null,
        text: `invited you to join ${communityFind.communityName} community`,
        userByName: req.user.username,
        communityName: communityFind.communityName,
      },
    };
    const notificationCreated = new Notification(data);
    await notificationCreated.save();
    await User.updateOne(
      { _id: userFind._id },
      {
        $push: { notifications: notificationCreated._id },
        $inc: { newNotification: 1 },
      }
    );
    const communityUpdate = await Community.updateOne(
      { communityName },
      {
        $push: {
          invitedUsersForMod: {
            id: userFind._id,
            permissions,
            notificationId: notificationCreated._id,
            createdAt: new Date(),
          },
        },
      }
    );
    const communityFindForInviteId = await Community.findOne({ communityName });
    return res.status(200).send({
      status: "success",
      message: "Invite request has been sent to the user",
      data: {
        id: userFind,
        permissions,
        notificationId: notificationCreated._id,
        createdAt: new Date(),
        _id: communityFindForInviteId.invitedUsersForMod[
          communityFindForInviteId.invitedUsersForMod.length - 1
        ]._id,
      },
    });
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot invite user. Please try again.",
    });
  }
};

const deleteInvitedRequestToUser = async (req, res) => {
  const { inviteId, notificationId, userId, communityId } = req.body.data;
  try {
    const communityUpdate = await Community.updateOne(
      { _id: communityId },
      { $pull: { invitedUsersForMod: { _id: inviteId } } }
    );
    const notificationUpdate = await Notification.deleteOne({
      _id: notificationId,
    });
    const userUpdate = await User.updateOne(
      { _id: userId },
      {
        $pull: { notifications: notificationId },
        $inc: { newNotification: -1 },
      }
    );
    res.status(200).send({
      status: "success",
      message: "Invite request deleted",
      data: req.body.data,
    });
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Cannot delete invite request. Please try again.",
    });
  }
};

const communityUploadTempImage = async (req, res) => {
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

const communityRemoveImage = async (req, res) => {
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

const leaveMod = async (req, res) => {
  const communityId = req.params.communityId;
  try {
    const findCommunity = await Community.findOne({ _id: communityId });
    if (findCommunity === null) {
      return res.status(400).send({
        status: "failed",
        message: "This community does not exist anymore",
      });
    }
    await Community.updateOne(
      { _id: communityId },
      { $pull: { moderators: { id: req.user._id } } }
    );
    res.status(200).send({
      status: "success",
      data: req.user._id,
      message: "Moderator removed",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot remove mod. Please try again later.",
    });
  }
};

module.exports = {
  createCommunity,
  getCommunityByName,
  getAllCommunitiesOfUser,
  communityFollow,
  communityUnfollow,
  topCommunities,
  communityUpdateInfo,
  inviteUserForMod,
  deleteInvitedRequestToUser,
  communityRemoveImage,
  communityUploadTempImage,
  leaveMod,
};
