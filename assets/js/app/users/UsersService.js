/* global Scientilla */

(function () {
    angular.module("users").factory("UsersService", UsersService);

    UsersService.$inject = [
        "Restangular",
        "$q",
        "Prototyper",
        'userConstants'
    ];

    function UsersService(Restangular, $q, Prototyper, userConstants) {
        var service = Restangular.service("users");

        const userFields = [
            'id',
            'auth',
            'username',
            'name',
            'surname',
            'slug',
            'alreadyAccess',
            'role',
            'orcidId',
            'scopusId',
            'jobTitle'
        ];

        service.getNewUser = function () {
            var user = {
                name: "",
                surname: "",
                slug: "",
                username: "",
                role: userConstants.role.USER
            };
            Prototyper.toUserModel(user);
            return user;
        };

        service.put = function (user) {
            //TODO: check this Restangular bug
            return Restangular.copy(user).put();
        };

        service.validateData = function (user) {
            //validate user data
        };

        service.save = function (user) {
            if (user.id)
                return Restangular.one('users', user.id).customPUT(user);
            else
                return this.post(user);
        };

        service.doSave = function (user) {
            const userData = _.pick(user, userFields);
            return this.save(userData).then(function (u) {
                return user;
            });
        };

        service.getCollaborations = function (user) {
            if (!user || !user.id) {
                user.collaborations = [];
                return $q(function (resolve) {
                    resolve(user);
                });
            }
            return user.all('collaborations').getList({populate: ['group']})
                .then(function (collaborations) {
                    user.collaborations = collaborations;
                    Prototyper.toCollaborationsCollection(user.collaborations);
                    return user;
                });
        };

        service.getUsers = function (query) {
            var populate = {populate: ['memberships', 'documents']};

            var q = _.merge({}, query, populate);

            return this.getList(q);
        };

        service.getProfile = function (userId) {
            return this
                .one(userId)
                .get();
        };

        service.getCompleteProfile = function (userId) {
            return this
                .one(userId)
                .get({populate: ['administratedGroups']})
                .then(function (user) {
                    Prototyper.toUserModel(user);
                    user.administratedGroups = Restangular.restangularizeCollection(null, user.administratedGroups, 'groups');
                    return user;
                });
        };

        return service;
    }

}());