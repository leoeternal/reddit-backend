const mongoose = require("mongoose");
const { gfs, db } = require("../connection/db");
const Community = require("../models/CommunityModel");
const Post = require("../models/PostModel");
const User = require("../models/UserModel");
const Comment = require("../models/CommentModel");
const Notification = require("../models/NotificationModel");

const createPost = async (req, res) => {
  try {
    const postData = new Post(req.body);
    const postSaved = await postData.save();
    if (req.body.postedForType === "community") {
      const community = await Community.findById({
        _id: req.body.postedForCommunity.id,
      });
      const communityUpdate = await Community.findByIdAndUpdate(
        { _id: req.body.postedForCommunity.id },
        { $push: { posts: { postId: postData._id } } }
      );
      await community.populate("members.id");
      for (let i = 0; i < community.members.length; i++) {
        const userUpdate = await User.findByIdAndUpdate(
          { _id: community.members[i].id._id },
          { $push: { postsForUser: postData._id } }
        );
      }
      const postedByUser = await User.findById({ _id: req.user._id }).populate(
        "usersFollowers.id"
      );
      for (let i = 0; i < postedByUser.usersFollowers.length; i++) {
        const status = community.members.find((member) => {
          return (
            member.id._id.toString() ===
            postedByUser.usersFollowers[i].id._id.toString()
          );
        });
        if (status === undefined) {
          const userUpdate = await User.findByIdAndUpdate(
            { _id: postedByUser.usersFollowers[i].id._id },
            { $push: { postsForUser: postData._id } }
          );
        }
      }
    } else {
      const user = await User.findById({
        _id: req.user._id,
      }).populate("usersFollowers.id");
      for (let i = 0; i < user.usersFollowers.length; i++) {
        const userUpdate = await User.findByIdAndUpdate(
          { _id: user.usersFollowers[i].id._id },
          { $push: { postsForUser: postData._id } }
        );
      }
      const userUpdate = await User.findByIdAndUpdate(
        { _id: req.user._id },
        { $push: { postsForUser: postData._id } }
      );
    }
    const userUpdate = await User.findByIdAndUpdate(
      { _id: req.user._id },
      { $push: { posts: { id: postData._id } } }
    );
    res.status(201).send({
      status: "success",
      data: postData,
      message: "Post created successfully.",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Post cannot be created. Please try again later.",
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const getPost = await Post.findById({ _id: req.params.postId });
    if (getPost === null) {
      res.status(400).send({
        status: "failed",
        message: "No post exist",
      });
    } else {
      await getPost.populate("postedBy.id");
      await getPost.populate({
        path: "comments",
        populate: [
          {
            path: "postedBy",
          },
          {
            path: "post",
            populate: [
              {
                path: "postedForCommunity.id",
              },
              {
                path: "postedBy.id",
              },
            ],
          },
          {
            path: "replies",
            populate: [
              {
                path: "postedBy",
              },
              {
                path: "comment",
              },
              {
                path: "post",
                populate: [
                  {
                    path: "postedForCommunity.id",
                  },
                  {
                    path: "postedBy.id",
                  },
                ],
              },
            ],
          },
        ],
      });
      getPost.postedForType === "community"
        ? await getPost.populate("postedForCommunity.id")
        : await getPost.populate("postedForUser.id");
      res.status(200).send({
        status: "success",
        message: "Post fetched",
        data: getPost,
      });
    }
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Post cannot be fetched. Please try again later.",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const getPosts = await Post.find().sort({ createdAt: -1 });
    for (let i = 0; i < getPosts.length; i++) {
      await getPosts[i].populate("postedBy.id");
      getPosts[i].postedForType === "community"
        ? await getPosts[i].populate("postedForCommunity.id")
        : await getPosts[i].populate("postedForUser.id");
    }
    res.status(200).send({
      status: "success",
      message: "Posts fetched",
      data: getPosts,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Posts cannot be fetched. Please try again later.",
    });
  }
};

const getAllPostsOfLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById({ _id: req.user._id });
    await user.populate({
      path: "postsForUser",
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
      message: "Posts fetched",
      data: user.postsForUser,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Posts cannot be fetched. Please try again later.",
    });
  }
};

