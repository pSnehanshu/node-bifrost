module.exports = Bifrost;

function Bifrost() {
    /* The structure of the ACList
    {
        role: {
            resource: [action]
        }
    }
    */
    this.aclist = {};

    /* The structure of user to role map.
    It records which users are assigned to which roles.
    {
        user: {
            role: [scope]
        }
    }
    */
    // TODO: This has to persist
    this.user2role = {};

    // Functions
    this.allowed = allowed;
    this.allow = allow;
    this.assign = assign;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Checks if allowed. Note: Every action is forbidden unless allowed.
 * @param {String} user 
 * @param {String} resource 
 * @param {String} action 
 * @param {String} scope 
 * @returns {Boolean}
 */
function allowed(user, resource, action, scope = '__global') {
    /*
    #1 Fetch all the roles and scopes of the given user.
    #2 Filter out all the roles having the given scope
    #3 Check if any of the above roles are allowed to access the resource
    */
    try {
        // #1
        var roles = this.user2role[user];

        // #2
        var scopedRoles = [];
        for (role in roles) {
            if (roles.hasOwnProperty(role)) {
                if (roles[role].includes(scope) || scope == '__global') {
                    scopedRoles.push(role);
                }
            }
        }

        // #3
        for (var i = 0, len = scopedRoles.length; i < len; i++) {
            if (this.aclist[scopedRoles[i]][resource].includes(action)) {
                return true;
            }
        }

    } catch (error) {
        return false;
    }

    return false;
}

/**
 * Creates allow permissions. Note: Every action is forbidden unless allowed.
 * @param {String} role 
 * @param {String} resource 
 * @param {String} action 
 * @returns {Boolean}
 */
function allow(role, resource, action) {
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
function assign(user, role, scope = '__global') {
    // If user not exists, create it
    if (!this.user2role[user]) this.user2role[user] = {};
    var _user = this.user2role[user];

    // Create role if not exist
    if (!_user[role]) _user[role] = [];
    var _role = _user[role];

    // Insert scope if not exists. Scope shouldn't be __global
    if (scope != '__global' && !_role.includes(scope)) _role.push(scope);

    return true;
}
