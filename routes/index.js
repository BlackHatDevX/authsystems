var express = require("express");
var router = express.Router();
var auth = require("./email/auth");
const otpGenerator = require("otp-generator");
const queryString = require("querystring");
const axios = require("axios");
const passport = require("passport");
const users = require("./users");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index");
});

// start : email otp
router.get("/emailOtp", (req, res) => {
  res.render("email/login");
});

router.post("/genOtp", async (req, res) => {
  const otpGen = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const email = req.body.email;
  await auth(otpGen, email);
  req.session.packet = { otp: otpGen, email: email, authenticated: false };
  res.render("email/verifyOtp");
});

router.post("/verifyOtp", async (req, res) => {
  const inputOtp = req.body.inputOtp;
  const packet = req.session.packet;
  if (packet.otp == inputOtp) {
    req.session.packet.authenticated = true;
    // const writeDB = await users.create({
    //   userdetails: { packet },
    // });
    res.render("email/approved");
  } else {
    res.render("email/denied");
  }
});
// End : Email Otp

// start : login with github
router.get("/github", (req, res) => {
  const params = queryString.stringify({
    client_id: process.env.githubClientId,
    redirect_uri: process.env.githubRedirectUri,
    scope: ["read:user", "user:email"].join(" "),
    allow_signup: true,
  });

  const githubLoginUrl = `https://github.com/login/oauth/authorize?${params}`;
  res.render("github/login", { authUrl: githubLoginUrl });
});

router.get("/auth/github", async (req, res) => {
  const code = req.query.code;
  const getAccessTokenFromCode = async (code) => {
    const { data } = await axios({
      url: "https://github.com/login/oauth/access_token",
      method: "get",
      params: {
        client_id: process.env.githubClientId,
        client_secret: process.env.githubSecret,
        redirect_uri: process.env.githubRedirectUri,
        code,
      },
    });

    const parsedData = queryString.parse(data);

    if (parsedData.error) throw new Error(parsedData.error_description);
    return parsedData.access_token;
  };
  const getGitHubUserData = async (access_token) => {
    const { data } = await axios({
      url: "https://api.github.com/user",
      method: "get",
      headers: {
        Authorization: `token ${access_token}`,
      },
    });

    return data;
  };
  const acessToken = await getAccessTokenFromCode(code);
  const data = await getGitHubUserData(acessToken);
  req.session.packet = data;
  res.redirect("/github/success");
});

router.get("/github/success", async (req, res) => {
  const data = req.session.packet;
  req.session.destroy;
  req.session.packet.username = data.login;
  req.session.packet.authenticated = true;
  // const writeDB = await users.create({
  //   userdetails: { data },
  // });
  res.render("github/success", { user: data });
});
//  end : login with github

// start : login with google
// Initialize Passport
router.use(passport.initialize());
router.use(passport.session());

// Configure Google OAuth2 Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.googleClientId,
      clientSecret: process.env.googleClientSecret,
      callbackURL: process.env.googleCallbackUrl,
    },
    (accessToken, refreshToken, profile, done) => {
      // This function is called when the authentication is successful
      // You can perform operations like saving the user to the database here
      return done(null, profile);
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Google OAuth2 Authentication Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication, redirect to success page
    res.redirect("/google/success");
  }
);

router.get("/google/success", async (req, res) => {
  const user = req.user;
  // const writeDB = await users.create({
  //   userdetails: { user },
  // });
  res.render("google/success", { user: user });
});

// Logout route
// router.get("/logout", (req, res) => {
//   req.logout();
//   res.redirect("/");
// });

module.exports = router;

// end : login with google

//  start : logout
router.get("/logout", (req, res) => {
  req.session.destroy;
  res.redirect("/");
});
// end : logout

module.exports = router;
