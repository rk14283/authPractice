var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");
const z = require("zod");
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
app.set("view engine", "ejs");

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
  let email = String(req.body.email);
  let password = String(req.body.password);
  let hash = bcrypt.hashSync(password, SALT_ROUNDS);
  //console.log(email);

  async function correctUser() {
    let matchingEmail = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    //    console.log(matchingEmail.password);

    if (matchingEmail != null) {
      let matchingPassword = matchingEmail.password;
      let passwordMatch = bcrypt.compareSync(password, matchingEmail.password);
      //console.log(passwordMatch);
      if (passwordMatch === true) {
        return res.status(200).json({ message: "logged in" });
      } else if (passwordMatch === false) {
        return res.status(403).json({ message: "password incorrect" });
      }
    } else if (matchingEmail === null) {
      //console.log("wrong user");
      return res.status(404).json({ message: "user not found" });
    }
  }
  correctUser();
});

app.get("/login", (req, res) => {
  res.render("loginTemplates");
});
