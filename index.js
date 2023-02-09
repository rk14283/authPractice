var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");
const z = require("zod");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
var app = express();
const bcrypt = require("bcrypt");
const { userInfo } = require("os");
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

let emailSchema = z
  .string()
  .min(2, { message: "Must be 2 or more characters long" });

let passwordSchema = z
  .string()
  .min(2, { message: "Must be 2 or more characters long" });
function validateSignUp(body) {
  let email = String(emailSchema.parse(body.email));
  let password = String(passwordSchema.parse(body.password));
  return { email: email, password: password };
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
  //try {
  let userInfo = validateSignUp(req.body);
  const user = await createUser(userInfo);
  //   console.log(addedInfo);
  res
    .status(201)
    .json({ message: "New user added to database", user: { id: user.id } });
  // } catch (error) {
  //   console.log(error.issues, error.name);

  //   if (error.name === "ZodError") {
  //     return res
  //       .status(400)
  //       .json({ message: "validation error", errors: error.issues });
  //   } else {
  //     return res.status(500).json({ message: "Something went wrong sorry!" });
  //   }
  // }
});