const likePost = async (req, res) => {
  try {
    const tempPost = await Post.findById({ _id: req.params.postId });
    if (tempPost.postedBy.id.toString() !== req.user._id.toString()) {
      const userKarmaUpdate = await User.updateOne(
        { _id: tempPost.postedBy.id },
        { $inc: { karma: 1 } }
      );
    }

    const postAlreadyLikedStatus = tempPost.upvotes.find((upvote) => {
      return upvote.toString() === req.user._id.toString();
    });
    const postAlreadyDislikedStatus = tempPost.downvotes.find((downvote) => {
      return downvote.toString() === req.user._id.toString();
    });
    if (
      postAlreadyLikedStatus === undefined &&
      postAlreadyDislikedStatus === undefined
    ) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $push: { upvotes: req.user._id } }
      );
    } else if (postAlreadyLikedStatus !== undefined) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $pull: { upvotes: req.user._id } }
      );
    } else if (
      postAlreadyLikedStatus === undefined &&
      postAlreadyDislikedStatus !== undefined
    ) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $push: { upvotes: req.user._id }, $pull: { downvotes: req.user._id } }
      );
    }
    const post = await Post.findById({ _id: req.params.postId });
    await post.populate("postedBy.id");
    await post.populate({
      path: "comments",
      populate: [
        {
          path: "postedBy",
        },
        {
          path: "comment",
        },
        {
          path: "post",
          populate: [
            {
              path: "postedForCommunity.id",
            },
            {
              path: "postedBy.id",
            },
          ],
        },
        {
          path: "replies",
          populate: [
            {
              path: "postedBy",
            },
            {
              path: "comment",
            },
            {
              path: "post",
              populate: [
                {
                  path: "postedForCommunity.id",
                },
                {
                  path: "postedBy.id",
                },
              ],
            },
          ],
        },
      ],
    });
    post.postedForType === "community"
      ? await post.populate("postedForCommunity.id")
      : await post.populate("postedForUser.id");
    if (
      postAlreadyLikedStatus === undefined &&
      req.user._id.toString() !== post.postedBy.id._id.toString()
    ) {
      const data = {
        notificationType: "postLike",
        userBy: req.user._id,
        userTo: post.postedBy.id._id,
        postId: post._id,
        notificationInfo: {
          userByPicture: req.user.picture,
          postPicture: post.postType === "media" ? post.picture : null,
          text: `liked your post${
            post.postType === "text" ? `: ${post.title.slice(0, 20)}` : ""
          }`,
          userByName: req.user.username,
          communityName: null,
        },
      };
      const notificationCreated = new Notification(data);
      await notificationCreated.save();
      await User.updateOne(
        { _id: post.postedBy.id._id },
        {
          $push: { notifications: notificationCreated._id },
          $inc: { newNotification: 1 },
        }
      );
    }
    res.status(200).send({
      status: "success",
      message: "Post upvoted",
      data: post,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot be upvoted. Please try again later.",
    });
  }
};

