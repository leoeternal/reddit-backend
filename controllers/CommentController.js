const Comment = require("../models/CommentModel");
const Notification = require("../models/NotificationModel");
const Post = require("../models/PostModel");
const User = require("../models/UserModel");

const createComment = async (req, res) => {
  try {
    const commentData = new Comment(req.body);
    const commentSaved = await commentData.save();
    const postUpdate = await Post.findByIdAndUpdate(
      { _id: req.body.post },
      { $push: { comments: commentData._id } }
    );
    await commentData.populate("postedBy");
    await commentData.populate("post");
    await commentData.populate("post.postedBy.id");
    await commentData.populate("post.postedForCommunity.id");
    if (
      req.user._id.toString() !== commentData.post.postedBy.id._id.toString()
    ) {
      const data = {
        notificationType: "postComment",
        userBy: req.user._id,
        userTo: commentData.post.postedBy.id,
        postId: commentData.post._id,
        notificationInfo: {
          userByPicture: req.user.picture,
          postPicture:
            commentData.post.postType === "media"
              ? commentData.post.picture
              : null,
          text: `commented: ${commentData.text.slice(0, 20)}`,
          userByName: req.user.username,
          communityName: null,
        },
      };
      const notificationCreated = new Notification(data);
      await notificationCreated.save();
      await User.updateOne(
        { _id: commentData.post.postedBy.id },
        {
          $push: { notifications: notificationCreated._id },
          $inc: { newNotification: 1 },
        }
      );
    }

    res.status(201).send({
      status: "success",
      data: commentData,
      message: "Comment created successfully",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot create commnent. Please try again later.",
    });
  }
};

const createReply = async (req, res) => {
  req.body.replyData.comment = req.body.commentId;
  try {
    const replyData = new Comment(req.body.replyData);
    const replySaved = await replyData.save();
    const commentUpdate = await Comment.findByIdAndUpdate(
      { _id: req.body.commentId },
      { $push: { replies: replyData._id } }
    );
    await replyData.populate("postedBy");
    await replyData.populate("post");
    await replyData.populate("post.postedBy.id");
    await replyData.populate("post.postedForCommunity.id");
    await replyData.populate("comment");

    if (req.user._id.toString() !== replyData.comment.postedBy.toString()) {
      const data = {
        notificationType: "commentReply",
        userBy: req.user._id,
        userTo: replyData.comment.postedBy,
        postId: replyData.post._id,
        notificationInfo: {
          userByPicture: req.user.picture,
          postPicture:
            replyData.post.postType === "media" ? replyData.post.picture : null,
          text: `replied to your comment: ${
            replyData.text.length > 20
              ? `${replyData.text.slice(0, 20)}...`
              : replyData.text
          }`,
          userByName: req.user.username,
          communityName: null,
        },
      };
      const notificationCreated = new Notification(data);
      await notificationCreated.save();
      await User.updateOne(
        { _id: replyData.comment.postedBy },
        {
          $push: { notifications: notificationCreated._id },
          $inc: { newNotification: 1 },
        }
      );
    }

    res.status(201).send({
      status: "success",
      data: { replyData, commentId: req.body.commentId },
      message: "Reply created successfully",
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot create reply. Please try again later.",
    });
  }
};

const likeComment = async (req, res) => {
  try {
    const tempComment = await Comment.findById({ _id: req.params.commentId });
    if (tempComment.postedBy.toString() !== req.user._id.toString()) {
      const userKarmaUpdate = await User.updateOne(
        { _id: tempComment.postedBy },
        { $inc: { karma: 1 } }
      );
    }

    const commentAlreadyLikedStatus = tempComment.upvotes.find((upvote) => {
      return upvote.toString() === req.user._id.toString();
    });
    const commentAlreadyDislikedStatus = tempComment.downvotes.find(
      (downvote) => {
        return downvote.toString() === req.user._id.toString();
      }
    );
    if (
      commentAlreadyLikedStatus === undefined &&
      commentAlreadyDislikedStatus === undefined
    ) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $push: { upvotes: req.user._id } }
      );
    } else if (commentAlreadyLikedStatus !== undefined) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $pull: { upvotes: req.user._id } }
      );
    } else if (
      commentAlreadyLikedStatus === undefined &&
      commentAlreadyDislikedStatus !== undefined
    ) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $push: { upvotes: req.user._id }, $pull: { downvotes: req.user._id } }
      );
    }
    const comment = await Comment.findById({ _id: req.params.commentId });
    await comment.populate("postedBy");
    await comment.populate("comment");
    await comment.populate("post");
    await comment.populate("post.postedBy.id");
    await comment.populate("post.postedForCommunity.id");
    await comment.populate({
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
    });
    if (
      commentAlreadyLikedStatus === undefined &&
      req.user._id.toString() !== comment.postedBy._id.toString()
    ) {
      const data = {
        notificationType: "commentLike",
        userBy: req.user._id,
        userTo: comment.postedBy._id,
        postId: comment.post._id,
        notificationInfo: {
          userByPicture: req.user.picture,
          postPicture:
            comment.post.postType === "media" ? comment.post.picture : null,
          text: `liked your comment: ${
            comment.text.length > 20
              ? `${comment.text.slice(0, 20)}...`
              : comment.text
          }`,
          userByName: req.user.username,
          communityName: null,
        },
      };
      const notificationCreated = new Notification(data);
      await notificationCreated.save();
      await User.updateOne(
        { _id: comment.postedBy._id },
        {
          $push: { notifications: notificationCreated._id },
          $inc: { newNotification: 1 },
        }
      );
    }

    res.status(200).send({
      status: "success",
      message: "comment upvoted",
      data: comment,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot be upvoted. Please try again later.",
    });
  }
};

