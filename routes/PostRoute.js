const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const { upload } = require("../connection/db");

const {
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
} = require("../controllers/PostController");

router.post("/post", auth, createPost);
router.get("/post/:postId", getPostById);
router.get("/posts/loggedInUser", auth, getAllPostsOfLoggedInUser);
router.get("/posts", getAllPosts);
router.get("/post/like/:postId", auth, likePost);
router.get("/post/dislike/:postId", auth, dislikePost);
router.post("/image/upload", auth, upload.single("file"), uploadTempImage);
router.get("/render/image/:filename", renderImage);
router.delete("/image/delete/:filename/:fileId", auth, removeImage);
router.delete("/post/:postId", auth, deletePost);

module.exports = router;
