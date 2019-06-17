const MongoConnector = require('./mongodb-connector');
const arrayUnique = require('./utils/arrayUnique');

const ALLSYMBOL = '*';

class Bifrost {
    constructor(connect, opts = {}) {
        var { db, table, cb, err_cb } = opts;

        /* The structure of the ACList
        {
            role: {
                resource: [action] or '*'
            }
        }
        */
        this.aclist = {};

        // Initialize mongodb connector
        this.connector = new MongoConnector(connect, db, table);
        this.connect().then(cb).catch(err_cb);
    }

    /**
     * Connects to the db
     * @returns Promise
     */
    async connect() {
        return await this.connector.connect();
    }

    /**
     * Add a parent scope.
     * @param {String} child
     * @param {String} parent  
     */
    async addParentScope(child, parent) {
        // We shouldn't be able to add itself a parent scope of itself.
        if (child == parent) {
            throw new Error(`Trying to make '${parent}' as a parent scope of itself.`);
        }

        // Check if the parent is already child.
        // We won't want to make a child as a parent.
        // This will cause infinite recursions.
        var childrenOfChild = await this.getChildScopes(child);
        if (childrenOfChild.includes(parent)) {
            throw new Error(`Trying to make '${parent}' a parent scope of '${child}' which is already a child scope.`);
        }

        return await this.connector.addParentScope(child, parent);
    }

    /**
     * Remove a parent scope.
     * @param {String} child
     * @param {String} parent
     */
    removeParentScope(child, parent) {

    }

    /**
     * Add a child scope.
     * @param {String} scope
     * @param {String} childScope  
     */
    addChildScope(scope, childScope) {
        return this.addParentScope(childScope, scope);
    }

    /**
     * Remove a child scope.
     * @param {String} scope
     * @param {String} childScope  
     */
    removeChildScope(scope, childScope) {
        return this.removeParentScope(childScope, scope);
    }

    /**
     * Returns array of child scopes for a given scope
     * @param {String} scope 
     * @returns {Promise} Array of child scopes
     */
    async getChildScopes(scope, recursive = true) {
        var children = [];
        var directChildren = await this.connector.getDirectChildrenScopes(scope);

        for (var i = 0; i < directChildren.length; i++) {
            children.push(directChildren[i]);

            // Fetch parentScopes of cScope as well
            if (recursive) {
                let cScopes = await this.getChildScopes(directChildren[i]);
                children = arrayUnique(children.concat(cScopes));
            }
        }
        return children;
    }

    /**
     * Find parent scopes of a given scope
     * @param {String} scope The child scope
     * @param {Boolean} recursive Do you want to find parent scopes recursively? Default: true
     * @returns Array of scopes
     */
    async getParentScopes(scope, recursive = true) {
        var parents = [];
        var directParents = await this.connector.getDirectParentScopes(scope);

        for (var i = 0; i < directParents.length; i++) {
            parents.push(directParents[i]);

            if (recursive) {
                let pScopes = await this.getParentScopes(directParents[i]);
                parents = arrayUnique(parents.concat(pScopes));
            }
        }
        return parents;
    }

    /**
     * Creates allow permissions. Note: Every action is forbidden unless allowed.
     * @param {String} role The role to be given access.
     * @param {String|Array} resource The resource(s) to be accessed. * means all
     * @param {String|Array} action  The action(s) to allow. * means all
     */
    allow(role, resources = [], actions = []) {
        if (!Array.isArray(resources)) resources = [resources];
        if (!Array.isArray(actions)) actions = [actions];

        resources.forEach(resource => {
            // Create role if not exists
            if (!this.aclist[role]) this.aclist[role] = {};
            var _role = this.aclist[role];

            // Create resource if not exists
            if (!_role[resource]) _role[resource] = [];
            var _resource = _role[resource];

            actions.forEach(action => {
                // if action is '*', then remove the array and insert '*' as string
                if (action == ALLSYMBOL) {
                    //_resource = ALLSYMBOL; <-- This line doesn't work
                    this.aclist[role][resource] = ALLSYMBOL;
                }
                // Insert action if not exists
                else if (Array.isArray(_resource) && !_resource.includes(action)) {
                    _resource.push(action);
                }
            });
        });
    }

    /**
     * Assigns a role to a user
     * @param {String} user 
     * @param {String} role 
     * @returns {Promise}
     */
    assign(user, role, scope = '__global') {
        var roleObject = {};
        roleObject[role] = [scope];

        return this.connector.addUserRoles(user, roleObject);
    }

    /**
     * Unassigns a user from a previously assigned role
     * @param {String} user 
     * @param {String} role 
     * @returns {Promise}
     */
    unassign(user, role, scope = '__global') {
        return this.connector.removeUserRoles(user, role, scope);
    }

    /**
     * Checks if allowed. Note: Every action is forbidden unless allowed.
     * @param {String} user 
     * @param {String} resource 
     * @param {String} action 
     * @param {String} scope 
     * @returns {Boolean}
     */
    async allowed(user, resource, action, scope = '__global') {
        /*
        #1 Fetch all the roles and scopes of the given user.
        #1.1 Fetch all the parent scopes of the given scope.
        #2 Filter out all the roles having the given scope or any parent scope.
        #3 Check if any of the above roles are allowed to access the resource.
           If a resource's action is *, then always allow.
           If * resource exists, then consider it's actions as well.
        */

        // #1
        var roles = await this.connector.getRolesWithScopes(user);

        // #1.1
        var parentScopes = this.getParentScopes(scope);

        // #2
        var scopedRoles = [];
        for (var role in roles) {
            if (roles.hasOwnProperty(role)) {
                if (
                    roles[role].includes(scope) ||
                    roles[role].some(r => parentScopes.includes(r))
                ) {
                    scopedRoles.push(role);
                }
            }
        }

        // #3
        for (var i = 0, len = scopedRoles.length; i < len; i++) {
            // Check if resource exists
            if (this.aclist[scopedRoles[i]]) {
                return checkRoleHasAction(this.aclist[scopedRoles[i]], resource, action);
            }
        }

        return false;
    }
}

module.exports = Bifrost;

//////////////////////////////
function checkRoleHasAction(roleObj, resource, action) {
    // check if * resource exists
    if (roleObj[ALLSYMBOL]) {
        if (checkResourceHasAction(roleObj[ALLSYMBOL], action)) {
            return true;
        }
    }

    // Otherwise check if resource exists
    if (roleObj[resource]) {
        return checkResourceHasAction(roleObj[resource], action)
    }

    return false;
}

function checkResourceHasAction(resourceObj, action) {
    if (Array.isArray(resourceObj)) {
        if (resourceObj.includes(action)) {
            return true;
        }
    }
    else if (resourceObj == ALLSYMBOL) return true;

    return false;
}
