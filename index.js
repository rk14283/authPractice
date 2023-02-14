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
SALT_ROUNDS = 10;
app.use(bodyParser.json());
//what is it doing here, html form url encoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.set("view engine", "ejs");
const { v4: uuidv4 } = require("uuid");
app.set("views", path.join(__dirname, "./views"));

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

    if (user != null) {
      let passwordMatch = bcrypt.compareSync(password, user.password);
      if (passwordMatch === true) {
        const sessionToken = uuidv4();
        const now = new Date();
        const expiresAt = new Date(+now + 30 * 1000);
        sessionData = {
          token: sessionToken,
          email: user.email,
          expiry: expiresAt,
        };
        const newSession = await prisma.session.create({
          data: sessionData,
        });
        res.cookie("session_token", sessionToken, {
          expires: new Date(+expiresAt + 60000),
        });
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
  let expiryTime = session.expiry;

  if (expiryTime <= +new Date()) {
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
