const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const { upload } = require("../connection/db");

const {
  createCommunity,
  getCommunityByName,
  topCommunities,
  getAllCommunitiesOfUser,
  communityFollow,
  communityUnfollow,
  communityUpdateInfo,
  inviteUserForMod,
  deleteInvitedRequestToUser,
  communityUploadTempImage,
  communityRemoveImage,
  leaveMod,
} = require("../controllers/CommunityController");

router.post("/community", auth, createCommunity);
router.get("/community/:name", getCommunityByName);
router.get("/communities/user", auth, getAllCommunitiesOfUser);
router.patch("/community/follow", auth, communityFollow);
router.patch("/community/unfollow", auth, communityUnfollow);
router.get("/top/communities", topCommunities);
router.patch("/community/info/update/:communityId", auth, communityUpdateInfo);
router.patch("/invite/mod", auth, inviteUserForMod);
router.delete("/delete/invite/request", auth, deleteInvitedRequestToUser);
router.post(
  "/community/image/upload",
  auth,
  upload.single("file"),
  communityUploadTempImage
);
router.delete(
  "/community/image/delete/:filename/:fileId",
  auth,
  communityRemoveImage
);
router.patch("/leave/mod/:communityId", auth, leaveMod);

module.exports = router;
