const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const communitySchema = new mongoose.Schema(
  {
    communityName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["public", "restricted", "private"],
      default: "public",
    },
    createdBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    communityPicture: {
      type: String,
      default: "https://www.redditstatic.com/mweb2x/img/planet.png",
    },
    members: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    postsQuantity: {
      type: Number,
      default: 0,
    },
    posts: [
      {
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
      },
    ],
    description: {
      type: String,
      default: "",
    },
    moderators: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        permissions: {
          type: Array,
        },
      },
    ],
    invitedUsersForMod: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          default: "ignored",
          enum: ["accepted", "rejected", "ignored"],
        },
        permissions: {
          type: Array,
        },
        notificationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
        createdAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Community = mongoose.model("Community", communitySchema);

module.exports = Community;
