const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const { upload } = require("../connection/db");

const {
  registerUser,
  loginUser,
  loggedInUserInformation,
  logoutUser,
  userFollow,
  getUserByName,
  userUpdateInfo,
  userUnfollow,
  userUploadTempImage,
  userRemoveImage,
  searchUsersAndCommunities,
  answerInviteRequest,
} = require("../controllers/UserController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/loggeduser/info", auth, loggedInUserInformation);
router.get("/logout", auth, logoutUser);
router.get("/user/:name", getUserByName);
router.patch("/user/follow", auth, userFollow);
router.patch("/user/unfollow", auth, userUnfollow);
router.post(
  "/user/image/upload",
  auth,
  upload.single("file"),
  userUploadTempImage
);
router.delete("/user/image/delete/:filename/:fileId", auth, userRemoveImage);
router.patch("/user/info/update", auth, userUpdateInfo);
router.get("/search/:query", searchUsersAndCommunities);
router.patch("/answer/invite/request", auth, answerInviteRequest);

module.exports = router;
