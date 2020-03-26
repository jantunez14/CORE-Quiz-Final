const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");

const paginate = require('../helpers/paginate').paginate;

// Autoload el quiz asociado a :quizId
exports.load = (req, res, next, quizId) => {
    models.quiz.findByPk(quizId, {
        include: [
            {
                model: models.tip,
                include: [{model: models.user, as: 'author'}]
            },
            {
                model: models.user,
                as: 'author'
            }
        ]
    })
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.session.user.isAdmin;
    const isAuthor = req.quiz.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = (req, res, next) => {

    let countOptions = {
        where: {}
    };

    let title = "Questions";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { [Op.like]: search_like }};
    }

    // If there exists "req.user", then only the quizzes of that user are shown
    if (req.user) {
        countOptions.where.authorId = req.user.id;
        title = "Questions of " + req.user.username;
    }

    models.quiz.count(countOptions)
    .then(count => {

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        const findOptions = {
            ...countOptions,
            offset: items_per_page * (pageno - 1),
            limit: items_per_page,
            include: [{model: models.user, as: 'author'}]
        };

        return models.quiz.findAll(findOptions);
    })
    .then(quizzes => {
        res.render('quizzes/index.ejs', {
            quizzes,
            search,
            title
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "",
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer1, answer2, answer3} = req.body;

    const authorId = req.session.user && req.session.user.id || 0;

    const quiz = models.quiz.build({
        question,
        answer1,
        answer2,
        answer3,
        authorId
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer1", "answer2", "answer3", "authorId"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


/*=========================================Mejoras============================================*/
/**
 * Conseguido que al refrescar la página no vaya marcando los quizzes como jugados sin
 * contestar de nuevo. Tampoco suma los puntos si se le manda mas de una vez la misma respuesta
 * @param req
 * @param res
 * @param next
 */

// GET /quizzes/randomplay
exports.randomplay = (req, res, next) => {
    const inicio = req.query.inicio;
    req.session.flag = false;
    if(inicio){
        req.session.scoreSession=0;
        req.session.randomPlay = [];
    }else{
        req.session.scoreSession = req.session.scoreSession || 0;
        req.session.randomPlay = req.session.randomPlay || [];
    }
    let score = req.session.scoreSession;
    const resolved = req.session.randomPlay;


    let playnext = () => {
        const whereOpt = {'id': {[Sequelize.Op.notIn]: resolved}};
        return models.quiz.count({where: whereOpt})
            .then(function (count) {
                return models.quiz.findAll({
                    where: whereOpt,
                    offset: Math.floor(Math.random()*count),
                    limit: 1
                });
            })
            .then(quizzes => quizzes[0])
            .then(quiz => {
                if(!quiz) {
                    console.log('Nada que preguntar');
                    req.session.randomPlay = [];
                    req.session.scoreSession = 0;
                    res.render("quizzes/random_nomore", {score});
                    return;
                }
                const {query} = req;
                const answer1 = quiz.answer1 || '';
                const answer2 = quiz.answer2 || '';
                const answer3 = quiz.answer3 || '';

                var answers = [answer1,answer2,answer3];
                answers = answers.sort(() => {return Math.random()-0.5});

                req.session.randomPlay = resolved;
                req.session.flag = true;
                res.render('quizzes/random_play',{quiz,answers,score,req});
            });
    };
    playnext();
};



// GET /quizzes/randomcheck
exports.randomcheck = (req, res, next) => {
    req.session.result = req.session.result || false;
    let result = req.session.result;
    let score = req.session.scoreSession;
    const {quiz, query} = req;
    let id = quiz.id;
    let correctAnswer = quiz.answer1;
    let answer = query.answer;

    if(req.session.flag) {
        req.session.flag = false;
        if (answer === quiz.answer1) {
            result = true;
            req.session.scoreSession++;
            req.session.randomPlay.push(id);
        } else {
            result = false;
            req.session.randomPlay = [];
        }
        req.session.result = result;
        score = req.session.scoreSession;


        if (req.session.user) {
            const userId = req.session.user.id;
            models.user.findByPk(userId)
                .then(user => {
                    if (result) {
                        user.correctAnswers++;
                        if (score > user.maxStreak) {
                            user.maxStreak = score;
                        }
                    } else {
                        user.incorrectAnswers++;
                    }
                    user.save({fields: ["correctAnswers", "incorrectAnswers", "maxStreak"]})
                        .then(() => {
                            res.render('quizzes/random_result', {result, score, correctAnswer, answer});
                        })
                        .catch(Sequelize.ValidationError, error => {
                            req.flash('error', 'Error:');
                            error.errors.forEach(({message}) => req.flash('error', message));
                        })
                        .catch(error => next(error));
                });
        } else {
            res.render('quizzes/random_result', {result, score, answer, correctAnswer});
            return;
        }
    }else{
        // Tramposillo //
        res.render('quizzes/tramposillo');
    }
};





