'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return new Promise((resolve, reject) => {
      queryInterface.addColumn(
          'users',
          'correctAnswers',
          {type: Sequelize.INTEGER}
      );
      queryInterface.addColumn(
          'users',
          'incorrectAnswers',
          {type: Sequelize.INTEGER}
      );
      queryInterface.addColumn(
          'users',
          'maxStreak',
          {type: Sequelize.INTEGER}
      );
      resolve();
    });
  },

  down: function (queryInterface, Sequelize) {
    return new Promise((resolve, reject) => {
      queryInterface.removeColumn('quizzes', 'correctAnswers');
      queryInterface.removeColumn('quizzes', 'incorrectAnswers');
      queryInterface.removeColumn('quizzes', 'maxStreak');
      resolve();
    });
  }
};
