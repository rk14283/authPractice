var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");
const z = require("zod");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
var app = express();
const bcrypt = require("bcrypt");
const { Console } = require("console");
SALT_ROUNDS = 10;
app.use(bodyParser.json());
//what is it doing here
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.set("view engine", "ejs");
const { v4: uuidv4 } = require("uuid");
const { json } = require("body-parser");
const sessions = {};
app.set("views", path.join(__dirname, "./views"));

class Session {
  constructor(email, expiresAt) {
    this.email = email;
    this.expiresAt = expiresAt;
  }
  isExpired() {
    this.expiresAt < new Date();
  }
}

app.get("/", async (req, res) => {
  res.render("templates");
});

const PORT = process.env.PORT || 9000;
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

app.post("/login", (req, res) => {
  // handle login here
  let email = req.body.email;
  let password = req.body.password;

  async function correctUser() {
    let user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    //    console.log(matchingEmail.password);

    if (user != null) {
      let passwordMatch = bcrypt.compareSync(password, user.password);
      //console.log(passwordMatch);
      if (passwordMatch === true) {
        const sessionToken = uuidv4();
        //  console.log(sessionToken);
        const now = new Date();
        const expiresAt = new Date(+now + 240 * 1000);
        //console.log(expiresAt);
        const session = new Session(user.email, expiresAt);
        //    console.log(session);
        sessions[sessionToken] = session;
        //console.log(sessions);
        sessionData = {
          token: sessionToken,
          email: user.email,
          expiry: expiresAt,
        };
        const newSession = await prisma.session.create({
          data: sessionData,
        });
        //console.log(newSession);
        res.cookie("session_token", sessionToken, { expires: expiresAt });
        //res.send(sessionToken);
        //console.log(sessionToken);
        // return res.status(200).json({ message: "logged in" });
        return res.redirect("/welcome");
      } else if (passwordMatch === false) {
        return res.status(403).json({ message: "password incorrect" }).end();
      }
    } else if (user === null) {
      return res.status(404).json({ message: "user not found" }).end();
    }
  }
  correctUser();
});

app.get("/login", async (req, res) => {
  res.render("loginTemplates");
});

app.get("/welcome", async (req, res) => {
  console.log("hello", req.cookies);

  if (!req.cookies) {
    return res.redirect("/login");
  }
  //const sessionToken = req.cookies["session_token"];

  const session = prisma.session.findFirst({
    where: {
      token: req.cookies["session_token"],
    },
  });

  //const sessionToken = null;
  let tokenFromDB = await session;
  //console.log("this is token outside function", await sessionToken);
  //console.log("this is your token", token.token);
  let sessionToken = tokenFromDB.token;
  //console.log(sessionToken);

  if (!sessionToken) {
    // If the cookie is not set, return an unauthorized status
    return res.redirect("/login");
  }
  //userSession = sessions[sessionToken];
  // let userSession = sessionToken;
  // if (!userSession) {
  //   // If the session token is not present in session map, return an unauthorized error
  //   return res.redirect("/login");
  // }

  //console.log(tokenFromDB.expiry);
  //let expiryTime = tokenFromDB.expiry.getTime();
  let expiryTime = tokenFromDB.expiry;
  //console.log(Date.now() / 1000);

  if (expiryTime <= +new Date()) {
    //delete sessions[sessionToken];
    const deletedUserToken = await prisma.session.deleteMany({
      where: {},
    });
    //console.log(deletedUserToken);
    return res.redirect("/login");
  }

  res.send(`Welcome ${tokenFromDB.email}!`).end();
});
