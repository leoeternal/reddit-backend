const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: false,
    },
    dateOfBirth: {
      type: String,
      // required: true,
    },
    karma: {
      type: Number,
      default: 0,
    },
    picture: {
      type: String,
      default:
        "https://media.istockphoto.com/vectors/default-profile-picture-avatar-photo-placeholder-vector-illustration-vector-id1223671392?k=20&m=1223671392&s=612x612&w=0&h=lGpj2vWAI3WUT1JeJWm1PRoHT3V15_1pdcTn2szdwQ0=",
    },
    posts: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
      },
    ],
    postsForUser: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    postCount: {
      type: Number,
      default: 0,
    },
    communities: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Community",
        },
      },
    ],
    communityCount: {
      type: Number,
      default: 0,
    },
    about: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      default: "",
    },
    communitiesFollow: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Community",
        },
      },
    ],
    usersFollow: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    usersFollowers: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    newNotification: {
      type: Number,
      default: 0,
    },
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateToken = async function () {
  try {
    const token = jwt.sign(
      { _id: this._id.toString() },
      process.env.SECRET_STRING
    );
    this.tokens = this.tokens.concat({ token: token });
    await this.save();
    return token;
  } catch (error) {
    return res.status(500).send({
      status: "failed",
      message: "Server failed to generate token",
    });
  }
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
