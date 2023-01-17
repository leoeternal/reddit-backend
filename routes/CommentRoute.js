const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");

const {
  createComment,
  likeComment,
  dislikeComment,
  createReply,
  deleteComment,
} = require("../controllers/CommentController");

router.post("/comment", auth, createComment);
router.get("/post/:postId/comment/:commentId/like", auth, likeComment);
router.get("/post/:postId/comment/:commentId/dislike", auth, dislikeComment);
router.post("/reply", auth, createReply);
router.delete("/comment/:postId/:commentId", auth, deleteComment);

module.exports = router;
