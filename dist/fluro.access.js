
//Create Fluro UI With dependencies
angular.module('fluro.access', [
	'fluro.content'
]);
angular.module('fluro.access')
    .service('FluroAccess', ['$rootScope', '$q', 'FluroContent', function($rootScope, $q, FluroContent) {

        var controller = {}

        /////////////////////////////////////////////////////

        controller.isFluroAdmin = function() {
            if (!$rootScope.user) {
                return false;
            }
            return ($rootScope.user.accountType == 'administrator' && !$rootScope.user.pretender);
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

            if (controller.isFluroAdmin()) {
                return true;
            }

            var permissionSets = $rootScope.user.permissionSets;

            var permissions = _.chain(permissionSets)
                .reduce(function(results, set, key) {

                    results.push(set.permissions);

                    return results;
                }, [])
                // .map(retrieveSubRealms)
                .flattenDeep()
                .compact()
                .uniq()
                .value();

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


            // //console.log('GET ALL REALMS', canCreateRealms);

            // var canEditAnyRealms = controller.retrieveActionableRealms('edit any ' + type);

            //Get all the realms
            var totalRealms = [];
            totalRealms = totalRealms.concat(canCreateRealms);
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

                    // //////console.log('Check parent type')
                    var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                    //Nope so stop here
                    if (!includeDefined.length) {
                        // //////console.log('Include defined', parentType, ' is not set')
                        return false;
                    } else {
                        // //////console.log('Include defined', parentType, ' is set');
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

                    // //////console.log('Checking parentType checks for', parentType, totalRealms)
                    if (totalRealms.length) {
                        return true;
                    }
                }


                return false;
            }
        }

        /////////////////////////////////////////////////////

        //Flatten all children for a specified permission set
        //so you a flat array of realm ids that are included
        function retrieveKeys(set, additional) {
            if (set.children && set.children.length) {

                _.each(set.children, function(child) {
                    retrieveKeys(child, additional);
                })

            }

            additional.push(String(set._id));
        }


        /////////////////////////////////////////////////////

        //Flatten all children for a specified permission set
        //so you a flat array of realm ids that are included
        function retrieveSubRealms(set) {

            var results = [set];

            //console.log('CHECK SET CHILDREN', set);

            if (set.children && set.children.length) {
                _.each(set.children, function(child) {
                    var additional = retrieveSubRealms(child);
                    results = results.concat(additional);
                })

            }
            return results;
        }

        /////////////////////////////////////////////////////

        // FluroAccess.retrieveActionableRealms('create persona');

        controller.retrieveActionableRealms = function(action) {

            if (!$rootScope.user) {
                return [];
            }

            /////////////////////////////////

            //Get the permission sets
            var permissionSets = $rootScope.user.permissionSets;

            //console.log('SAMPLE FIND KEYS',  $rootScope.user.permissionSets);

            //Find all realms we can view any of this type
            return _.chain(permissionSets)
                .map(function(realmSet, key) {
                    var searchString = action;
                    var hasPermission = _.includes(realmSet.permissions, searchString);
                    if (hasPermission) {

                        var keys = [];
                        retrieveKeys(realmSet, keys);



                        return keys;
                        // return key.toString();
                    }

                })
                .flatten()
                .compact()
                .value();
        }

        /////////////////////////////////////////////////////

        controller.retrieveSelectableRealms = function(action, type, parentType, noCache) {
            if (!$rootScope.user) {
                return [];
            }

            var deferred = $q.defer();


            // ////console.log('Searching for', action);

            if (controller.isFluroAdmin()) {

                //This returns the full list of all realms in a proper tree structure
                FluroContent.endpoint('realm/tree', false, noCache)
                .query({})
                .$promise
                .then(deferred.resolve, deferred.reject);

            } else {

                //Get the permission sets of the user
                //and then map the structure
                var permissionSets = $rootScope.user.permissionSets;

                //Permission String to search for
                var searchString = action + ' ' + type;

                ////////////////////////////////////////////////////

                //Find all realms on the top level that we have the requested permission
                //in and then get all child realms and flatten the list, this will give us
                //all the realms that we can do the action in.
                var selectableRealms = _.chain(permissionSets)
                    .filter(function(realmSet, key) {

                        //Find all permission sets where the user has the requested permission
                        var includesType = _.includes(realmSet.permissions, searchString);
                        var includedFromParent;

                        //If the parent type was provided also then check any sub definitions
                        //of the basic type
                        if (parentType && parentType.length) {

                            //Check if we can action the parent type
                            var includesParent = _.includes(realmSet.permissions, action + ' ' + parentType);

                            //Check if we can action variants of the parent type
                            var includesVariations = _.includes(realmSet.permissions, 'include defined ' + parentType);

                            //Include this realm if both of the above return true
                            includedFromParent = (includesParent && includesVariations);
                        }

                        //We should include it if we have the basic type permission
                        //or if its a derivative of the basic type
                        var shouldInclude = (includesType || includedFromParent)
                        return shouldInclude;
                    })
                    //Recursively get all the child realms
                    .map(retrieveSubRealms)
                    .flattenDeep()
                    .value();

                /////////////////////////////////////

                //Create a copy of the realm so we aren't mucking around with original user object
                var cleanArray = angular.copy(selectableRealms);

                /////////////////////////////////////
                /////////////////////////////////////
                /////////////////////////////////////
                /////////////////////////////////////
                //Now map all realms to a tree structure
                var realmTree = _.chain(cleanArray)

                //Now sort them all by length of trail, top level down to the furthest branch
                    .sortBy(function(realm) {

                        if (realm.trail && realm.trail.length) {
                            return realm.trail.length;
                        } else {
                            return 0;
                        }
                    })

                    // .map(function(realm) {

                    //     var trailLength = 0;
                    //     if(realm.trail) {
                    //         trailLength = realm.trail.length;
                    //     }

                    //     // var path = _.map(realm.trail).join('/');

                    //     console.log('TRACE -', trailLength, realm.title);
                    //     return realm;
                    // })

                    //Now organise them one by one going down all the branches
                    .reduce(function(results, realm) {

                        //If the realm has a trail
                        if (realm.trail && realm.trail.length) {

                            //Find the ID of the direct parent of this realm
                            var parentID = String(realm.trail[realm.trail.length - 1]);

                            //Now find the actual parent object in our clean flat list
                            var parent = _.find(cleanArray, function(pRealm) {
                                return String(pRealm._id) == parentID;
                            });

                            //If we can't see the parent then it should be added
                            //to the top level for this user as it's the highest
                            //clearance they have
                            if (!parent) {
                                //Push to the set and return
                                results.push(realm);
                                return results;
                            }

                            //If the parent doesnt have a children array
                            //create it now
                            if (!parent.children) {
                                parent.children = []
                            }

                            //Check if this realm has not been included yet
                            var alreadyIncluded = (parent.children.indexOf(realm) != -1)

                            //If it hasnt then add it in
                            if(!alreadyIncluded) {
                                 //Add to the set and order by title
                                parent.children.push(realm);
                                parent.children = _.sortBy(parent.children, function(child) {
                                    return child.title;
                                });
                            }
                        } else {
                            //No trail so just push the realm to the top level
                            results.push(realm);
                        }

                        //Return the set
                        return results;

                    }, [])
                    .value();

                //Resolve with our tree
                deferred.resolve(realmTree);
            }

            /////////////////////////////////

            //Return the promise
            return deferred.promise;

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
                        //////console.log('Return true because of parent permissions')
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

            ////////////////////////////////////////

            //Only allow if user is author of the content
            if (_.isObject(item.author)) {
                author = (item.author._id == $rootScope.user._id);
            } else {
                author = (item.author == $rootScope.user._id);
            }

            ////////////////////////////////////////

            //check if the user's persona is the managed author
            if (_.isObject(item.managedAuthor)) {
                author = (item.managedAuthor._id == $rootScope.user.persona);
            } else {
                author = (item.managedAuthor == $rootScope.user.persona);
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

            //Check if the user's persona is a managed owner of the content
            if (!author && item.managedOwners && item.managedOwners.length) {

                //The user is the owner if they are included in the managedOwners
                author = _.some(item.managedOwners, function(owner) {

                    var ownerId = owner;

                    if (ownerId && ownerId._id) {
                        ownerId = ownerId._id;
                    }

                    return (ownerId == $rootScope.user.persona);
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

        controller.canAccessChat = function(item, basicType, definedType) {


            if(!basicType) {
                basicType = item._type;
            }

            ////////////////////////////////////////////////////
            
            if(!definedType) {
                if (item.definition && item.definition.length) {
                    definedType = item.definition;
                } else {
                    definedType = basicType;
                }
            }

            ////////////////////////////////////////////////////

            var chatRealms = controller.retrieveSelectableRealms('chat', definedType, basicType);
            var chatViewRealms = controller.retrieveSelectableRealms('view chat', definedType, basicType);

            var contentRealmIds = _.map(item.realms, function(realmID) {
                if (realmID._id) {
                    realmID = realmID._id;
                }
                return realmID;
            })

            //Check if the user can edit the item
            var canEditContent = controller.canEditItem(item);

            //Check if the user can chat in these realms
            var canChat = _.intersection(chatRealms, contentRealmIds).length;

            //Check if the user can view the chat
            var canViewChat = _.intersection(chatViewRealms, contentRealmIds).length;

            return (canChat || canViewChat || canEditContent);


        }

        /////////////////////////////////////////////////////

        controller.canEditItem = function(item, user) {

            if (!item) {
                // ////console.log('No item');
                return false;
            }

            if (!$rootScope.user) {
                // ////console.log('No user')
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

            //Get the realms we are allowed to work in
            var editAnyRealms = controller.retrieveActionableRealms('edit any ' + definitionName);
            var editOwnRealms = controller.retrieveActionableRealms('edit own ' + definitionName);

            ////////////////////////////////////////

            var contentRealmIds;

            //If we are checking a realm then we need to check the trail
            //instead of the 'item.realms' array
            if(definitionName == 'realm' || parentType == 'realm') {

                //Check the realm.trail
                contentRealmIds =  _.map(item.trail, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });

                //Can adjust their own realm?
                contentRealmIds.push(item._id);


                
            } else {

                //Check the item.realms
                contentRealmIds = _.map(item.realms, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });
            }

            ////////////////////////////////////////

            // if (!editAnyRealms.length) {
            //////console.log('Check thingamooooos', parentType)
            //No realms associated with this content
            //Check if the user has any permissions on the parent type that will allow them to access this content
            if (parentType && parentType.length) {
                var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);


                if (includeDefined.length) {
                    //////console.log('CHECKING PARENT REALMS MAN', parentType);

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
                //////console.log('TESTING ACCESS', definitionName, 'EditAny Realms', editAnyRealms.length, 'MatchAnyRealms', matchedAnyRealms.length, contentRealmIds);
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


            ////console.log('No Realms', definitionName, contentRealmIds, editOwnRealms, matchedOwnRealms, matchedAnyRealms);
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

            var contentRealmIds;

            //If we are checking a realm then we need to check the trail
            //instead of the 'item.realms' array
            if(definitionName == 'realm' || parentType == 'realm') {

                //Check the realm.trail
                contentRealmIds =  _.map(item.trail, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });

                //Can adjust their own realm?
                contentRealmIds.push(item._id);

                
            } else {

                //Check the item.realms
                contentRealmIds = _.map(item.realms, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });
            }

            ////////////////////////////////////////

            // if (!item.realms) {
            //No realms associated with this content
            //Check if the user has any permissions on the parent type that will allow them to access this content
            if (parentType && parentType.length) {
                var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                if (includeDefined.length) {
                    //////console.log('CHECKING PARENT REALMS MAN', parentType);

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

            // //////console.log('ACCOUNT CHECK', contentAccountID, userAccountID);

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

            //Get the realms we are allowed to work in
            var deleteAnyRealms = controller.retrieveActionableRealms('delete any ' + definitionName);
            var deleteOwnRealms = controller.retrieveActionableRealms('delete own ' + definitionName);

            ////////////////////////////////////////

            var contentRealmIds;

            //If we are checking a realm then we need to check the trail
            //instead of the 'item.realms' array
            if(definitionName == 'realm' || parentType == 'realm') {

                //Check the realm.trail
                contentRealmIds =  _.map(item.trail, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });

                //Can adjust their own realm?
                contentRealmIds.push(item._id);

                
            } else {

                //Check the item.realms
                contentRealmIds = _.map(item.realms, function(realm) {
                    if (realm._id) {
                        return realm._id;
                    }
                    return realm;
                });
            }

            ////////////////////////////////////////

            // if (!item.realms) {
            //No realms associated with this content
            //Check if the user has any permissions on the parent type that will allow them to access this content
            if (parentType && parentType.length) {
                var includeDefined = controller.retrieveActionableRealms('include defined ' + parentType);

                if (includeDefined.length) {
                    //////console.log('CHECKING PARENT REALMS MAN', parentType);

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


    }]);