const util = require('util');
const {normalize, schema} = require('normalizr');
const express = require('express');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const generador = require('./generador/productos');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const advancedOptions = {useNewUrlParser: true, useUnifiedTopology: true};
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const routes = require('./routes'); 
const {obtenerUsuario, obtenerUsuarioId, passwordValida} = require('./utils/util');
const bCrypt = require('bCrypt');

const app = express();
const PORT = 8080;
const router = express.Router();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const usuarios = [];

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/api', router);
const cookieParser = require('cookie-parser');
app.use(cookieParser("clave-secreta"));
app.use(session({
  store: MongoStore.create({
      mongoUrl: 'mongodb+srv://nikong:nikong22!@cluster0.z6il9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
      mongoOptions: advancedOptions
  }),
  secret: 'secreto',
  resave: false,
  saveUninitialized: false,
   cookie: { maxAge: 1000000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', (req, res, next) => {
  if(req.cookies.username){
    const username = req.cookies.username
    res.cookie('username', username,  { signed: false, maxAge: 5000 } );
  }
  express.static('public')(req, res, next);
});

const server = http.listen(PORT,
  () => console.log('escuchando en puerto 8080'));
server.on('error', error=>console.log('Error en servidor', error));

const productos = [

];

const mensajes = [

];

const chat = {
  id: 123,
  mensajes: mensajes
};

function print(objeto) {
  console.log(util.inspect(objeto,false,12,true))
}

const URI = 'mongodb://localhost:27017/comercio';

const MensajeSchema = mongoose.Schema({
  autor: {
      id: String,
      nombre: String,
      apellido: String,
      edad: Number,
      alias: String,
      avatar: String
  },
  texto: {type: String, require: true, minLength: 1, maxLength: 25},
  fecha: {type: String, require: true, minLength: 1},
});
const MensajeDB = mongoose.model('mensajes', MensajeSchema)

mongoose.connect(URI, 
    { 
      serverSelectionTimeoutMS: 1000
    }, 
    (error) => {
        if (error) {
            throw  'Error al conectarse a la base de datos';
        } else {
          ProductoDB.find({})
          .then((productosDB) => {
            for (let producto of productosDB) {
              productos.push(producto)
            }
            // console.log(productos)
          })
          MensajeDB.find({})
          .then((mensajesDB) => {
            for (let mensaje of mensajesDB) {
                mensajes.push(mensaje)
            }
          })
        }
  });

  const ProductoSchema = mongoose.Schema({
    id: {type: Number, require: true},
    title: {type: String, require: true, minLength: 1, maxLength: 50},
    price: {type: String, require: true, minLength: 1, maxLength: 25},
    thumbnail: {type: String, require: true, minLength: 1},
  });
  const ProductoDB = mongoose.model('productos', ProductoSchema)

  const UserSchema = mongoose.Schema({
    id: {type: Number, require: true},
    username: {type: String, require: true, minLength: 1, maxLength: 20},
    password: {type: String, require: true, minLength: 1},
  });
  const User = mongoose.model('usuarios', UserSchema)

router.get('/', (req,res)=>{
  const objRes = 
  {msg: "Sitio principal de productos"};
  res.json(objRes);
});

router.get("/productos/listar", (req, res) => {
    if (productos.length = 0) {
        return res.status(404).json({ error: "no hay productos cargados" });
      }
    ProductoDB.find({})
    .then((productosDB) => {
      for (let producto of productosDB) {
        productos.push(producto)
      }
      console.log(productos)
      res.json(productos);
    })
});
  
router.get("/productos/listar/:id", (req, res) => {
    const { id } = req.params;
    const producto = productos.find((producto) => producto.id == id);
    if (!producto) {
        return res.status(404).json({ error: "producto no encontrado" });
      }
    res.json(producto);
});
  
router.put("/productos/actualizar/:id", (req, res) => {
  const { id } = req.params;
  let { title, price, thumbnail } = req.body;
  let producto = productos.find((producto) => producto.id == id);
  if (!producto) {
    return res.status(404).json({ msg: "Usuario no encontrado" });
  }
  (producto.title = title), (producto.price = price), (producto.thumbnail = thumbnail);
ProductoDB.updateOne({ "_id": id}, {'title': title, 'price': price, 'thumbnail':thumbnail})
.then(productos=>{
    console.log('Producto acutalizado')
    res.status(200).json(producto);
})
});

router.delete("/productos/borrar/:id", (req, res) => {
  const { id } = req.params;
  const producto = productos.find((producto) => producto.id == id);

  if (!producto) {
    return res.status(404).json({ msg: "Usuario no encontrado" });
  }

  const index = productos.findIndex((producto) => producto.id == id);
  productos.splice(index, 1);
      ProductoDB.deleteOne({id: id})
      .then(()=>{
            console.log('producto borrado')
        })
    res.status(200).end();
});

app.engine(
    "hbs",
    handlebars({
        extname: ".hbs",
        defaultLayout: "index.hbs",
        layoutsDir: __dirname + "/views/layouts",
        partialsDir: __dirname + "/views/partials"
    })
);

app.set('views', './views'); // especifica el directorio de vistas
app.set('view engine', 'hbs'); // registra el motor de plantillas

app.get('/productos/vista', function(req, res) {
  console.log(productos)
  let tieneDatos;
  if(productos.length > 0){
    tieneDatos = true
  }else{
    tieneDatos = false
  }
  res.render('main', { productos: productos, listExists: tieneDatos });
});

io.on('connection', (socket) => {
    console.log('alguien se está conectado...');
    
    io.sockets.emit('listar', productos);
    
    socket.on('notificacion', (titulo, precio, imagen) => {
      const producto = {
        title: titulo,
        price: precio,
        thumbnail: imagen,
      };

      console.log(producto)

      ProductoDB.create(producto,(error, productoDB)=>{
        if (error) {
            throw "Error al grabar productos " + error;
        } else {
          productos.push(productoDB);
          io.sockets.emit('listar', productos)
        }
      });
    })
    
    console.log('normalizr:')
    console.log(mensajes)

    const mensajeSchema = new schema.Entity('mensajes');

    const chatSchema = new schema.Entity('chat',{
        mensajes: [mensajeSchema]
    });
    
    const normalizedChat = normalize(chat, chatSchema);
    
    // print(normalizedChat);
    console.log('Longitud antes de normalizar:', JSON.stringify(chat).length);
    console.log('Longitud después de normalizar:', JSON.stringify(normalizedChat).length);
    io.sockets.emit('mensajes', mensajes, JSON.stringify(chat).length, JSON.stringify(normalizedChat).length);
        
    socket.on('nuevo', (mensaje)=>{
      MensajeDB.insertMany(mensaje,(error)=>{
        if (error) {
            throw "Error al grabar mensajes " + error;
        } else {
          mensajes.push(mensaje);

          console.log('Longitud antes de normalizar:', JSON.stringify(chat).length);
          console.log('Longitud después de normalizar:', JSON.stringify(normalizedChat).length);
          io.sockets.emit('mensajes', mensajes, JSON.stringify(chat).length, JSON.stringify(normalizedChat).length);
          console.log(`Mensajes grabados...`);
        }
      });
  })
});

//FAKER
app.get('/productos/vista-test', (req,res)=>{
  let productos = [];
  let cant = req.query.cant || 10;
  if (cant == 0) {
    return res.status(404).json({ error: "no hay productos cargados" });
  }
  for (let i=0; i<cant; i++) {
      let producto = generador.get();
      producto.id = i + 1;
      productos.push(producto);
  }
 
  res.send(productos);
});

app.post('/doInicio', (req,res)=>{
  const username = req.body.usuario
  console.log(req.body);
  console.log(req.params);
  console.log(req.query);
  res.cookie('username', username,  { signed: false, maxAge: 5000 } );
  res.redirect('/');
});

//login
app.get('/inicio', (req,res)=>{
  res.render('inicio');
});
app.get('/salir', (req,res)=>{
  const username = req.cookies.username
  res.clearCookie('username');
  res.render('salir', { username: username });
});

//session
app.get('/con-session', (req,res)=>{
  if (req.session.contador) {
      req.session.contador++;
      res.send(`Ud. ha visitado el sitio ${req.session.contador} veces`);
  } else {
      req.session.contador = 1;
      res.send('Bienvenido!');
  }
});

app.get('/logout-session', (req,res)=>{
  req.session.destroy(err=>{
      if (err){
          res.json({status: 'Logout error', body: err});
      } else {
          res.send('Logout ok!');
      }
  });
});

//passport

passport.use('login', new LocalStrategy({
  passReqToCallback: true
},
  function(req, username, password, done){
    User.findOne({ 'username' : username },
      function (err, user){
        if (err)
          return done(err);
        if (!user){
          console.log('user not found ' +username);
          return done(null, false,
            console.log('message', 'user not found'));
          }
        if(!isValidPassword(user, password)){
          console.log('Invalid password');
          return done (null, false,
            console.log('mensage', 'Invalid Password'));
          }
        return done (null, user);
      }
     );
    })
  );

  const isValidPassword = function(user, password){
    return bCrypt.compareSync(password, user.password);
  }
  
passport.use('signup', new LocalStrategy({
    passReqToCallback: true
  },
  function (req, username, password, done){
    findOrCreateUser = function(){
      User.findOne({'username' : username}, function(err, user) {
        if (err){
          console.log('Error en SignUp: ' +err);
          return done(err);
        }
        if (user) {
          console.log('User already exists');
          return done (null, false,
            console.log('message', 'User Already Exists'));
        } else {
          var newUser = new User();
          newUser.username = username;
          newUser.password = createHash(password);
          newUser.email = req.body.email;
          newUser.firstName = req.body.firstName;
          newUser.lastName = req.body.lastName;
          newUser.save(function(err){
            if (err){
              console.log('Error in Saving user: '+err);
              throw err;
            }
            console.log('User Registration succesful');
            return done(null, newUser);
          });
        }
      });
    }
    process.nextTick(findOrCreateUser);
  })
)
var createHash = function(password){
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}
  

passport.serializeUser(function(user, done) {
  done(null, user._id);
});
  
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user){
    done(err, user);
  });
});
  

app.get('/test', (req,res)=>{
    res.send('Server levantado...');
});

app.get('/login', routes.getLogin);
app.post('/login', passport.authenticate('login', {failureRedirect: '/faillogin'}), routes.postLogin);
app.get('/faillogin', routes.getFailLogin);

app.get('/signup', routes.getSignUp);
app.post('/signup', passport.authenticate('signup', {failureRedirect: '/failsignup'}), routes.postSignUp);
app.get('/failsignup', routes.getFailSignUp);

app.get('/logout', routes.getLogout);

app.get('/ruta-protegida', checkAuthentication, routes.getRutaProtegida);

app.get('/datos', routes.getDatos);

app.get('*', routes.failRoute);

function checkAuthentication(req, res, next){
    if (req.isAuthenticated()){
        next();
    } else {
        res.redirect('/');
    }
}
