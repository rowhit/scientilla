(function () {
    "use strict";
    angular.module("services").factory("ModalService", ModalService);

    ModalService.$inject = ['$uibModal'];


    function ModalService($uibModal) {
        var service = {
            modal: null
        };


        service.dismiss = function (reason) {
            if (service.modal)
                service.modal.dismiss(reason);
            service.modal = null;
        };

        service.close = function (reason) {
            if (service.modal)
                service.modal.close(reason);
            service.modal = null;
        };


        service.openScientillaDocumentForm = function (document, researchEntity) {
            var scopeVars = {
                document: document,
                researchEntity: researchEntity
            };

            service.modal = openModal(
                '<scientilla-document-form\
                    document="vm.document"\
                    research-entity="vm.researchEntity"\
                    on-failure="vm.onFailure"\
                    on-submit="vm.onSubmit" \
                    close-fn="vm.onClose" \
                ></scientilla-document-form>',
                scopeVars,
                {size: 'lg'}
            );

            return service.modal.result;
        };

        service.openScientillaDocumentDetails = function (document) {
            var scopeVars = {
                document: document
            };

            service.modal = openModal(
                '<scientilla-document-details\
                    document="vm.document"\
                ></scientilla-document-details>',
                scopeVars,
                {size: 'lg'}
            );

            return service.modal.result;
        };


        service.openScientillaUserForm = function (user) {

            var scopeVars = {
                user: user
            };

            service.modal = openModal(
                '<scientilla-user-form\
                    user="vm.user"\
                    on-failure="vm.onFailure"\
                    on-submit="vm.onSubmit"\
                ></scientilla-user-form>',
                scopeVars
            );

            return service.modal.result;
        };


        service.openScientillaTagForm = function (document) {

            var scopeVars = {
                document: document
            };

            service.modal = openModal(
                '<scientilla-tag-form\
                    document="vm.document"\
                    on-submit="vm.onSubmit" \
                    close-fn="vm.onClose" \
                 ></scientilla-tag-form>',
                scopeVars
            );

            return service.modal.result;
        };


        service.openScientillaGroupForm = function (group) {

            var scopeVars = {
                group: group
            };

            service.modal = openModal(
                '<scientilla-group-form\
                    group="vm.group"\
                    on-failure="vm.onFailure"\
                    on-submit="vm.onSubmit"\
                 ></scientilla-group-form>',
                scopeVars
            );

            return service.modal.result;
        };

        service.openDocumentAffiliationForm = function (document) {
            var scopeVars = {
                document: document
            };

            service.modal = openModal(
                '<scientilla-document-affiliations\
                    document="vm.document"\
                    on-failure="vm.onFailure"\
                    on-submit="vm.onSubmit"\
                ></scientilla-document-affiliations>',
                scopeVars,
                {size: 'lg'}
            );

            return service.modal.result;
        };

        service.openDocumentVerificationForm = function (document, verificationFn) {

            var scopeVars = {
                document: document,
                verificationFn: verificationFn
            };

            service.modal = openModal(
                '<scientilla-document-verification-form\
                    document="vm.document"\
                    verification-fn="vm.verificationFn"\
                    on-failure="vm.onFailure"\
                    on-submit="vm.onSubmit"\
                ></scientilla-document-verification-form>',
                scopeVars,
                {size: 'lg'}
            );

            return service.modal.result;
        };

        service.multipleChoiceConfirm = function (title, message, buttonLabels) {
            buttonLabels = buttonLabels || [];
            var ret = new Promise(function (resolve, reject) {
                var scope = {
                    title: title,
                    message: message,
                    cancel: function () {
                        this.onClose();
                        reject();
                    },
                    ok: function (i) {
                        this.onSubmit();
                        resolve(i);
                    },
                    buttonLabels: buttonLabels
                };
                service.modal = openModal('\
                        <div class="scientilla-modal">\
                            <div>\
                                <h3 class="scientilla-multiple-choice-title" ng-if="vm.title">{{vm.title}}</h3>\
                                <div class="scientilla-multiple-choice-message" ng-if="vm.message">{{vm.message}}</div>\
                            </div>\
                            <hr>' +
                    scope.buttonLabels.map(function (b, i) {
                        return '<scientilla-button click="vm.ok(' + i + ')">' + b + '</scientilla-button>';
                    }).join('') +
                    '<scientilla-button click="vm.cancel()" type="cancel">Cancel</scientilla-button>\
                <div>',
                    scope);

                service.modal.result.catch(function () {
                    reject();
                });
            });

            return ret;
        };

        service.openWizard = function (closable) {
            let args;
            if (closable)
                args = {
                    size: 'lg',
                    windowClass: 'modal-dark'
                };
            else
                args = {
                    backdrop: 'static',
                    keyboard: false,
                    size: 'lg',
                    windowClass: 'modal-dark'
                };

            service.modal = openComponentModal('wizard-container', {}, args);
            return service.modal.result;
        };


        service.confirm = function (title, message) {
            return service.multipleChoiceConfirm(title, message, ['Ok']);
        };

        return service;

        // private
        function openComponentModal(component, data, args) {
            const callbacks = getDefaultCallbacks();

            const resolve = {
                data,
                callbacks
            };

            return $uibModal.open(
                _.defaults({
                    animation: true,
                    component: component,
                    resolve: resolve
                }, args)
            );
        }

        function openModal(template, scope, args) {
            var callbacks = getDefaultCallbacks();

            _.defaults(scope, callbacks);

            var controller = function () {
                _.assign(this, scope);
            };

            return $uibModal.open(
                _.defaults({
                    animation: true,
                    template: template,
                    controller: controller,
                    controllerAs: 'vm'
                }, args)
            );
        }

        function getDefaultCallbacks() {
            var callbacks = {
                onFailure: _.noop,
                onSubmit: service.close,
                onClose: service.close
            };

            return callbacks;
        }
    }

}());
