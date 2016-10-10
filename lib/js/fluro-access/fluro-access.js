angular.module('fluro.access')
    .service('FluroAccess', function($rootScope, $q, FluroContent) {

        var controller = {}

        /////////////////////////////////////////////////////

        controller.isFluroAdmin = function() {

            if (!$rootScope.user) {
                return false;
            }
            return ($rootScope.user.accountType == 'administrator');
        }

        ///////////////////////////////////////////////////////////////////////////////

        controller.getPermissionSets = function() {

            if (!$rootScope.user) {
                return [];
            }

            return $rootScope.user.permissionSets;
        }

        ///////////////////////////////////////////////////////////////////////////////

        controller.has = function(permission) {

            if (!$rootScope.user) {
                return false;
            }

            var permissionSets = $rootScope.user.permissionSets;

            var permissions = _.chain(permissionSets)
                .map(function(permissionSet) {
                    return permissionSet.permissions;
                })
                .flatten()
                .uniq()
                .value();

            // console.log('Has Permissions', permissions);
            return _.includes(permissions, permission);
        }

        /////////////////////////////////////////////////////

        controller.canAccess = function(type, parentType) {

            if (!$rootScope.user) {
                return false;
            }

            if (controller.isFluroAdmin()) {
                return true;
            }

            //Check if the user has access to a few realms
            var canCreateRealms = controller.retrieveActionableRealms('create ' + type);

            //Can view this type
            var canViewOwnRealms = controller.retrieveActionableRealms('view own ' + type);
            var canViewAnyRealms = controller.retrieveActionableRealms('view any ' + type);

            //Can edit this type
            var canEditOwnRealms = controller.retrieveActionableRealms('edit own ' + type);
            var canEditAnyRealms = controller.retrieveActionableRealms('edit any ' + type);




            // var canEditAnyRealms = controller.retrieveActionableRealms('edit any ' + type);

            //Get all the realms
            var totalRealms = [];
            totalRealms = totalRealms.concat(canViewOwnRealms);
            totalRealms = totalRealms.concat(canViewAnyRealms);
            totalRealms = totalRealms.concat(canEditOwnRealms);
            totalRealms = totalRealms.concat(canEditAnyRealms);

            if (totalRealms.length) {
                return true;
            } else {



                //Check lastly if we can have any permissions on the parent type
                //with the include defined permission
                if (parentType && parentType.length) {

                    // console.log('Check parent type')
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                    //Nope so stop here
                    if (!includeDefined.length) {
                        // console.log('Include defined', parentType, ' is not set')
                        return false;
                    } else {
                        // console.log('Include defined', parentType, ' is set');
                    }

                    //Check on the parent type
                    var canCreateRealmsOnParentType = controller.retrieveActionableRealms('create ' + parentType);

                    //Can view this type
                    var canViewOwnRealmsOnParentType = controller.retrieveActionableRealms('view own ' + parentType);
                    var canViewAnyRealmsOnParentType = controller.retrieveActionableRealms('view any ' + parentType);

                    //Can edit this type
                    var canEditOwnRealmsOnParentType = controller.retrieveActionableRealms('edit own ' + parentType);
                    var canEditAnyRealmsOnParentType = controller.retrieveActionableRealms('edit any ' + parentType);

                    var totalRealms = [];
                    totalRealms = totalRealms.concat(canViewOwnRealmsOnParentType);
                    totalRealms = totalRealms.concat(canViewAnyRealmsOnParentType);
                    totalRealms = totalRealms.concat(canEditOwnRealmsOnParentType);
                    totalRealms = totalRealms.concat(canEditAnyRealmsOnParentType);

                    // console.log('Checking parentType checks for', parentType, totalRealms)
                    if (totalRealms.length) {
                        return true;
                    }
                }


                return false;
            }
        }

        /////////////////////////////////////////////////////

        controller.retrieveActionableRealms = function(action) {

            if (!$rootScope.user) {
                return [];
            }

            /////////////////////////////////

            //Get the permission sets
            var permissionSets = $rootScope.user.permissionSets;

            //Find all realms we can view any of this type
            return _.chain(permissionSets)
                .map(function(realmSet, key) {
                    var searchString = action;
                    if (_.includes(realmSet.permissions, searchString)) {
                        return key.toString();
                    }

                })
                .compact()
                .value();
        }

        /////////////////////////////////////////////////////

        controller.retrieveSelectableRealms = function(action, noCache) {
            if (!$rootScope.user) {
                return [];
            }

            var realms;

            if (controller.isFluroAdmin()) {


                realms = FluroContent.resource('realm', false, noCache).query({
                    list: true,
                    sort: 'title'
                });
            } else {

                //Get the permission sets
                var permissionSets = $rootScope.user.permissionSets;

                //Find all realms we can view any of this type
                var createableRealms = _.chain(permissionSets)
                    .filter(function(realmSet, key) {
                        var searchString = action;
                        return _.includes(realmSet.permissions, searchString);
                    })
                    .compact()
                    .map(function(realm) {
                        return {
                            _id: realm._id,
                            title: realm.title,
                        }
                    })
                    .sortBy('title')
                    .value();


                /////////////////////////////////

                realms = createableRealms;
            }

            /////////////////////////////////

            return realms;

        }

        /////////////////////////////////////////////////////

        //Function to check if this user has this permission
        controller.can = function(action, type, parentType) {

            if (!$rootScope.user) {
                return false;
            }

            if (controller.isFluroAdmin()) {
                return true;
            }

            //Get the permission string
            var perm = action + ' ' + type;

            /////////////////////////////////////////////////////

            //Track the realms we are allowed to do this in
            var realms = [];

            /////////////////////////////////////////////////////

            switch (action) {
                case 'view any':
                    var canViewAnyRealms = controller.retrieveActionableRealms('view any ' + type);
                    var canEditAnyRealms = controller.retrieveActionableRealms('edit any ' + type);

                    //Combine the realms
                    realms = realms.concat(canViewAnyRealms);
                    realms = realms.concat(canEditAnyRealms);
                    break;
                case 'view own':
                    var canViewOwnRealms = controller.retrieveActionableRealms('view own ' + type);
                    var canEditOwnRealms = controller.retrieveActionableRealms('edit own ' + type);

                    //Combine the realms
                    realms = realms.concat(canViewOwnRealms);
                    realms = realms.concat(canEditOwnRealms);
                    break;
                default:
                    realms = controller.retrieveActionableRealms(perm);
                    break;
            }

            if (realms.length) {
                return true;
            } else {

                //Check if the user has any permissions on the parent type that will allow them to access this content
                if (parentType && parentType.length) {
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                    //Nope so stop here
                    if (!includeDefined.length) {
                        return false;
                    }

                    switch (action) {
                        case 'view any':
                            var canViewAnyParentRealms = controller.retrieveActionableRealms('view any ' + parentType);
                            var canEditAnyParentRealms = controller.retrieveActionableRealms('edit any ' + parentType);

                            //Combine the realms
                            realms = realms.concat(canViewAnyRealms);
                            realms = realms.concat(canEditAnyRealms);
                            break;
                        case 'view own':
                            var canViewOwnParentRealms = controller.retrieveActionableRealms('view own ' + parentType);
                            var canEditOwnParentRealms = controller.retrieveActionableRealms('edit own ' + parentType);

                            //Combine the realms
                            realms = realms.concat(canViewOwnParentRealms);
                            realms = realms.concat(canEditOwnParentRealms);
                            break;
                        default:
                            realms = controller.retrieveActionableRealms(action + ' ' + parentType);
                            break;
                    }

                    if (realms.length) {
                        console.log('Return true because of parent permissions')
                        return true;
                    }
                }

                return false;
            }
        }

        /////////////////////////////////////////////////////

        controller.isAuthor = function(item) {

            if (!$rootScope.user) {
                return false;
            }

            //Check if the user is the author
            var author = false;

            //Only allow if author of the content
            if (_.isObject(item.author)) {
                author = (item.author._id == $rootScope.user._id);
            } else {
                author = (item.author == $rootScope.user._id);
            }

            ////////////////////////////////////////

            //Check if the user is an owner of the content
            if (!author && item.owners && item.owners.length) {

                //The user is the owner if they are included in the owners
                author = _.some(item.owners, function(owner) {

                    var ownerId = owner;

                    if (ownerId && ownerId._id) {
                        ownerId = ownerId._id;
                    }

                    return (ownerId == $rootScope.user._id);
                });
            }

            ////////////////////////////////////////

            if ($rootScope.user._id == item._id) {
                //We are looking at our own profile
                author = true;
            }

            return author;
        }

        /////////////////////////////////////////////////////

        controller.canEditItem = function(item, user) {

            if (!$rootScope.user) {
                return false;
            }

            /////////////////////////////////////

            var userAccountID = $rootScope.user.account;

            if (userAccountID) {
                userAccountID = userAccountID._id;
            }

            var contentAccountID = item.account;

            if (contentAccountID && contentAccountID._id) {
                contentAccountID = contentAccountID._id;
            }

            if (contentAccountID && (contentAccountID != userAccountID)) {
                return false;
            }


            // console.log('ACCOUNT CHECK', contentAccountID, userAccountID);

            /////////////////////////////////////

            if (controller.isFluroAdmin()) {
                return true;
            }

            if (!item) {
                return false;
            }

            var definitionName = item._type;
            var parentType;

            if (item.definition) {
                definitionName = item.definition;
                parentType = item._type;
            }

            ////////////////////////////////////////

            //Check if the user is the author of this content
            var author = controller.isAuthor(item);

            if (user) {
                definitionName = 'user';

                if (author) {
                    return true;
                }
            }

            ////////////////////////////////////////

            //Realms works slightly differently
            switch (definitionName) {
                case 'realm':
                    if (author) {
                        return controller.has('edit own realm');
                    } else {
                        return controller.has('edit any realm');
                    }
                    break;
                default:
                    break;
            }

            ////////////////////////////////////////

            //Get the realms we are allowed to work in
            var editAnyRealms = controller.retrieveActionableRealms('edit any ' + definitionName);
            var editOwnRealms = controller.retrieveActionableRealms('edit own ' + definitionName);

            var contentRealmIds = _.map(item.realms, function(realm) {

                if (realm._id) {
                    return realm._id;
                }

                return realm;
            });

            ////////////////////////////////////////

            // if (!editAnyRealms.length) {
                console.log('Check thingamooooos', parentType)
                //No realms associated with this content
                //Check if the user has any permissions on the parent type that will allow them to access this content
                if (parentType && parentType.length) {
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);


                    if (includeDefined.length) {
                        console.log('CHECKING PARENT REALMS MAN', parentType);

                        var canEditAnyParentRealms = controller.retrieveActionableRealms('edit any ' + parentType);
                        editAnyRealms = editAnyRealms.concat(canEditAnyParentRealms);

                        var canEditOwnParentRealms = controller.retrieveActionableRealms('edit own ' + parentType);
                        editOwnRealms = editOwnRealms.concat(canEditOwnParentRealms);
                    }
                }
            // }

            ////////////////////////////////////////

            //Find any matches between this content
            var matchedAnyRealms = _.intersection(editAnyRealms, contentRealmIds);

            /*
            if(definitionName == 'plan') {
                console.log('TESTING ACCESS', definitionName, 'EditAny Realms', editAnyRealms.length, 'MatchAnyRealms', matchedAnyRealms.length, contentRealmIds);
            }
            */

            //We are allowed to edit anything in these realms
            //So return true
            if (matchedAnyRealms.length) {
                return true;
            }



            ////////////////////////////////////////

            //If we are the author
            if (author) {
                //Find own matches between this content
                var matchedOwnRealms = _.intersection(editOwnRealms, contentRealmIds);

                //We are allowed to edit anything in these realms
                //So return true
                if (matchedOwnRealms.length) {
                    return true;
                }
            }
        }


        /////////////////////////////////////////////////////

        controller.canViewItem = function(item, user) {

            if (!$rootScope.user) {
                return false
            }

            if (controller.isFluroAdmin()) {
                return true;
            }

            var definitionName = item._type;
            var parentType

            if (item.definition) {
                definitionName = item.definition;
                parentType = item._type;
            }

            ////////////////////////////////////////
            //Check if the user is the author of this content
            var author = controller.isAuthor(item);

            if (user) {
                definitionName = 'user';

                if (author) {
                    return true;
                }
            }

            ////////////////////////////////////////

            //Get the realms we are allowed to work in
            var viewAnyRealms = controller.retrieveActionableRealms('view any ' + definitionName);
            var viewOwnRealms = controller.retrieveActionableRealms('view own ' + definitionName);
            var editAnyRealms = controller.retrieveActionableRealms('edit any ' + definitionName);
            var editOwnRealms = controller.retrieveActionableRealms('edit own ' + definitionName);

            //Combine any
            var combinedAnyRealms = [];
            combinedAnyRealms = combinedAnyRealms.concat(viewAnyRealms);
            combinedAnyRealms = combinedAnyRealms.concat(editAnyRealms);

            //Combine own
            var combinedOwnRealms = [];
            combinedOwnRealms = combinedOwnRealms.concat(viewOwnRealms);
            combinedOwnRealms = combinedOwnRealms.concat(editOwnRealms);

            ////////////////////////////////////////

            var contentRealmIds = _.map(item.realms, function(realm) {
                if (realm._id) {
                    return realm._id;
                }
                return realm;
            });

            ////////////////////////////////////////

            // if (!item.realms) {
                //No realms associated with this content
                //Check if the user has any permissions on the parent type that will allow them to access this content
                if (parentType && parentType.length) {
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                    if (includeDefined.length) {
                        console.log('CHECKING PARENT REALMS MAN', parentType);

                        var canEditAnyParentRealms = controller.retrieveActionableRealms('edit any ' + parentType);
                        var canViewAnyParentRealms = controller.retrieveActionableRealms('view any ' + parentType);
                        combinedAnyRealms = combinedAnyRealms.concat(canEditAnyParentRealms, canViewAnyParentRealms);

                        var canEditOwnParentRealms = controller.retrieveActionableRealms('edit own ' + parentType);
                        var canViewOwnParentRealms = controller.retrieveActionableRealms('view own ' + parentType);
                        combinedOwnRealms = combinedOwnRealms.concat(canEditOwnParentRealms, canViewOwnParentRealms);
                    }
                }
            // }

            ////////////////////////////////////////

            //Find any matches between this content
            var matchedAnyRealms = _.intersection(combinedAnyRealms, contentRealmIds);

            //We are allowed to edit anything in these realms
            //So return true
            if (matchedAnyRealms.length) {
                return true;
            }

            ////////////////////////////////////////

            //If we are the author
            if (author) {
                //Find own matches between this content
                var matchedOwnRealms = _.intersection(combinedOwnRealms, contentRealmIds);

                //We are allowed to edit anything in these realms
                //So return true
                if (matchedOwnRealms.length) {
                    return true;
                }
            }

            //Add extra parent checking here
        }

        /////////////////////////////////////////////////////

        controller.canDeleteItem = function(item, user) {

            if (!$rootScope.user) {
                return false
            }


            /////////////////////////////////////

            var userAccountID = $rootScope.user.account;

            if (userAccountID) {
                userAccountID = userAccountID._id;
            }

            var contentAccountID = item.account;

            if (contentAccountID && contentAccountID._id) {
                contentAccountID = contentAccountID._id;
            }

            // console.log('ACCOUNT CHECK', contentAccountID, userAccountID);

            if (contentAccountID && (contentAccountID != userAccountID)) {
                return false;
            }

            /////////////////////////////////////

            if (controller.isFluroAdmin()) {
                return true;
            }

            var definitionName = item._type;
            var parentType;

            if (item.definition) {
                definitionName = item.definition;
                parentType = item._type;
            }

            ////////////////////////////////////////
            //Check if the user is the author of this content
            var author = controller.isAuthor(item);

            if (user) {
                definitionName = 'user';

                if (author) {
                    return true;
                }
            }

            ////////////////////////////////////////

            //Realms works slightly differently
            switch (definitionName) {
                case 'realm':
                    if (author) {
                        return controller.has('delete own realm');
                    } else {
                        return controller.has('delete any realm');
                    }
                    break;
                default:
                    break;
            }


            ////////////////////////////////////////

            //Get the realms we are allowed to work in
            var deleteAnyRealms = controller.retrieveActionableRealms('delete any ' + definitionName);
            var deleteOwnRealms = controller.retrieveActionableRealms('delete own ' + definitionName);

            var contentRealmIds = _.map(item.realms, function(realm) {
                if (realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                }
                return realm;
            });

            ////////////////////////////////////////

            // if (!item.realms) {
                //No realms associated with this content
                //Check if the user has any permissions on the parent type that will allow them to access this content
                if (parentType && parentType.length) {
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                    if (includeDefined.length) {
                        console.log('CHECKING PARENT REALMS MAN', parentType);

                        var canDeleteAnyParentRealms = controller.retrieveActionableRealms('delete any ' + parentType);
                        deleteAnyRealms = deleteAnyRealms.concat(canDeleteAnyParentRealms);

                        var canDeleteOwnParentRealms = controller.retrieveActionableRealms('delete own ' + parentType);
                        deleteOwnRealms = deleteOwnRealms.concat(canDeleteOwnParentRealms);
                    }
                }
            // }

            ////////////////////////////////////////

            //Find any matches between this content
            var matchedAnyRealms = _.intersection(deleteAnyRealms, contentRealmIds);

            //We are allowed to delete anything in these realms
            //So return true
            if (matchedAnyRealms.length) {
                return true;
            }

            ////////////////////////////////////////

            //If we are the author
            if (author) {
                //Find own matches between this content
                var matchedOwnRealms = _.intersection(deleteOwnRealms, contentRealmIds);

                //We are allowed to delete anything in these realms
                //So return true
                if (matchedOwnRealms.length) {
                    return true;
                }
            }
        }


        /////////////////////////////////////////////////////

        controller.resolveIf = function(bool) {
            var deferred = $q.defer();

            if (bool) {
                deferred.resolve()
            } else {
                // MessageService.post('Access denied', 'error');
                deferred.reject();
            }

            return deferred.promise;
        }

        /////////////////////////////////////////////////////

        return controller;


    });