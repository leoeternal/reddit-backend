const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationType: {
      type: String,
      required: true,
      enum: [
        "postLike",
        "postComment",
        "commentLike",
        "commentReply",
        "followUser",
        "inviteUserForCommunity",
        "communityAcceptOrDeclineRequest",
      ],
    },
    userBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },
    notificationInfo: {
      type: Object,
    },
    readStatus: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
