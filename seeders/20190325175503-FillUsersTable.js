'use strict';

var crypt = require('../helpers/crypt');


module.exports = {
    up(queryInterface, Sequelize) {

        return queryInterface.bulkInsert('users', [
            {
                username: 'admin',
                password: crypt.encryptPassword('20pepeCatequesis20', 'aaaa'),
                salt: 'aaaa',
                isAdmin: true,
                createdAt: new Date(), updatedAt: new Date(),
                accepted: true,
                correctAnswers: 0,
                incorrectAnswers: 0,
                maxStreak: 0
            },
            {
                username: 'pepe',
                password: crypt.encryptPassword('5678', 'bbbb'),
                salt: 'bbbb',
                createdAt: new Date(), updatedAt: new Date(),
                accepted: true,
                correctAnswers: 0,
                incorrectAnswers: 0,
                maxStreak: 0
            }
        ]);
    },

    down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('users', null, {});
    }
};
