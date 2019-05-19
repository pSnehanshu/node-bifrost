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
        user: [role]
    }
    */
   // TODO: This has to persist
    this.user2role = {};

    /* The structure of scopeRegister. This register records 
    which users has access to which scopes.
    {
        scope: [user]
    }
    Note: Every user has access to __global scope.
    */
   // TODO: This has to persist
    this.scopeRegister = {};


    // Functions
    this.isAllowed = isAllowed;
    this.allow = allow;
    this.assignRole = assignRole;
    this.addUserToScope = addUserToScope;
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
function isAllowed(user, resource, action, scope = '__global') {
    /*
    #1 First fetch all the roles this user is assigned to.
    #2 Then check if the role has permission to access the resource.
    #3 Check if this user has access to the given scope.
    */
    try {
        // #1 First fetch all the roles this user is assigned to.
        var roles = this.user2role[user];

        //#2 Then check if the role has permission to access the resource.
        var roleAllowed = false;
        for (var i = 0, len = roles.length; i < len; i++) {
            if (this.aclist[roles[i]][resource].includes(action)) {
                roleAllowed = true;
                break;
            }
        }
        if (!roleAllowed) return false;

        // #3 Check if this user has access to the given scope.
        // All users have access to __global scope
        if (scope == '__global') return true;
        return this.scopeRegister[scope].includes(user);

    } catch (error) {
        return false;
    }
}

/**
 * Creates allow permissions. Note: Every action is forbidden unless allowed.
 * @param {String} role 
 * @param {String} resource 
 * @param {String} action 
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
}

/**
 * Assigns a role to a user
 * @param {String} user 
 * @param {String} role 
 * @returns {Boolean}
 */
function assignRole(user, role) {
    // If user not exists, create it
    if (!this.user2role[user]) this.user2role[user] = [];
    var _user = this.user2role[user];

    // Insert role if not exist
    if (!_user.includes(role)) _user.push(role);

    return true;
}

/**
 * Give user access to a scope.
 * @param {String} user 
 * @param {String} scope 
 * @returns {Boolean}
 */
function addUserToScope(user, scope = '__global') {
    // Don't do anything for __global scope as all users have access to it by default
    if (scope == '__global') return true;

    // Create scope if not exists
    if (!this.scopeRegister[scope]) this.scopeRegister[scope] = [];
    var _scope = this.scopeRegister[scope];

    // Insert user if not exists
    if (!_scope.includes(user)) _scope.push(user);

    return true;
}
