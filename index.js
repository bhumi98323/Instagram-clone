var express = require('express');
var router = express.Router();
var UserModel = require('./users');
var PostModel = require('./posts');
const passport = require('passport');
const upload = require('./multer');

var localStrategy = require('passport-local')
passport.use(new localStrategy(UserModel.authenticate()))
router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.post('/register', function(req,res){
  var userDets = new UserModel({
    username : req.body.username,
    name: req.body.name,
    email: req.body.email
  });

     UserModel.register(userDets, req.body.password)
     .then(function(regi){
      passport.authenticate("local")(req,res,function(){
        res.redirect("/feed");
      })
     })

})
router.post('/login',passport.authenticate("local",{
  successRedirect:'/profile',
  failureRedirect:'/login'
}),function(req,res){}
)


router.get("/logout",function(req,res,next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})


function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

router.get('/login', function(req, res) {
  res.render('login', {footer: false});
});


router.get('/feed',isLoggedIn, async function(req, res) {
  const user = await UserModel.findOne({ username: req.session.passport.user });
  const posts = await PostModel.find()
  .populate('user')
  res.render('feed', {footer: true, posts,user});
});

router.post('/post', isLoggedIn, upload.single("image"), async function(req, res){
    const user = await UserModel.findOne({
      username: req.session.passport.user
    })
    const post = await PostModel.create({
      user: user._id,
      caption: req.body.caption,
      image: req.file.filename,
    });
    user.posts.push(post._id);
    await user.save();
    
    res.redirect('/feed');
})

router.get('/profile',isLoggedIn, async function(req, res) { 
  const user = await UserModel.findOne({username: req.session.passport.user})
  .populate('posts')
  res.render('profile', {user});
});

router.post('/upload/profilepicture',isLoggedIn, upload.single("image"), async function(req, res) { 
  console.log(req.file)
  const user = await UserModel.findOne({username: req.session.passport.user})
  user.profilepicture = req.file.filename,
  await user.save();
  res.redirect('/profile');
});

router.get('/search', isLoggedIn,function(req, res) {
  res.render('search', {footer: true});
});

router.get('/user/:username', isLoggedIn, async function(req, res) {
  var val =  req.params.username;
  const users = await UserModel.find({username: new RegExp('^' + val, 'i')});
  res.json(users);
});

router.get('/edit',isLoggedIn, async function(req, res) {
  const user = await UserModel.findOne({username: req.session.passport.user})
  res.render('edit', {footer: true, user},
  );
});

router.post('/update',isLoggedIn, async function(req, res) {
  const user = await UserModel.findOneAndUpdate
  ({username: req.session.passport.user},
    {username: req.body.username, name: req.body.name , bio : req.body.bio},
    {new:true}
  );
  
  req.logIn(user, function(err){
    res.redirect("/profile");
    if(err) throw err;
  })
})
 
router.get('/upload', isLoggedIn,function(req, res) {
  res.render('upload', {footer: true});
});


router.post ('/upload', isLoggedIn, upload.single("image"),async function(req, res) {
 const user = await UserModel.findOne({username : req.session.passport.user})
 const post = PostModel.create({
  caption : req.body.caption,
  image : req.file.filename,
  user : user._id
 })
 user.posts.push(post._id);
 await user.save();
 res.redirect('/feed');
});

module.exports = router;
