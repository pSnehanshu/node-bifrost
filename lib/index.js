const MongoConnector = require('./mongodb-connector');

class Bifrost {
    constructor(connect, opts = {}) {
        var { db, table, cb, err_cb } = opts;

        /* The structure of the ACList
        {
            role: {
                resource: [action]
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
     * Creates allow permissions. Note: Every action is forbidden unless allowed.
     * @param {String} role 
     * @param {String} resource 
     * @param {String} action 
     * @returns {Boolean}
     */
    allow(role, resource, action) {
        // Create role if not exists
        if (!this.aclist[role]) this.aclist[role] = {};
        var _role = this.aclist[role];

        // Create resource if not exists
        if (!_role[resource]) _role[resource] = [];
        var _resource = _role[resource];

        // Insert action if not exists
        if (!_resource.includes(action)) _resource.push(action);

        return true;
    }

    /**
     * Assigns a role to a user
     * @param {String} user 
     * @param {String} role 
     * @returns {Boolean}
     */
    assign(user, role, scope = '__global') {
        // If scope is __global, don't insert it
        var roleObject = {};
        roleObject[role] = scope == '__global' ? [] : [scope];

        return this.connector.addUserRoles(user, roleObject);
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
        #2 Filter out all the roles having the given scope
        #3 Check if any of the above roles are allowed to access the resource
        */

        // #1
        var roles = await this.connector.getRolesWithScopes(user);

        // #2
        var scopedRoles = [];
        for (var role in roles) {
            if (roles.hasOwnProperty(role)) {
                if (roles[role].includes(scope) || scope == '__global') {
                    scopedRoles.push(role);
                }
            }
        }

        // #3
        for (var i = 0, len = scopedRoles.length; i < len; i++) {
            // Check if resource exists
            if (this.aclist[scopedRoles[i]] && this.aclist[scopedRoles[i]][resource]) {
                if (this.aclist[scopedRoles[i]][resource].includes(action)) {
                    return true;
                }
            }
        }

        return false;
    }
}

module.exports = Bifrost;
