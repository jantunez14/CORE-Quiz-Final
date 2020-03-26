'use strict';

module.exports = {
    up(queryInterface, Sequelize) {

        return queryInterface.bulkInsert('quizzes', [
            {
                question: '¿Quién es la Madre de Jesús?',
                answer1: 'La Virgen María',
                answer2: 'Marta',
                answer3: 'María Magdalena',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                question: '¿Como se llama el Libro que contiene la Historia de la salvación?',
                answer1: 'Biblia',
                answer2: 'Libro de Dios',
                answer3: 'La Historia de la Salvación',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                question: 'Cuantos dioses hay?',
                answer1: 'Uno',
                answer2: 'Tres',
                answer3: 'Muchos',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                question: '¿Jesús es Dios o es Hombre?',
                answer1: 'Dios y Hombre',
                answer2: 'Dios',
                answer3: 'Hombre',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },

    down(queryInterface, Sequelize) {

        return queryInterface.bulkDelete('quizzes', null, {});
    }
};