const dislikePost = async (req, res) => {
  try {
    const tempPost = await Post.findById({ _id: req.params.postId });
    if (tempPost.postedBy.id.toString() !== req.user._id.toString()) {
      const userKarmaUpdate = await User.updateOne(
        { _id: tempPost.postedBy.id },
        { $inc: { karma: -1 } }
      );
    }

    const postAlreadyLikedStatus = tempPost.upvotes.find((upvote) => {
      return upvote.toString() === req.user._id.toString();
    });
    const postAlreadyDislikedStatus = tempPost.downvotes.find((downvote) => {
      return downvote.toString() === req.user._id.toString();
    });
    if (
      postAlreadyLikedStatus === undefined &&
      postAlreadyDislikedStatus === undefined
    ) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $push: { downvotes: req.user._id } }
      );
    } else if (postAlreadyDislikedStatus !== undefined) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $pull: { downvotes: req.user._id } }
      );
    } else if (
      postAlreadyLikedStatus !== undefined &&
      postAlreadyDislikedStatus === undefined
    ) {
      const postUpdate = await Post.findByIdAndUpdate(
        { _id: req.params.postId },
        { $pull: { upvotes: req.user._id }, $push: { downvotes: req.user._id } }
      );
    }
    const post = await Post.findById({ _id: req.params.postId });
    await post.populate("postedBy.id");
    await post.populate({
      path: "comments",
      populate: [
        {
          path: "postedBy",
        },
        {
          path: "comment",
        },
        {
          path: "post",
          populate: [
            {
              path: "postedForCommunity.id",
            },
            {
              path: "postedBy.id",
            },
          ],
        },
        {
          path: "replies",
          populate: [
            {
              path: "postedBy",
            },
            {
              path: "comment",
            },
            {
              path: "post",
              populate: [
                {
                  path: "postedForCommunity.id",
                },
                {
                  path: "postedBy.id",
                },
              ],
            },
          ],
        },
      ],
    });
    post.postedForType === "community"
      ? await post.populate("postedForCommunity.id")
      : await post.populate("postedForUser.id");

    res.status(200).send({
      status: "success",
      message: "Post downvoted",
      data: post,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "post cannot be downvoted. Please try again later.",
    });
  }
};

const uploadTempImage = async (req, res) => {
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

const renderImage = async (req, res) => {
  try {
    const file = await gfs.grid.files.findOne({
      filename: req.params.filename,
    });
    if (file === undefined || file === null) {
      return res.status(400).send({
        status: "failed",
        message: "Image not found",
      });
    }
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "uploads",
    });
    const readStream = bucket.openDownloadStreamByName(file.filename);
    readStream.pipe(res);
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot find image. Please try again later.",
    });
  }
};

const removeImage = async (req, res) => {
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

const deletePost = async (req, res) => {
  try {
    const findPost = await Post.findById({ _id: req.params.postId });
    if (findPost === null) {
      res.status(400).send({
        status: "failed",
        message: "post does not exist",
      });
    }
    const postDeleted = await Post.findByIdAndRemove({
      _id: req.params.postId,
    });
    const commentsDeleted = await Comment.deleteMany({
      post: req.params.postId,
    });
    const usersWithThisPostInPostsForUserArray = await User.find({
      postsForUser: req.params.postId,
    });
    for (let i = 0; i < usersWithThisPostInPostsForUserArray.length; i++) {
      usersWithThisPostInPostsForUserArray[i].postsForUser =
        usersWithThisPostInPostsForUserArray[i].postsForUser.filter((post) => {
          return post.toString() !== req.params.postId.toString();
        });
      await usersWithThisPostInPostsForUserArray[i].save();
    }
    const userWithThisPostInPostsArray = await User.findByIdAndUpdate(
      { _id: findPost.postedBy.id },
      { $pull: { posts: { id: req.params.postId } } }
    );
    if (findPost.postedForType === "community") {
      const communityUpdate = await Community.findByIdAndUpdate(
        { _id: findPost.postedForCommunity.id },
        { $pull: { posts: { postId: req.params.postId } } }
      );
    }

    res.status(200).send({
      status: "success",
      message: "post deleted successfully",
      data: postDeleted,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "Cannot deleted. Please try again later",
    });
  }
};

module.exports = {
  createPost,
  getPostById,
  getAllPostsOfLoggedInUser,
  getAllPosts,
  likePost,
  dislikePost,
  uploadTempImage,
  renderImage,
  removeImage,
  deletePost,
};
