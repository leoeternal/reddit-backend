const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    postedForType: {
      type: String,
      enum: ["user", "community"],
      required: true,
    },
    postedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    postedForUser: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    postedForCommunity: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
      },
    },
    postType: {
      type: String,
      enum: ["text", "media"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
    },
    picture: {
      type: String,
    },
    pictureWidth: {
      type: Number,
    },
    pictureHeight: {
      type: Number,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
