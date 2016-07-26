var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = 3000;

var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());


app.get('/', function (req, res) {
    res.send('TODO Api Root ');
});

//GET /todos
//GET /todos?completed=true&q=house
app.get('/todos', middleware.requireAuthentication, function (req, res) {
    var query = req.query;
    var where = {};

    if (query.hasOwnProperty('completed') && query.completed === 'true') {
        where.completed = true;
    } else if (query.hasOwnProperty('completed') && query.completed === 'false') {
        where.completed = false;
    }

    if (query.hasOwnProperty('q') && query.q.length > 0) {
        where.description = {
            $like: '%' + query.q + '%'
        };
    }

    db.todo.findAll({ where: where }).then(function (todos) {
        res.json(todos);
    }, function (e) {
        res.status(500).send();
    });
});

//GET /todos/id
app.get('/todos/:id', middleware.requireAuthentication, function (req, res) {
    var todoId = parseInt(req.params.id);

    db.todo.findById(todoId).then(function (todo) {
        if (!!todo) {
            console.log(!!todo);
            res.json(todo.toJSON());
        } else {
            res.status(404).send()
        }
    }, function (err) {
        res.status(500).send();
    });
});

//POST /todos
app.post('/todos', middleware.requireAuthentication, function (req, res) {
    var body = _.pick(req.body, ' ', 'completed');

    db.todo.create(body).then(function (todo) {
        res.json(todo.toJSON());
    }, function (e) {
        res.status(400).json(e);
    });
});

//DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, function (req, res) {
    var todoId = parseInt(req.params.id);

    db.todo.destroy({
        where: {
            id: todoId
        }
    }).then(function (rowsDeleted) {
        if (rowsDeleted === 0) {
            res.status(404).json({ "error": "no todo found with that id" });
        } else {
            res.status(204).send();
        }
    }, function (e) {
        res.status(500).send();
    });
})

//PUT /todos/:id
app.put('/todos/:id', middleware.requireAuthentication, function (req, res) {
    var todoId = parseInt(req.params.id);
    var body = _.pick(req.body, 'description', 'completed');
    var attributes = {};

    if (body.hasOwnProperty('completed')) {
        attributes.completed = body.completed;
    }

    if (body.hasOwnProperty('description')) {
        attributes.description = body.description;
    }

    db.todo.findById(todoId).then(function (todo) {
        if (!!todo) {
            todo.update(attributes).then(function (todo) {
                res.json(todo.toJSON());
            }, function (e) {
                res.status(400).json(e);
            });
        } else {
            res.status(404).send();
        }
    }, function () {
        res.status(500).send();
    });
})

app.post('/users', function (req, res) {
    var body = _.pick(req.body, 'email', 'password');

    db.user.create(body).then(function (user) {
        res.json(user.toPublicJSON())
    }, function (e) {
        res.status(400).json(e);
    });

})

app.post('/users/login', function (req, res) {
    var body = _.pick(req.body, 'email', 'password');

    if (typeof (body.email) !== 'string' && typeof (body.password) !== 'string') {
        res.status(400).send();
    }

    db.user.authenticate(body).then(function (user) {
        var token = user.generateToken('authentication');
        if (!token) {
            res.status(401).send();
        } else {
            res.header('Auth', token).json(user.toPublicJSON());
        }
    }, function (e) {
        res.status(401).send()
    });

    // db.user.findOne({
    //     where: {
    //         email: body.email
    //     }
    // }).then(function (user) {
    //     //bcrypt.compareSync(body.password, user.password_hash)
    //     if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
    //         return res.status(401).send();
    //     }
    //     res.json(user.toPublicJSON());
    // }, function (e) {
    //     res.status(500).send();
    // });

})

//{force: true}
db.sequelize.sync({ force: true }).then(function () {
    app.listen(PORT, function () {
        console.log('Express runnning on port: ' + PORT)
    });
});