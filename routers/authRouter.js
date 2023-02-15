//imports together
const { Router } = require("express");
const z = require("zod");
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
//config vars
const SALT_ROUNDS = 10;
const PORT = process.env.PORT || 9000;
const SESSION_EXPIRATION_TIME_SECONDS = 30;
const COOKIE_EXPIRATION_TIME_SECONDS = 60;

//instatiating

const router = new Router();
const prisma = new PrismaClient();
//router.use(logger);

function mainMiddleWare(req, res, next) {
  console.log(req.method, req.path);
  //done;
  //continue handling the request
  next();
}
async function authMiddleware(req, res, next) {
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

  next();
}

async function loggerMiddleware(req, res, next) {
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
  //  return res.redirect("/welcome");

  next();
}

router.get("/", async (req, res) => {
  res.render("templates");
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

//functions must be outside routes
router.post("/signup", mainMiddleWare, authMiddleware, async (req, res) => {
  //   let [validationError, userInfo] = validateSignUp(req.body);
  //   if (validationError) {
  //     return res.status(400).json({
  //       message: "Validation Error",
  //       issues: validationError.issues,
  //     });
  //   }
  //   const user = await createUser(userInfo);
  //   res
  //     .status(201)
  //     .json({ message: "New user added to database", user: { id: user.id } });
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
//not used anywhere
function isSessionExpired(dateObject) {
  return dateObject <= +new Date();
}

router.post("/login", mainMiddleWare, loggerMiddleware, async (req, res) => {
  // handle login here
  //   let [validationError, userInfo] = validateSignUp(req.body);
  //   if (validationError) {
  //     return res.status(400).json({
  //       message: "Validation Error",
  //       issues: validationError.issues,
  //     });
  //   }
  //   let user = await findUserByEmail(userInfo.email);
  //   if (user === null) {
  //     //Stop if there is no user
  //     return res.status(404).json({ message: "user not found" }).end();
  //   }
  //   let passwordMatch = bcrypt.compareSync(userInfo.password, user.password);
  //   if (passwordMatch === false) {
  //     return res.status(403).json({ message: "password incorrect" }).end();
  //   }
  //   const session = await createSession(user.email);
  //   res.cookie("session_token", session.token, {
  //     expires: new Date(+session.expiry + COOKIE_EXPIRATION_TIME_SECONDS * 1000),
  //   });
  return res.redirect("/welcome");
});

router.get("/login", async (req, res) => {
  res.render("loginTemplates");
});

module.exports = router;
