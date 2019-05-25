const Sequelize = require("sequelize");
const {models} = require("../models");

const paginate = require('../helpers/paginate').paginate;

// Autoload the user with id equals to :userId
exports.load = (req, res, next, userId) => {

    models.user.findByPk(userId)
    .then(user => {
        if (user) {
            req.user = user;
            next();
        } else {
            req.flash('error', 'There is no user with id=' + userId + '.');
            throw new Error('No exist userId=' + userId);
        }
    })
    .catch(error => next(error));
};


// GET /users
exports.index = (req, res, next) => {

    models.user.count()
    .then(count => {

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        const findOptions = {
            offset: items_per_page * (pageno - 1),
            limit: items_per_page,
            order: ['username']
        };

        return models.user.findAll(findOptions);
    })
    .then(users => {
        res.render('users/index', {users});
    })
    .catch(error => next(error));
};

// GET /users/:userId
exports.show = (req, res, next) => {

    const {user} = req;

    res.render('users/show', {user});
};


// GET /users/new
exports.new = (req, res, next) => {

    const user = {
        username: "",
        password: ""
    };

    res.render('users/new', {user});
};


// POST /users
exports.create = (req, res, next) => {

    const {username, password} = req.body;
    const accepted = false;

    const user = models.user.build({
        username,
        password,
        accepted,
        correctAnswers:0,
        incorrectAnswers:0,
        maxStreak:0
    });

    // Save into the data base
    user.save({fields: ["username", "password", "salt"]})
    .then(user => { // Render the users page
        req.flash('success', 'User created successfully.');
        if (req.session.user) {
            res.redirect('/users/' + user.id);
        } else {
            res.redirect('/session'); // Redirection to the login page
        }
    })
    .catch(Sequelize.UniqueConstraintError, error => {
        req.flash('error', `User "${username}" already exists.`);
        res.render('users/new', {user});
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('users/new', {user});
    })
    .catch(error => next(error));
};

// PUT /users/accept
exports.accept = (req, res, next) => {

    const id = req.query.id;
    models.user.findByPk(id)
        .then(user => {
            user.accepted = true;

            user.save({fields: ["accepted"]})
                .then(user => {
                    req.flash('success', 'User accepted successfully.');
                    res.redirect('/users/' + user.id);
                })
                .catch(Sequelize.ValidationError, error => {
                    req.flash('error', 'There are errors in the form:');
                    error.errors.forEach(({message}) => req.flash('error', message));
                    res.render('users/edit', {user});
                })
                .catch(error => next(error));
        })
        .catch(error => next(error));

};

// GET /users/:userId/edit
exports.edit = (req, res, next) => {

    const {user} = req;

    res.render('users/edit', {user});
};


// PUT /users/:userId
exports.update = (req, res, next) => {

    const {user, body} = req;

    // user.username  = body.user.username; // edition not allowed
    user.password = body.password;

    // Password can not be empty
    if (!body.password) {
        req.flash('error', "Password field must be filled in.");
        return res.render('users/edit', {user});
    }

    user.save({fields: ["password", "salt"]})
    .then(user => {
        req.flash('success', 'User updated successfully.');
        res.redirect('/users/' + user.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('users/edit', {user});
    })
    .catch(error => next(error));
};


// DELETE /users/:userId
exports.destroy = (req, res, next) => {

    req.user.destroy()
    .then(() => {

        // Deleting logged user.
        if (req.session.user && req.session.user.id === req.user.id) {
            // Close the user session
            delete req.session.user;
        }

        req.flash('success', 'User deleted successfully.');
        res.redirect('/goback');
    })
    .catch(error => next(error));
};


/*==============================Mejoras=================================*/


exports.showUsers = (req, res, next) => {

    req.session.correct = req.session.correct || false;
    req.session.incorrect = req.session.incorrect || false;
    req.session.streak = req.session.streak || false;

    const sort = req.query.sortBy;
    let order;
    var sentido;
    if(sort==='correct'){
        req.session.correct = !req.session.correct;
        if(req.session.correct){
            sentido = 'DESC';
        }else{
            sentido = 'ASC';
        }
        order=[['correctAnswers', sentido]];
    }

    if(sort==='incorrect'){
        req.session.incorrect = !req.session.incorrect;
        if(req.session.incorrect){
            sentido = 'DESC';
        }else{
            sentido = 'ASC';
        }
        order=[['incorrectAnswers', sentido]];
    }

    if(sort==='streak'){
        req.session.streak = !req.session.streak;
        if(req.session.streak){
            sentido = 'DESC';
        }else{
            sentido = 'ASC';
        }
        order=[['maxStreak', sentido]];
    }

    let getNext = () => {
        models.user.findAll()
            .then((users) =>{
                for (let user in users){
                    if(!users[user].correctAnswers){
                        users[user].correctAnswers=0;
                    }
                    if(!users[user].incorrectAnswers){
                        users[user].incorrectAnswers=0;
                    }
                    if(!users[user].maxStreak){
                        users[user].maxStreak=0;
                    }
                    users[user].save({fields: ["correctAnswers", "incorrectAnswers", "maxStreak"]});
                }
            })
            .then(() => {
                models.user.findAll({
                    order: order
                }).then(usuarios => {{
                    res.render('users/topusers', {usuarios});
                }});
            });

    };
    getNext();

};
//res.render('users/topusers', {usuarios});
