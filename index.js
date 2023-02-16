//All imports together
var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");
const authRouter = require("./routers/authRouter");
const bcrypt = require("bcrypt");

//config vars
const PORT = process.env.PORT || 9000;

const prisma = new PrismaClient();
var app = express();

//loading middlewares into express (app.use)
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
//comment out app.use to use logger on a specific route
//app.use(logger);
app.use(authRouter);
//middleware is a function you can use on express to reuse logic on many routes
function logger(req, res, next) {
  console.log(req.method, req.path);
  //done;
  //continue handling the request
  next();
}
async function authMiddleware(req, res, next) {
  if (!req.cookies.session_token) {
    return res.redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: {
      token: req.cookies["session_token"],
    },
  });

  if (!session) {
    return res.redirect("/login");
  }
  if (isSessionExpired(session.expiry)) {
    res.redirect("/login");

    const deletedUserToken = await prisma.session.delete({
      where: {
        id: session.id,
      },
    });
    return console.log(deletedUserToken);
  }
  //add the session to the request
  req.session = session;
  //User is logged in! Session is valid!
  next();
}

function isSessionExpired(dateObject) {
  return dateObject <= +new Date();
}

app.get("/welcome", authMiddleware, async (req, res) => {
  res.send(`Welcome ${req.session.email}!`).end();
});
app.get("/profile", authMiddleware, async (req, res) => {
  res.send(`Here is your profile`).end();
});
app.get("/highscores", authMiddleware, logger, async (req, res) => {
  res.send("Here is your highscores").end();
});
app.listen(PORT, () => {
  console.log("Server listening on http://localhost:" + PORT);
});
