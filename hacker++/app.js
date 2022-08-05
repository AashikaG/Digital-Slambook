const express= require("express");
const bodyParser= require("body-parser");
const ejs= require("ejs");
const mongoose= require("mongoose");
const { body, validationResult}= require("express-validator");
const passport = require('passport');
const { default: DAuthStrategy } = require('passport-delta-oauth2')
const findOrCreate= require('mongoose-findorcreate');
const nodemailer = require("nodemailer");

const app= express();
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/hackerPlusDB");

const hackerPlusSchema= new mongoose.Schema({
    name: String,
    department: String,
    hostel: String,
    username: String,
    password: String,
    id: Number,
    email: String,
    requests:[String],
    friends:[String],
    comments: [{commenter:String,comment:String}] 
  });

hackerPlusSchema.plugin(findOrCreate);

const User = mongoose.model('User', hackerPlusSchema);

var current_profile="";
var commentor_profile="";
var all_docs;
var delta_name;
var delta_id;
var status;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

app.use(require('cookie-parser')());
app.use(require('express-session')({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize())
app.use(passport.session())

passport.use(new DAuthStrategy(
  {
      clientID: "ZvSdA.JHSWtV1Afl",
      clientSecret: "QPT4Q~fNNZbi04NEVh.xMSyXudwgFunR",
      callbackURL: "http://localhost:3000/auth/delta/slam"
  },
  function(accessToken, refreshToken, profile, cb) {

      User.findOrCreate({ id: profile.id, name: profile.name, email: profile.email}, function (err, user) {
      return cb(err, user);
      });
      delta_name= profile.name;
      delta_id= profile.id;
  }
));

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: "aashika.giridharan@gmail.com",
    pass: "Aashika2002*",
    clientId: "91515095861-i5ujavpmn42tojb9d5di1ko2dpe7kq2r.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//044d_wOr4talgCgYIARAAGAQSNwF-L9IrdAbCnCZgnT2w_oeyAj3aFq6ugkh6tuu5AH7Eu57KUDcapvVKYtds_DZu8x3lHCIKhBQ"
  }
});

app.get("/",function(req,res){
  current_profile="";
  commentor_profile="";
  all_docs=[];
  res.render("home",{msg:""});
});

app.get("/auth/delta",function(req,res){
  
  passport.authenticate('dauth',{scope:['profile']});
});

app.get(
  '/auth/delta/slam', 
  passport.authenticate('dauth', { failureRedirect: '/login' }),
  function(req, res) {
      // Successful authentication, redirect home.
      User.find({},function(err,docs){
        all_docs= docs;
      });
      User.findOne({name: delta_name, id: delta_id}, function (err, doc){
        // res.render("profile",{person:doc.name,pronoun:"you",comments:doc.comments,allDocs:all_docs});
        commentor_profile=doc.name;
        res.redirect("/commentor");
      });
  }
);

app.get("/register",function(req,res){
    res.render("register");
  });

app.get("/login",function(req,res){
    res.render("login",{text:""});
  });

app.get("/commentor",function(req,res){
    User.findOne({name: commentor_profile}, function (err, doc){
      res.render("profile",{person:doc.name,pronoun:"you",comments:doc.comments,allDocs:all_docs,friends:doc.friends,commentor_profile:commentor_profile});
    });
});

app.get("/connections",function(req,res){
  User.findOne({name: commentor_profile},function(err,doc){
    res.render("connections",{requests:doc.requests,friends:doc.friends});
  });
});

app.post("/register",
body('name',"name needs to be atleast 3 characters").isLength({ min: 3 }),
body('password',"password needs to be atleast 4 characters").isLength({ min: 4 }),
body("username").isLength({ min: 1 }).trim().withMessage("Username must be specified")
    .custom((value) => {
      return User.findOne({username : value}).then((user) => {
        if (user) {
          return Promise.reject("Username already in use");
        }
      });
    }),
function(req,res){
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const alert= errors.array();
        res.render("register",{
            alert
        });
    }
    else if(req.body.password===req.body.cpassword){
        var user= new User({
          name: req.body.name,
          department: req.body.department,
          hostel: req.body.hostel,
          email: req.body.email,
          username: req.body.username,
          password: req.body.password,
        });
        user.save();
        res.render("home",{msg:"registration complete!"});
      }
});

app.post("/login",function(req,res){
  User.find({},function(err,docs){
    all_docs= docs;
  });
    User.findOne({username: req.body.username}, function (err, doc){
      if(!err && doc != null){
        if(req.body.password===doc.password){
          commentor_profile=doc.name;
          res.render("profile",{person:doc.name,pronoun:"you",comments:doc.comments,allDocs:all_docs,friends:doc.friends,commentor_profile:commentor_profile});
        }else{
          res.render("login",{text:"username or password does not match"});
        }
      }
      if(doc===null){
        res.render("login",{text:"username or password does not match"});
      }
    });
});

app.post("/profile",function(req,res){
  User.findOne({name: req.body.search}, function (err, doc){
    if(!err && doc != null){
        current_profile= doc.name;
        if(doc.requests.includes(commentor_profile)){
          
          status="requested!";
        }
        else if(doc.friends.includes(commentor_profile)){
          status="connected!";
        }
        else{
          status="connect!";
        }
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile,status:status,friends:doc.friends});
    }
});
});

app.post("/profile2",function(req,res){
  User.findOne({name: current_profile}, function (err, doc){
    if(!err && doc != null){
        var obj={};
        obj.commenter= commentor_profile;
        obj.comment= req.body.comment;
        doc.comments.push(obj);
        doc.save();
        if(doc.requests.includes(commentor_profile)){
          status="requested!";
        }
        else if(doc.friends.includes(commentor_profile)){
          status="connected!";
        }
        else{
          status="connect!";
        }
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile,status:status,friends:doc.friends});
    }
});
});

app.post("/clicked",function(req,res){
  User.findOne({name: current_profile}, function (err, doc){
    if(!err){
        var commentsArray= doc.comments;
        commentsArray.splice(req.body.id,1);
        doc.comments= commentsArray;
        doc.save();
        if(doc.requests.includes(commentor_profile)){
          status="requested!";
        }
        else if(doc.friends.includes(commentor_profile)){
          status="connected!";
        }
        else{
          status="connect!";
        }
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile,status:status,friends:doc.friends});
    }
});
});

app.post("/connect",function(req,res){
  User.findOne({name: current_profile},function(err,doc){
    doc.requests.push(commentor_profile);
    doc.save();
    let mailOptions = {
      from: "aashika.giridharan@gmail.com",
      to: doc.email,
      subject: 'Slam Book',
      text: 'You have a new connection request from '+commentor_profile+'. Check it out.'
    };
    transporter.sendMail(mailOptions, function(err, data) {
      if (err) {
        console.log("Error " + err);
      } else {
        console.log("Email sent successfully");
      }
    });
    
    if(doc.requests.includes(commentor_profile)){
      status="requested!";
    }
    else if(doc.friends.includes(commentor_profile)){
      status="connected!";
    }
    else{
      status="connect!";
    }
    
    res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile,status:status,friends:doc.friends});
  });

});

app.post("/connections",function(req,res){
  User.findOne({name: commentor_profile},function(err,doc){
    doc.requests= doc.requests.filter(function(ele){
      return ele != req.body.name;
    });
    doc.friends.push(req.body.name);
    doc.save();
    res.render("connections",{requests:doc.requests,friends:doc.friends});
  });
  User.findOne({name: req.body.name},function(err,doc){
    doc.friends.push(commentor_profile);
    doc.save();
  });
});

app.listen(3000,function(){
  console.log("Server started at port 3000");
});
