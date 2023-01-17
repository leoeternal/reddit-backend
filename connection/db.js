const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const multer = require("multer");

mongoose.connect(process.env.MONGO_PROD_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
const gfs = { grid: undefined };

db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  gfs.grid = Grid(db.db, mongoose.mongo);
  gfs.grid.collection("uploads");
  console.log("DB connected");
});

const storage = new GridFsStorage({
  db,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

module.exports = { db, upload, gfs };
