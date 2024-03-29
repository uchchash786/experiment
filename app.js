//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const options={
    useUnifiedTopology: true ,
   useNewUrlParser: true

};
mongoose.connect('mongodb://localhost:27017/userDB',options );
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we're connected!");});
mongoose.set('useCreateIndex', true);
const patientSchema = new mongoose.Schema ({
patientname: String,
age: String,
sex: String,
adress: String,
contactNo:Number,
dateOfVisit:Date,
  chiefCompalaints:String,
  historyofPresentingIlness:String,
  historyofpastingIlness:String,
});
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret:{
    fullName:String,nameOfMedicalCollege:String,medicalsession:String,bmdcRegiNo:String,
    } ,
  myPatientProfile:patientSchema
});

mongoose.set("useCreateIndex", true);



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const Patient = new mongoose.model("Patient", patientSchema);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets",function(req,res){
if (req.isAuthenticated()) {
  res.render("secrets");

} else {
  res.redirect("/login");
}
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
app.post("/submit", function(req, res){
  const submittedpatientName = req.body.patientname;
const submittedpatientage = req.body.patientage;
const submittedsex = req.body.sex;
const submittedadress = req.body.adress;
const submittedcontactNo = req.body.contactNo;
const submitteddate = req.body.date;
const submittedchiefCompalaints = req.body.chiefCompalaints;
const submittedhistoryofPresentingIlness = req.body.historyofPresentingIlness;
const submittedhistoryofpastingIlness = req.body.historyofpastingIlness;
//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);
const newPatient= new Patient({
  patientname: submittedpatientName,
  age: submittedpatientage,
  sex: submittedsex,
  adress:submittedadress,
  contactNo:submittedcontactNo,
  dateOfVisit:submitteddate,
    chiefCompalaints:submittedchiefCompalaints ,
    historyofPresentingIlness:submittedhistoryofPresentingIlness,
    historyofpastingIlness:submittedhistoryofpastingIlness,
});
newPatient.save(function(err){
if (err) {
  console.log(err);
} else {
    res.send("succesfully saved");
}

    });
  });
app.post("/secrets", function(req, res){
  const submittedName = req.body.name;
const submittedMedicalCollegeName = req.body.medicalCollegeName;
const submittedSession = req.body.session;
const submittedbmdcRegNo = req.body.bmdcRegNo;
//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret.fullName=submittedName;
        foundUser.secret.nameOfMedicalCollege=submittedMedicalCollegeName;
        foundUser.secret.medicalsession=submittedSession;
          foundUser.secret.bmdcRegiNo=submittedbmdcRegNo;
            }
        foundUser.save(function(err){
if (err) {
  console.log(err);
} else {
    res.redirect("/submit");
}

        });
      }
    }
  );
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});
process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });







app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