const dislikeComment = async (req, res) => {
  try {
    const tempComment = await Comment.findById({ _id: req.params.commentId });
    if (tempComment.postedBy.toString() !== req.user._id.toString()) {
      const userKarmaUpdate = await User.updateOne(
        { _id: tempComment.postedBy },
        { $inc: { karma: -1 } }
      );
    }

    const commentAlreadyLikedStatus = tempComment.upvotes.find((upvote) => {
      return upvote.toString() === req.user._id.toString();
    });
    const commentAlreadyDislikedStatus = tempComment.downvotes.find(
      (downvote) => {
        return downvote.toString() === req.user._id.toString();
      }
    );
    if (
      commentAlreadyLikedStatus === undefined &&
      commentAlreadyDislikedStatus === undefined
    ) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $push: { downvotes: req.user._id } }
      );
    } else if (commentAlreadyDislikedStatus !== undefined) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $pull: { downvotes: req.user._id } }
      );
    } else if (
      commentAlreadyLikedStatus !== undefined &&
      commentAlreadyDislikedStatus === undefined
    ) {
      const commentUpdate = await Comment.findByIdAndUpdate(
        { _id: req.params.commentId },
        { $pull: { upvotes: req.user._id }, $push: { downvotes: req.user._id } }
      );
    }
    const comment = await Comment.findById({ _id: req.params.commentId });
    await comment.populate("postedBy");
    await comment.populate("comment");
    await comment.populate("post");
    await comment.populate("post.postedBy.id");
    await comment.populate("post.postedForCommunity.id");
    await comment.populate({
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
    });
    res.status(200).send({
      status: "success",
      message: "Comment downvoted",
      data: comment,
    });
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "comment cannot be downvoted. Please try again later.",
    });
  }
};

const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  try {
    const findReply = await Comment.findOne({ _id: commentId });
    if (findReply.comment === undefined) {
      const repliesDelete = await Comment.deleteMany({ comment: commentId });
      const commentDelete = await Comment.deleteOne({ _id: commentId });
      const postUpdate = await Post.updateOne(
        { _id: postId },
        { $pull: { comments: commentId } }
      );
      return res.status(200).send({
        status: "success",
        message: "comment deleted successfully",
        data: { commentId, type: "comment" },
      });
    } else {
      const commentUpdate = await Comment.updateOne(
        { _id: findReply.comment },
        { $pull: { replies: commentId } }
      );
      const replyDelete = await Comment.deleteOne({ _id: commentId });
      const commentFind = await Comment.findOne({ _id: findReply.comment });
      await commentFind.populate("postedBy");
      await commentFind.populate("comment");
      await commentFind.populate("post");
      await commentFind.populate("post.postedBy.id");
      await commentFind.populate("post.postedForCommunity.id");
      await commentFind.populate({
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
      });
      return res.status(200).send({
        status: "success",
        message: "comment deleted successfully",
        data: {
          commentId: findReply.comment,
          repliesArray: commentFind.replies,
          type: "reply",
        },
      });
    }
  } catch (error) {
    res.status(500).send({
      status: "failed",
      message: "cannot delete comment. Please try again later.",
    });
  }
};

module.exports = {
  createComment,
  likeComment,
  dislikeComment,
  createReply,
  deleteComment,
};
