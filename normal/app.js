const express= require("express");
const bodyParser= require("body-parser");
const ejs= require("ejs");
const mongoose= require("mongoose");

const app= express();
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static("public"));

var current_profile="";
var commentor_profile="";
var all_docs;

mongoose.connect("mongodb://localhost:27017/slamDB");

const slamSchema= new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  comments: [{commenter:String,comment:String}]
});

const User = mongoose.model('User', slamSchema);

app.get("/",function(req,res){
  current_profile="";
  commentor_profile="";
  all_docs=[];
  res.render("home",{msg:""});
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login",{text:""});
});

app.get("/previous",function(req,res){
  User.findOne({name: commentor_profile}, function (err, doc){
    res.render("profile",{person:doc.name,pronoun:"you",comments:doc.comments,allDocs:all_docs,commentor_profile:commentor_profile});
  });
});

app.post("/register",function(req,res){
  if(req.body.password===req.body.cpassword){
    var user= new User({
      name: req.body.name,
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
        res.render("profile",{person:doc.name,pronoun:"you",comments:doc.comments,allDocs:all_docs,commentor_profile:commentor_profile});
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
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile});
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
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile});
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
        res.render("profile2",{person:"to "+doc.name+"'s profile",pronoun:"them",comments:doc.comments,commentor_profile:commentor_profile});
    }
});
});

app.listen(3000,function(){
  console.log("Server started at port 3000");
});