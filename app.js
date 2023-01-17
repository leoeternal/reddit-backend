const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
require("dotenv").config();

const corsOptions = {
  origin: "*",
  credentails: true,
  optionSuccessStatus: 200,
};

const port = 8000 || process.env.PORT;

const { db } = require("./connection/db");
const UserRouter = require("./routes/UserRoute");
const CommunityRouter = require("./routes/CommunityRoute");
const PostRouter = require("./routes/PostRoute");
const CommentRouter = require("./routes/CommentRoute");

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json({ extended: false }));

app.use(UserRouter);
app.use(CommunityRouter);
app.use(PostRouter);
app.use(CommentRouter);

app.listen(port, () => {
  console.log(`App connected & running on server ${port}`);
});
