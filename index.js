//All imports together
var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");
const z = require("zod");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const async = require("hbs/lib/async");

//config vars
const SALT_ROUNDS = 10;
const PORT = process.env.PORT || 9000;
const SESSION_EXPIRATION_TIME_SECONDS = 30;
const COOKIE_EXPIRATION_TIME_SECONDS = 60;
//Loading middleware into express
const prisma = new PrismaClient();
var app = express();
app.use(bodyParser.json());

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));

app.get("/", async (req, res) => {
  res.render("templates");
});

app.listen(PORT, () => {
  console.log("Server listening on http://localhost:" + PORT);
});

const userSchema = z.object({
  email: z.string().min(2, {
    message: "Must be 2 or more characters long",
  }),
  password: z.string().min(2, { message: "Must be 2 or more characters long" }),
});
function validateSignUp(body) {
  try {
    const user = userSchema.parse(body);
    return [null, user];
  } catch (error) {
    return [error, null];
  }
}
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}
function createUser(userInfo) {
  return prisma.user.create({
    data: { ...userInfo, password: hashPassword(userInfo.password) },
  });
}

app.post("/signup", async (req, res) => {
  let [validationError, userInfo] = validateSignUp(req.body);
  if (validationError) {
    return res.status(400).json({
      message: "Validation Error",
      issues: validationError.issues,
    });
  }
  const user = await createUser(userInfo);
  res
    .status(201)
    .json({ message: "New user added to database", user: { id: user.id } });
});
async function createSession(email) {
  const sessionToken = uuidv4();
  const now = new Date();
  const expiresAt = new Date(+now + SESSION_EXPIRATION_TIME_SECONDS * 1000);
  const sessionData = {
    token: sessionToken,
    email: email,
    expiry: expiresAt,
  };
  const newSession = await prisma.session.create({
    data: sessionData,
  });
  return newSession;
}
async function findUserByEmail(email) {
  let user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });
  return user;
}

app.post("/login", async (req, res) => {
  // handle login here
  let [validationError, userInfo] = validateSignUp(req.body);
  if (validationError) {
    return res.status(400).json({
      message: "Validation Error",
      issues: validationError.issues,
    });
  }

  let user = await findUserByEmail(userInfo.email);

  if (user === null) {
    //Stop if there is no user
    return res.status(404).json({ message: "user not found" }).end();
  }

  let passwordMatch = bcrypt.compareSync(userInfo.password, user.password);
  if (passwordMatch === false) {
    return res.status(403).json({ message: "password incorrect" }).end();
  }

  const session = await createSession(user.email);

  res.cookie("session_token", session.token, {
    expires: new Date(+session.expiry + COOKIE_EXPIRATION_TIME_SECONDS * 1000),
  });
  return res.redirect("/welcome");
});

function isSessionExpired(dateObject) {
  return dateObject <= +new Date();
}
app.get("/login", async (req, res) => {
  res.render("loginTemplates");
});

app.get("/welcome", async (req, res) => {
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
  //let expiryTime = session.expiry;

  if (isSessionExpired(session.expiry)) {
    res.redirect("/login");

    const deletedUserToken = await prisma.session.delete({
      where: {
        id: session.id,
      },
    });
    return console.log(deletedUserToken);
  }

  res.send(`Welcome ${session.email}!`).end();
});
